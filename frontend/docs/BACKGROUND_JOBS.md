# Background Jobs with BullMQ

This document explains the background job system for AstroPlanner using Redis and BullMQ.

## Overview

The background job system handles scheduled tasks like:
- **Weekly comet updates** from COBS API
- **Catalog refreshes** from astronomical databases
- **Data cleanup** for old/stale records

## Architecture

- **Redis**: In-memory data store for job queues
- **BullMQ**: Robust job queue library built on Redis
- **Worker Process**: Separate process that executes jobs

## Setup

### 1. Install Redis

**macOS (via Homebrew):**
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

**Docker:**
```bash
docker run -d -p 6379:6379 redis:alpine
```

### 2. Configure Environment

Add to your `.env` file:
```env
REDIS_URL="redis://localhost:6379"
```

### 3. Start the Worker

In a separate terminal (keep it running):
```bash
npm run worker
```

Or for development with auto-reload:
```bash
npx nodemon --exec tsx scripts/start-worker.ts
```

## Available Jobs

### 1. Update Comets

Fetches latest comet data from COBS API and updates the database.

**Manual Trigger:**
```bash
curl -X POST http://localhost:3000/api/admin/jobs/trigger \
  -H "Content-Type: application/json" \
  -d '{"jobType": "update-comets", "maxMagnitude": 15}'
```

**Scheduled:** Runs automatically every Sunday at midnight

### 2. Schedule Recurring Updates

Set up weekly comet updates:

```bash
curl -X POST http://localhost:3000/api/admin/jobs/trigger \
  -H "Content-Type: application/json" \
  -d '{"jobType": "schedule-recurring-comets"}'
```

### 3. Data Cleanup

Remove old/stale data:

```bash
curl -X POST http://localhost:3000/api/admin/jobs/trigger \
  -H "Content-Type: application/json" \
  -d '{"jobType": "cleanup-old-data", "daysOld": 30}'
```

## Monitoring Jobs

### View Queue Status

Get overall queue statistics:
```bash
curl http://localhost:3000/api/admin/jobs/status
```

Response:
```json
{
  "queueStats": {
    "waiting": 0,
    "active": 1,
    "completed": 15,
    "failed": 0,
    "delayed": 0
  },
  "recentJobs": [...]
}
```

### Check Specific Job

Get status of a specific job:
```bash
curl http://localhost:3000/api/admin/jobs/status?jobId=<JOB_ID>
```

## Job Configuration

### Cron Patterns

Jobs use standard cron syntax:

```
* * * * * *
│ │ │ │ │ │
│ │ │ │ │ └─ Day of week (0-7, Sunday=0 or 7)
│ │ │ │ └─── Month (1-12)
│ │ │ └───── Day of month (1-31)
│ │ └─────── Hour (0-23)
│ └───────── Minute (0-59)
└─────────── Second (0-59, optional)
```

**Examples:**
- `0 0 * * 0` - Every Sunday at midnight
- `0 3 * * *` - Every day at 3 AM
- `0 */6 * * *` - Every 6 hours
- `0 0 1 * *` - First day of every month

### Retry Configuration

Jobs automatically retry on failure:
- **Max Attempts**: 3
- **Backoff**: Exponential (5s, 25s, 125s)
- **Logs**: Last 100 completed jobs kept
- **Error Logs**: Last 50 failed jobs kept

## Adding New Jobs

### 1. Define Job Type

Add to `src/lib/queue/queues.ts`:

```typescript
export interface MyJobData {
  param1: string;
  param2: number;
}

export async function scheduleMyJob(data: MyJobData) {
  return catalogUpdateQueue.add('my-job', data);
}
```

### 2. Implement Job Handler

Add to `src/lib/queue/workers/catalog-worker.ts`:

```typescript
async function myJobHandler(job: Job<MyJobData>) {
  const { param1, param2 } = job.data;

  console.log(`Processing my-job: ${param1}, ${param2}`);

  // Do work here
  await someAsyncOperation();

  return { success: true };
}

// Add to switch statement in worker:
case 'my-job':
  return await myJobHandler(job as Job<MyJobData>);
```

### 3. Add API Endpoint (Optional)

Add to `src/app/api/admin/jobs/trigger/route.ts`:

```typescript
case 'my-job':
  job = await scheduleMyJob(params);
  break;
```

## Production Deployment

### Systemd Service (Linux)

Create `/etc/systemd/system/astroplanner-worker.service`:

```ini
[Unit]
Description=AstroPlanner Background Worker
After=network.target redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/astroplanner
Environment="NODE_ENV=production"
Environment="REDIS_URL=redis://localhost:6379"
ExecStart=/usr/bin/npm run worker
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable astroplanner-worker
sudo systemctl start astroplanner-worker
sudo systemctl status astroplanner-worker
```

### Docker Compose

Add to `docker-compose.yml`:

```yaml
services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  worker:
    build: .
    command: npm run worker
    depends_on:
      - redis
      - postgres
    environment:
      - REDIS_URL=redis://redis:6379
      - DATABASE_URL=postgresql://...

volumes:
  redis-data:
```

### PM2 (Process Manager)

```bash
pm2 start npm --name "astroplanner-worker" -- run worker
pm2 save
pm2 startup
```

## Troubleshooting

### Worker Not Processing Jobs

1. **Check Redis connection:**
   ```bash
   redis-cli ping  # Should return "PONG"
   ```

2. **Check worker is running:**
   ```bash
   ps aux | grep worker
   ```

3. **View worker logs:**
   ```bash
   # If using systemd:
   sudo journalctl -u astroplanner-worker -f

   # If using PM2:
   pm2 logs astroplanner-worker
   ```

### Jobs Failing

1. **Check job status:**
   ```bash
   curl http://localhost:3000/api/admin/jobs/status
   ```

2. **View failed jobs:**
   ```bash
   redis-cli
   > LRANGE bull:catalog-updates:failed 0 -1
   ```

3. **Clear failed jobs:**
   ```bash
   redis-cli
   > DEL bull:catalog-updates:failed
   ```

### Redis Memory Issues

Monitor Redis memory:
```bash
redis-cli INFO memory
```

Set memory limits in `redis.conf`:
```conf
maxmemory 256mb
maxmemory-policy allkeys-lru
```

## Best Practices

1. **Keep worker running**: Use systemd, PM2, or Docker to ensure worker restarts on crash
2. **Monitor job failures**: Set up alerts for high failure rates
3. **Limit concurrent jobs**: Use `concurrency` setting to prevent resource exhaustion
4. **Log important events**: Jobs log to console, capture with logging service
5. **Test jobs locally**: Trigger manually before setting up recurring schedules
6. **Backup Redis data**: Use Redis persistence (RDB or AOF) for production

## Useful Commands

```bash
# View all queues in Redis
redis-cli KEYS "bull:*"

# Count jobs in queue
redis-cli LLEN "bull:catalog-updates:waiting"

# Clear entire queue (DANGEROUS!)
redis-cli DEL "bull:catalog-updates:waiting"

# Monitor Redis commands in real-time
redis-cli MONITOR
```
