#!/usr/bin/env python3
"""
Astronomical Image Format Converter

Converts various astronomical image formats to FITS for unified processing.
Supported input formats:
- XISF (PixInsight)
- TIFF/TIF
- RAW camera files (CR2, CR3, NEF, ARW, DNG, RAF, ORF, RW2, PEF, SRW)
- PNG, JPEG (with limited metadata)

Output: FITS file with preserved metadata in header

Dependencies:
- astropy (FITS handling)
- xisf (XISF reading) - pip install xisf
- rawpy (RAW file reading) - pip install rawpy
- numpy
- Pillow (for TIFF/PNG/JPEG)

Usage:
    python convert_to_fits.py <input_file> <output_fits_file>

Output JSON:
    {"success": true, "output_path": "/path/to/output.fits", "original_format": "XISF"}
    or
    {"success": false, "error": "Error message"}
"""

import sys
import json
import os
import numpy as np
from typing import Dict, Any, Optional, Tuple
from datetime import datetime
import xml.etree.ElementTree as ET


# Supported file extensions
FITS_EXTENSIONS = {'.fits', '.fit', '.fts'}
XISF_EXTENSIONS = {'.xisf'}
TIFF_EXTENSIONS = {'.tiff', '.tif'}
RAW_EXTENSIONS = {'.cr2', '.cr3', '.nef', '.arw', '.dng', '.raf', '.orf', '.rw2', '.pef', '.srw'}
IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg'}

ALL_SUPPORTED = FITS_EXTENSIONS | XISF_EXTENSIONS | TIFF_EXTENSIONS | RAW_EXTENSIONS | IMAGE_EXTENSIONS


def get_file_type(file_path: str) -> str:
    """Determine file type from extension"""
    ext = os.path.splitext(file_path)[1].lower()

    if ext in FITS_EXTENSIONS:
        return 'FITS'
    elif ext in XISF_EXTENSIONS:
        return 'XISF'
    elif ext in TIFF_EXTENSIONS:
        return 'TIFF'
    elif ext in RAW_EXTENSIONS:
        return 'RAW'
    elif ext in IMAGE_EXTENSIONS:
        return 'IMAGE'
    else:
        return 'UNKNOWN'


def convert_xisf_to_fits(input_path: str, output_path: str) -> Dict[str, Any]:
    """
    Convert XISF file to FITS format.

    Attempts to use the xisf library first, falls back to manual parsing.
    """
    try:
        from astropy.io import fits

        # Try using the xisf library first (better support for compressed files)
        try:
            from xisf import XISF

            xisf_file = XISF(input_path)
            im_data = xisf_file.read_image(0)
            file_meta = xisf_file.get_file_metadata()
            im_meta = xisf_file.get_images_metadata()[0]

            # Create FITS header with metadata
            header = fits.Header()

            # Get FITS keywords from XISF metadata
            fits_keywords = im_meta.get('FITSKeywords', {})
            for key, value_list in fits_keywords.items():
                if value_list and len(value_list) > 0:
                    value = value_list[0].get('value', '')
                    comment = value_list[0].get('comment', '')
                    # Clean up the value
                    if isinstance(value, str):
                        value = value.strip("'").strip()
                    try:
                        # Try to preserve numeric types
                        if '.' in str(value):
                            value = float(value)
                        elif str(value).lstrip('-').isdigit():
                            value = int(value)
                    except (ValueError, TypeError):
                        pass

                    # Truncate key to 8 chars (FITS standard)
                    key = key[:8]
                    try:
                        header[key] = (value, comment[:47] if comment else '')
                    except Exception:
                        # Skip problematic keywords
                        pass

            # Handle image data orientation
            # XISF may have channels in different order
            if len(im_data.shape) == 3:
                # Move channel axis if needed (XISF uses channel-first)
                if im_data.shape[0] in [1, 3, 4]:  # Likely channel-first
                    im_data = np.moveaxis(im_data, 0, -1)
                # For grayscale, squeeze to 2D
                if im_data.shape[-1] == 1:
                    im_data = im_data.squeeze(axis=-1)

            # Add conversion info
            header['HISTORY'] = f'Converted from XISF by AstroPlanner on {datetime.utcnow().isoformat()}'
            header['ORIGFMT'] = ('XISF', 'Original file format')

            # Create and write FITS
            hdu = fits.PrimaryHDU(im_data, header=header)
            hdu.writeto(output_path, overwrite=True)

            return {'success': True, 'output_path': output_path, 'original_format': 'XISF', 'method': 'xisf_library'}

        except ImportError:
            # Fall back to manual XISF parsing
            pass

        # Manual XISF parsing (for cases where xisf library is not available)
        with open(input_path, 'rb') as f:
            # Validate signature
            signature = f.read(8)
            if signature != b'XISF0100':
                return {'success': False, 'error': f'Invalid XISF signature: {signature}'}

            # Read header length
            header_length = int.from_bytes(f.read(4), byteorder='little')
            f.read(4)  # Skip reserved

            # Read and parse XML header
            xml_data = f.read(header_length)
            root = ET.fromstring(xml_data)

            # Find image element
            ns = {'xisf': 'http://www.pixinsight.com/xisf'}
            image_elem = root.find('.//xisf:Image', ns)
            if image_elem is None:
                image_elem = root.find('.//Image')

            if image_elem is None:
                return {'success': False, 'error': 'No Image element found in XISF'}

            # Get image properties
            geometry = image_elem.get('geometry', '').split(':')
            sample_format = image_elem.get('sampleFormat', 'Float32')
            color_space = image_elem.get('colorSpace', 'Gray')

            # Determine dimensions
            if len(geometry) >= 2:
                width = int(geometry[0])
                height = int(geometry[1])
                channels = int(geometry[2]) if len(geometry) > 2 else 1
            else:
                return {'success': False, 'error': 'Cannot determine image dimensions'}

            # Determine numpy dtype
            dtype_map = {
                'UInt8': np.uint8,
                'UInt16': np.uint16,
                'UInt32': np.uint32,
                'Float32': np.float32,
                'Float64': np.float64,
            }
            dtype = dtype_map.get(sample_format, np.float32)

            # Find data location
            location = image_elem.get('location', '')
            if location.startswith('attachment:'):
                parts = location.split(':')
                data_offset = int(parts[1])
                data_size = int(parts[2]) if len(parts) > 2 else None
            else:
                # Inline data not yet supported
                return {'success': False, 'error': 'Inline XISF data not supported, use xisf library'}

            # Read image data
            f.seek(data_offset)
            pixel_count = width * height * channels
            im_data = np.frombuffer(f.read(pixel_count * dtype().itemsize), dtype=dtype)

            # Reshape (XISF stores planar: channels, height, width)
            if channels > 1:
                im_data = im_data.reshape((channels, height, width))
                im_data = np.moveaxis(im_data, 0, -1)  # Convert to height, width, channels
            else:
                im_data = im_data.reshape((height, width))

            # Build FITS header from XISF keywords
            header = fits.Header()

            fits_keywords = root.findall('.//xisf:FITSKeyword', ns)
            if not fits_keywords:
                fits_keywords = root.findall('.//FITSKeyword')

            for kw in fits_keywords:
                name = kw.get('name', '')[:8]
                value = kw.get('value', '').strip("'").strip()
                comment = kw.get('comment', '')[:47]

                try:
                    if '.' in value:
                        value = float(value)
                    elif value.lstrip('-').isdigit():
                        value = int(value)
                except (ValueError, TypeError):
                    pass

                try:
                    header[name] = (value, comment)
                except Exception:
                    pass

            header['HISTORY'] = f'Converted from XISF (manual) on {datetime.utcnow().isoformat()}'
            header['ORIGFMT'] = ('XISF', 'Original file format')

            # Write FITS
            hdu = fits.PrimaryHDU(im_data, header=header)
            hdu.writeto(output_path, overwrite=True)

            return {'success': True, 'output_path': output_path, 'original_format': 'XISF', 'method': 'manual'}

    except Exception as e:
        return {'success': False, 'error': f'XISF conversion error: {str(e)}'}


def convert_raw_to_fits(input_path: str, output_path: str) -> Dict[str, Any]:
    """
    Convert camera RAW file (CR2, NEF, ARW, etc.) to FITS.

    Uses rawpy (libraw wrapper) for decoding.
    """
    try:
        import rawpy
        from astropy.io import fits

        with rawpy.imread(input_path) as raw:
            # Get raw Bayer data (unprocessed)
            # This preserves the most data for astronomical use
            try:
                # Try to get raw Bayer pattern data
                im_data = raw.raw_image.copy()
                is_bayer = True
            except Exception:
                # Fall back to demosaiced RGB
                im_data = raw.postprocess(
                    output_bps=16,
                    no_auto_bright=True,
                    use_camera_wb=False,
                    user_wb=[1, 1, 1, 1],
                    gamma=(1, 1),  # Linear
                    output_color=rawpy.ColorSpace.raw,
                )
                is_bayer = False

            # Build FITS header with EXIF data
            header = fits.Header()

            # Extract metadata from RAW file
            try:
                # Camera info
                header['INSTRUME'] = (raw.camera_model or 'Unknown', 'Camera model')
                header['CAMERA'] = (raw.camera_model or 'Unknown', 'Camera model')

                # Raw image properties
                header['NAXIS1'] = im_data.shape[1] if len(im_data.shape) >= 2 else im_data.shape[0]
                header['NAXIS2'] = im_data.shape[0] if len(im_data.shape) >= 2 else 1

                # ISO (if available)
                if hasattr(raw, 'camera_iso') and raw.camera_iso:
                    header['ISO'] = (raw.camera_iso, 'ISO sensitivity')

                # Color description
                if is_bayer:
                    header['BAYERPAT'] = (raw.raw_pattern.tobytes().decode('utf-8', errors='ignore')[:8], 'Bayer pattern')

            except Exception as meta_error:
                header['HISTORY'] = f'Metadata extraction partial: {str(meta_error)}'

            header['HISTORY'] = f'Converted from RAW by AstroPlanner on {datetime.utcnow().isoformat()}'
            header['ORIGFMT'] = ('RAW', 'Original file format')
            header['ORIGFILE'] = (os.path.basename(input_path)[:68], 'Original filename')

            # Create and write FITS
            hdu = fits.PrimaryHDU(im_data, header=header)
            hdu.writeto(output_path, overwrite=True)

            return {
                'success': True,
                'output_path': output_path,
                'original_format': 'RAW',
                'camera': raw.camera_model or 'Unknown',
                'is_bayer': is_bayer
            }

    except ImportError:
        return {'success': False, 'error': 'rawpy not installed. Install with: pip install rawpy'}
    except Exception as e:
        return {'success': False, 'error': f'RAW conversion error: {str(e)}'}


def convert_tiff_to_fits(input_path: str, output_path: str) -> Dict[str, Any]:
    """
    Convert TIFF file to FITS.

    Handles 8-bit, 16-bit, and 32-bit TIFF files.
    """
    try:
        from PIL import Image
        from PIL.ExifTags import TAGS
        from astropy.io import fits

        with Image.open(input_path) as img:
            # Get image data as numpy array
            im_data = np.array(img)

            # Build FITS header
            header = fits.Header()

            # Extract EXIF data if available
            exif_data = img._getexif() if hasattr(img, '_getexif') and img._getexif() else {}

            for tag_id, value in exif_data.items():
                tag = TAGS.get(tag_id, tag_id)

                # Map common EXIF tags to FITS keywords
                if tag == 'ExposureTime' and value:
                    header['EXPTIME'] = (float(value), 'Exposure time in seconds')
                elif tag == 'ISOSpeedRatings' and value:
                    iso = value[0] if isinstance(value, tuple) else value
                    header['ISO'] = (int(iso), 'ISO sensitivity')
                elif tag == 'DateTimeOriginal' and value:
                    header['DATE-OBS'] = (str(value), 'Date of observation')
                elif tag == 'Make' and value:
                    header['CAMERA'] = (str(value)[:68], 'Camera make')
                elif tag == 'Model' and value:
                    header['INSTRUME'] = (str(value)[:68], 'Camera model')

            # Image info
            header['NAXIS1'] = im_data.shape[1] if len(im_data.shape) >= 2 else im_data.shape[0]
            header['NAXIS2'] = im_data.shape[0] if len(im_data.shape) >= 2 else 1
            header['BITPIX'] = -32 if im_data.dtype in [np.float32, np.float64] else (16 if im_data.dtype == np.uint16 else 8)

            header['HISTORY'] = f'Converted from TIFF by AstroPlanner on {datetime.utcnow().isoformat()}'
            header['ORIGFMT'] = ('TIFF', 'Original file format')
            header['ORIGFILE'] = (os.path.basename(input_path)[:68], 'Original filename')

            # Convert to appropriate dtype for FITS
            if im_data.dtype == np.uint8:
                im_data = im_data.astype(np.int16)
            elif im_data.dtype == np.uint16:
                im_data = im_data.astype(np.int32)
            elif im_data.dtype == np.uint32:
                im_data = im_data.astype(np.float32)

            # Create and write FITS
            hdu = fits.PrimaryHDU(im_data, header=header)
            hdu.writeto(output_path, overwrite=True)

            return {'success': True, 'output_path': output_path, 'original_format': 'TIFF'}

    except ImportError:
        return {'success': False, 'error': 'Pillow not installed. Install with: pip install Pillow'}
    except Exception as e:
        return {'success': False, 'error': f'TIFF conversion error: {str(e)}'}


def convert_image_to_fits(input_path: str, output_path: str) -> Dict[str, Any]:
    """
    Convert standard image (PNG, JPEG) to FITS.

    Note: These formats have limited metadata and lossy compression (JPEG).
    Primarily for previews or processed final images.
    """
    try:
        from PIL import Image
        from PIL.ExifTags import TAGS
        from astropy.io import fits

        with Image.open(input_path) as img:
            # Convert to RGB if necessary
            if img.mode in ['RGBA', 'P']:
                img = img.convert('RGB')
            elif img.mode == 'L':
                pass  # Grayscale is fine

            im_data = np.array(img)

            # Build FITS header
            header = fits.Header()

            # Try to get EXIF
            exif_data = img._getexif() if hasattr(img, '_getexif') and img._getexif() else {}

            for tag_id, value in exif_data.items():
                tag = TAGS.get(tag_id, tag_id)
                if tag == 'ExposureTime' and value:
                    header['EXPTIME'] = (float(value), 'Exposure time in seconds')
                elif tag == 'ISOSpeedRatings' and value:
                    iso = value[0] if isinstance(value, tuple) else value
                    header['ISO'] = (int(iso), 'ISO sensitivity')
                elif tag == 'DateTimeOriginal' and value:
                    header['DATE-OBS'] = (str(value), 'Date of observation')

            ext = os.path.splitext(input_path)[1].lower()
            fmt = 'JPEG' if ext in ['.jpg', '.jpeg'] else 'PNG'

            header['HISTORY'] = f'Converted from {fmt} by AstroPlanner on {datetime.utcnow().isoformat()}'
            header['ORIGFMT'] = (fmt, 'Original file format')
            header['ORIGFILE'] = (os.path.basename(input_path)[:68], 'Original filename')

            if fmt == 'JPEG':
                header['HISTORY'] = 'Warning: JPEG is lossy, data quality reduced'

            # Create and write FITS
            hdu = fits.PrimaryHDU(im_data.astype(np.int16), header=header)
            hdu.writeto(output_path, overwrite=True)

            return {'success': True, 'output_path': output_path, 'original_format': fmt}

    except ImportError:
        return {'success': False, 'error': 'Pillow not installed. Install with: pip install Pillow'}
    except Exception as e:
        return {'success': False, 'error': f'Image conversion error: {str(e)}'}


def copy_fits(input_path: str, output_path: str) -> Dict[str, Any]:
    """
    Copy FITS file (no conversion needed, but validate it).
    """
    try:
        from astropy.io import fits
        import shutil

        # Validate the FITS file can be opened
        with fits.open(input_path) as hdul:
            # File is valid, just copy it
            pass

        # Copy the file
        shutil.copy2(input_path, output_path)

        return {'success': True, 'output_path': output_path, 'original_format': 'FITS', 'copied': True}

    except Exception as e:
        return {'success': False, 'error': f'FITS validation/copy error: {str(e)}'}


def convert_to_fits(input_path: str, output_path: str) -> Dict[str, Any]:
    """
    Main conversion function - routes to appropriate converter based on file type.
    """
    file_type = get_file_type(input_path)

    if file_type == 'FITS':
        return copy_fits(input_path, output_path)
    elif file_type == 'XISF':
        return convert_xisf_to_fits(input_path, output_path)
    elif file_type == 'RAW':
        return convert_raw_to_fits(input_path, output_path)
    elif file_type == 'TIFF':
        return convert_tiff_to_fits(input_path, output_path)
    elif file_type == 'IMAGE':
        return convert_image_to_fits(input_path, output_path)
    else:
        ext = os.path.splitext(input_path)[1].lower()
        return {
            'success': False,
            'error': f'Unsupported file type: {ext}',
            'supported': list(ALL_SUPPORTED)
        }


def main():
    if len(sys.argv) < 3:
        print(json.dumps({
            'success': False,
            'error': 'Usage: convert_to_fits.py <input_file> <output_fits_file>',
            'supported_formats': list(ALL_SUPPORTED)
        }))
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    if not os.path.exists(input_path):
        print(json.dumps({
            'success': False,
            'error': f'File not found: {input_path}'
        }))
        sys.exit(1)

    result = convert_to_fits(input_path, output_path)
    print(json.dumps(result, indent=2))

    sys.exit(0 if result.get('success') else 1)


if __name__ == '__main__':
    main()
