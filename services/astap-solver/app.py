"""
ASTAP Plate Solver Flask API with Job Queue

Provides a REST API wrapper around the ASTAP command-line plate solver
with a Redis-backed job queue for handling concurrent requests.

Endpoints:
  POST /solve - Submit an image for plate solving (returns job ID)
  GET /job/<job_id> - Get job status and results
  GET /health - Health check endpoint
  GET /queue - Get queue status
"""

import os
import json
import subprocess
import tempfile
import uuid
import time
import threading
from pathlib import Path
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
import redis

app = Flask(__name__)

# Configuration
ASTAP_CLI = os.environ.get('ASTAP_CLI', '/opt/astap/astap_cli')
STAR_DATABASE = os.environ.get('STAR_DATABASE', '/opt/astap/data')
MAX_FILE_SIZE = int(os.environ.get('MAX_FILE_SIZE', 100 * 1024 * 1024))  # 100MB default
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'fit', 'fits', 'tif', 'tiff'}
REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
MAX_CONCURRENT_JOBS = int(os.environ.get('MAX_CONCURRENT_JOBS', 2))
JOB_EXPIRY_SECONDS = int(os.environ.get('JOB_EXPIRY_SECONDS', 86400))  # 24 hours
TEMP_DIR = os.environ.get('TEMP_DIR', '/tmp/astap-jobs')

app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# Ensure temp directory exists
os.makedirs(TEMP_DIR, exist_ok=True)

# Redis connection
redis_client = None

def get_redis():
    """Get Redis connection, reconnecting if needed."""
    global redis_client
    if redis_client is None:
        redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    return redis_client


def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def parse_wcs_file(wcs_path: str) -> dict:
    """Parse the WCS output file from ASTAP to extract coordinates."""
    result = {}

    if not os.path.exists(wcs_path):
        return result

    with open(wcs_path, 'r') as f:
        for line in f:
            line = line.strip()
            if '=' in line:
                key, value = line.split('=', 1)
                key = key.strip()
                value = value.split('/')[0].strip()  # Remove comments

                # Remove quotes from string values
                if value.startswith("'") and value.endswith("'"):
                    value = value[1:-1].strip()

                # Try to parse as float
                try:
                    result[key] = float(value)
                except ValueError:
                    result[key] = value

    return result


def run_astap_solver(image_path: str, options: dict = None) -> dict:
    """
    Run ASTAP solver on an image.

    Args:
        image_path: Path to the image file
        options: Optional dict with solver options:
            - fov: Field of view in degrees (helps narrow search)
            - ra: Approximate RA hint (degrees)
            - dec: Approximate Dec hint (degrees)
            - downsample: Downsample factor (1-4)

    Returns:
        Dict with solve results
    """
    options = options or {}

    # Build command
    cmd = [
        ASTAP_CLI,
        '-f', image_path,
        '-d', STAR_DATABASE,
        '-r', '180',  # Search radius in degrees (full sky if no hint)
    ]

    # Add FOV hint if provided
    if 'fov' in options:
        cmd.extend(['-fov', str(options['fov'])])

    # Add center hint if provided
    if 'ra' in options and 'dec' in options:
        cmd.extend(['-ra', str(options['ra']), '-spd', str(90 + options['dec'])])
        cmd.extend(['-r', '30'])  # Reduce search radius when hint provided

    # Add downsample if needed for large images
    if 'downsample' in options:
        cmd.extend(['-z', str(options['downsample'])])

    # Run solver
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )

        stdout = result.stdout
        stderr = result.stderr

        # Check for WCS output file
        wcs_path = image_path.rsplit('.', 1)[0] + '.wcs'

        # Parse WCS if solve was successful
        wcs_data = {}
        if os.path.exists(wcs_path):
            wcs_data = parse_wcs_file(wcs_path)

        # Check if solved by looking for CRVAL1/CRVAL2 (center coordinates)
        solved = 'CRVAL1' in wcs_data and 'CRVAL2' in wcs_data

        if solved:
            return {
                'success': True,
                'solved': True,
                'ra': wcs_data.get('CRVAL1'),
                'dec': wcs_data.get('CRVAL2'),
                'orientation': wcs_data.get('CROTA2', wcs_data.get('CROTA1', 0)),
                'pixscale': abs(wcs_data.get('CDELT1', wcs_data.get('CD1_1', 0))) * 3600,
                'fieldw': wcs_data.get('NAXIS1', 0) * abs(wcs_data.get('CDELT1', 0)),
                'fieldh': wcs_data.get('NAXIS2', 0) * abs(wcs_data.get('CDELT2', 0)),
                'wcs': wcs_data,
                'stdout': stdout,
                'stderr': stderr,
            }
        else:
            return {
                'success': False,
                'solved': False,
                'error': 'No solution found',
                'stdout': stdout,
                'stderr': stderr,
            }

    except subprocess.TimeoutExpired:
        return {
            'success': False,
            'solved': False,
            'error': 'Solver timeout (exceeded 5 minutes)',
        }
    except Exception as e:
        return {
            'success': False,
            'solved': False,
            'error': str(e),
        }
    finally:
        # Cleanup temporary files
        for ext in ['.wcs', '.ini', '.log']:
            cleanup_path = image_path.rsplit('.', 1)[0] + ext
            if os.path.exists(cleanup_path):
                try:
                    os.remove(cleanup_path)
                except:
                    pass


def process_job(job_id: str):
    """Process a plate solving job."""
    r = get_redis()
    job_key = f"job:{job_id}"

    try:
        # Get job data
        job_data = r.hgetall(job_key)
        if not job_data:
            return

        # Update status to processing
        r.hset(job_key, mapping={
            'status': 'processing',
            'started_at': datetime.utcnow().isoformat(),
        })

        # Get image path and options
        image_path = job_data.get('image_path')
        options = json.loads(job_data.get('options', '{}'))

        # Run the solver
        result = run_astap_solver(image_path, options)

        # Update job with results
        r.hset(job_key, mapping={
            'status': 'completed',
            'completed_at': datetime.utcnow().isoformat(),
            'result': json.dumps(result),
        })

        # Cleanup image file
        if image_path and os.path.exists(image_path):
            try:
                os.remove(image_path)
            except:
                pass

    except Exception as e:
        # Update job with error
        r.hset(job_key, mapping={
            'status': 'failed',
            'completed_at': datetime.utcnow().isoformat(),
            'result': json.dumps({
                'success': False,
                'solved': False,
                'error': str(e),
            }),
        })
    finally:
        # Decrement active jobs counter
        r.decr('active_jobs')
        # Remove from processing set
        r.srem('processing_jobs', job_id)


def worker_loop():
    """Background worker that processes jobs from the queue."""
    r = get_redis()

    while True:
        try:
            # Check if we can process more jobs
            active_jobs = int(r.get('active_jobs') or 0)

            if active_jobs < MAX_CONCURRENT_JOBS:
                # Try to get a job from the queue (blocking with timeout)
                job_data = r.blpop('job_queue', timeout=1)

                if job_data:
                    _, job_id = job_data
                    # Increment active jobs counter
                    r.incr('active_jobs')
                    # Add to processing set
                    r.sadd('processing_jobs', job_id)
                    # Process the job in a thread
                    thread = threading.Thread(target=process_job, args=(job_id,))
                    thread.start()
            else:
                # Wait a bit before checking again
                time.sleep(0.5)

        except redis.ConnectionError:
            # Redis connection lost, wait and retry
            time.sleep(1)
        except Exception as e:
            print(f"Worker error: {e}")
            time.sleep(1)


# Start worker thread
worker_thread = threading.Thread(target=worker_loop, daemon=True)
worker_thread.start()


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    # Check if ASTAP binary exists
    astap_exists = os.path.exists(ASTAP_CLI)

    # Check if star database exists
    db_exists = os.path.isdir(STAR_DATABASE) and len(os.listdir(STAR_DATABASE)) > 0

    # Check Redis connection
    redis_ok = False
    try:
        r = get_redis()
        r.ping()
        redis_ok = True
    except:
        pass

    if astap_exists and db_exists and redis_ok:
        return jsonify({
            'status': 'healthy',
            'astap': ASTAP_CLI,
            'database': STAR_DATABASE,
            'redis': 'connected',
        })
    else:
        return jsonify({
            'status': 'unhealthy',
            'astap_exists': astap_exists,
            'database_exists': db_exists,
            'redis_connected': redis_ok,
        }), 503


@app.route('/queue', methods=['GET'])
def queue_status():
    """Get queue status."""
    try:
        r = get_redis()
        queue_length = r.llen('job_queue')
        active_jobs = int(r.get('active_jobs') or 0)
        processing_jobs = list(r.smembers('processing_jobs'))

        return jsonify({
            'queued': queue_length,
            'processing': active_jobs,
            'processing_jobs': processing_jobs,
            'max_concurrent': MAX_CONCURRENT_JOBS,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/solve', methods=['POST'])
def solve():
    """
    Submit an image for plate solving.

    Form parameters:
        file: The image file to solve
        fov: (optional) Field of view hint in degrees
        ra: (optional) RA hint in degrees
        dec: (optional) Dec hint in degrees
        downsample: (optional) Downsample factor (1-4)

    Returns:
        JSON with job_id for polling status
    """
    # Check for file
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file provided'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected'}), 400

    if not allowed_file(file.filename):
        return jsonify({
            'success': False,
            'error': f'Invalid file type. Allowed: {", ".join(ALLOWED_EXTENSIONS)}'
        }), 400

    # Get optional parameters
    options = {}

    if 'fov' in request.form:
        try:
            options['fov'] = float(request.form['fov'])
        except ValueError:
            pass

    if 'ra' in request.form and 'dec' in request.form:
        try:
            options['ra'] = float(request.form['ra'])
            options['dec'] = float(request.form['dec'])
        except ValueError:
            pass

    if 'downsample' in request.form:
        try:
            options['downsample'] = int(request.form['downsample'])
        except ValueError:
            pass

    # Generate job ID
    job_id = str(uuid.uuid4())

    # Save file to temp directory
    filename = secure_filename(file.filename)
    unique_filename = f"{job_id}_{filename}"
    temp_path = os.path.join(TEMP_DIR, unique_filename)
    file.save(temp_path)

    # Create job in Redis
    r = get_redis()
    job_key = f"job:{job_id}"

    r.hset(job_key, mapping={
        'id': job_id,
        'status': 'queued',
        'created_at': datetime.utcnow().isoformat(),
        'filename': filename,
        'image_path': temp_path,
        'options': json.dumps(options),
    })

    # Set expiry on job
    r.expire(job_key, JOB_EXPIRY_SECONDS)

    # Add to queue
    r.rpush('job_queue', job_id)

    # Get queue position
    queue_length = r.llen('job_queue')

    return jsonify({
        'success': True,
        'job_id': job_id,
        'status': 'queued',
        'queue_position': queue_length,
        'message': f'Job queued. Poll GET /job/{job_id} for results.',
    })


@app.route('/job/<job_id>', methods=['GET'])
def get_job(job_id: str):
    """
    Get job status and results.

    Returns:
        JSON with job status and results (if completed)
    """
    r = get_redis()
    job_key = f"job:{job_id}"

    job_data = r.hgetall(job_key)

    if not job_data:
        return jsonify({
            'success': False,
            'error': 'Job not found or expired',
        }), 404

    response = {
        'job_id': job_id,
        'status': job_data.get('status'),
        'created_at': job_data.get('created_at'),
        'filename': job_data.get('filename'),
    }

    if job_data.get('started_at'):
        response['started_at'] = job_data.get('started_at')

    if job_data.get('completed_at'):
        response['completed_at'] = job_data.get('completed_at')

    # If completed or failed, include results
    if job_data.get('status') in ('completed', 'failed'):
        result = json.loads(job_data.get('result', '{}'))
        response.update(result)

    # If queued, include position
    if job_data.get('status') == 'queued':
        # Find position in queue
        queue = r.lrange('job_queue', 0, -1)
        try:
            position = queue.index(job_id) + 1
            response['queue_position'] = position
        except ValueError:
            pass

    return jsonify(response)


@app.route('/job/<job_id>', methods=['DELETE'])
def cancel_job(job_id: str):
    """Cancel a queued job."""
    r = get_redis()
    job_key = f"job:{job_id}"

    job_data = r.hgetall(job_key)

    if not job_data:
        return jsonify({
            'success': False,
            'error': 'Job not found',
        }), 404

    if job_data.get('status') != 'queued':
        return jsonify({
            'success': False,
            'error': 'Can only cancel queued jobs',
        }), 400

    # Remove from queue
    r.lrem('job_queue', 1, job_id)

    # Update status
    r.hset(job_key, 'status', 'cancelled')

    # Cleanup image file
    image_path = job_data.get('image_path')
    if image_path and os.path.exists(image_path):
        try:
            os.remove(image_path)
        except:
            pass

    return jsonify({
        'success': True,
        'job_id': job_id,
        'status': 'cancelled',
    })


@app.route('/', methods=['GET'])
def index():
    """API info endpoint."""
    return jsonify({
        'name': 'ASTAP Plate Solver API',
        'version': '2.0.0',
        'endpoints': {
            '/health': 'GET - Health check',
            '/queue': 'GET - Queue status',
            '/solve': 'POST - Submit image for plate solving (returns job_id)',
            '/job/<job_id>': 'GET - Get job status and results',
            '/job/<job_id>': 'DELETE - Cancel a queued job',
        },
        'supported_formats': list(ALLOWED_EXTENSIONS),
        'max_concurrent_jobs': MAX_CONCURRENT_JOBS,
        'job_expiry_hours': JOB_EXPIRY_SECONDS / 3600,
    })


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug)
