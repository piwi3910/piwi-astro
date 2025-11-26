#!/usr/bin/env python3
"""
FITS Metadata Extraction Script

Extracts metadata from FITS astronomical image files and outputs JSON.
This script is designed to work with the unified FITS pipeline where all
image formats are first converted to FITS before metadata extraction.

Usage:
    python extract_fits_metadata.py <fits_file_path>

Output:
    JSON to stdout with extracted metadata
"""

import sys
import json
import os
from typing import Dict, Any


def extract_fits_metadata(file_path: str) -> Dict[str, Any]:
    """Extract metadata from FITS file"""
    try:
        from astropy.io import fits

        with fits.open(file_path) as hdul:
            header = hdul[0].header

            metadata = {
                'fileType': 'FITS',
                'success': True,
            }

            # Target coordinates
            if 'RA' in header:
                try:
                    metadata['ra'] = float(header['RA'])
                except (ValueError, TypeError):
                    metadata['raStr'] = str(header['RA'])
            if 'DEC' in header:
                try:
                    metadata['dec'] = float(header['DEC'])
                except (ValueError, TypeError):
                    metadata['decStr'] = str(header['DEC'])
            if 'OBJCTRA' in header:  # Alternative RA key
                metadata['raStr'] = str(header['OBJCTRA'])
            if 'OBJCTDEC' in header:  # Alternative Dec key
                metadata['decStr'] = str(header['OBJCTDEC'])

            # Target name
            if 'OBJECT' in header:
                metadata['targetName'] = str(header['OBJECT'])

            # Date/Time
            if 'DATE-OBS' in header:
                metadata['captureDate'] = str(header['DATE-OBS'])
            elif 'DATE' in header:
                metadata['captureDate'] = str(header['DATE'])

            # Exposure
            if 'EXPTIME' in header:
                try:
                    metadata['exposureTime'] = float(header['EXPTIME'])
                except (ValueError, TypeError):
                    pass
            elif 'EXPOSURE' in header:
                try:
                    metadata['exposureTime'] = float(header['EXPOSURE'])
                except (ValueError, TypeError):
                    pass

            # Integration time / number of exposures
            if 'NCOMBINE' in header or 'STACKCNT' in header:
                count = header.get('NCOMBINE', header.get('STACKCNT'))
                if count:
                    try:
                        metadata['exposureCount'] = int(count)
                        if 'exposureTime' in metadata:
                            metadata['totalIntegrationTime'] = metadata['exposureTime'] * metadata['exposureCount']
                    except (ValueError, TypeError):
                        pass

            # Camera/Sensor info
            if 'GAIN' in header:
                try:
                    metadata['gain'] = float(header['GAIN'])
                except (ValueError, TypeError):
                    pass
            if 'ISO' in header:
                try:
                    metadata['iso'] = int(header['ISO'])
                except (ValueError, TypeError):
                    pass
            if 'OFFSET' in header:
                try:
                    metadata['offset'] = int(header['OFFSET'])
                except (ValueError, TypeError):
                    pass

            # Temperature
            if 'CCD-TEMP' in header:
                try:
                    metadata['temperature'] = float(header['CCD-TEMP'])
                except (ValueError, TypeError):
                    pass
            elif 'SET-TEMP' in header:
                try:
                    metadata['temperature'] = float(header['SET-TEMP'])
                except (ValueError, TypeError):
                    pass

            # Filter
            if 'FILTER' in header:
                metadata['filter'] = str(header['FILTER'])

            # Equipment
            if 'TELESCOP' in header:
                metadata['telescope'] = str(header['TELESCOP'])
            if 'INSTRUME' in header:
                metadata['camera'] = str(header['INSTRUME'])
            elif 'CAMERA' in header:
                metadata['camera'] = str(header['CAMERA'])

            # Optics
            if 'FOCALLEN' in header:
                try:
                    metadata['focalLength'] = float(header['FOCALLEN'])
                except (ValueError, TypeError):
                    pass
            if 'APTDIA' in header:
                try:
                    metadata['aperture'] = float(header['APTDIA'])
                except (ValueError, TypeError):
                    pass
            if 'FOCRATIO' in header:
                try:
                    metadata['fRatio'] = float(header['FOCRATIO'])
                except (ValueError, TypeError):
                    pass

            # Pixel scale
            if 'XPIXSZ' in header:
                try:
                    metadata['pixelSizeX'] = float(header['XPIXSZ'])
                except (ValueError, TypeError):
                    pass
            if 'YPIXSZ' in header:
                try:
                    metadata['pixelSizeY'] = float(header['YPIXSZ'])
                except (ValueError, TypeError):
                    pass
            if 'PIXSIZE' in header:
                try:
                    metadata['pixelSize'] = float(header['PIXSIZE'])
                except (ValueError, TypeError):
                    pass

            # Image dimensions
            if 'NAXIS1' in header:
                try:
                    metadata['width'] = int(header['NAXIS1'])
                except (ValueError, TypeError):
                    pass
            if 'NAXIS2' in header:
                try:
                    metadata['height'] = int(header['NAXIS2'])
                except (ValueError, TypeError):
                    pass

            # Binning
            if 'XBINNING' in header:
                try:
                    metadata['binningX'] = int(header['XBINNING'])
                except (ValueError, TypeError):
                    pass
            if 'YBINNING' in header:
                try:
                    metadata['binningY'] = int(header['YBINNING'])
                except (ValueError, TypeError):
                    pass

            # Software used
            if 'SWCREATE' in header:
                metadata['software'] = str(header['SWCREATE'])
            elif 'PROGRAM' in header:
                metadata['software'] = str(header['PROGRAM'])

            # Observer/Location
            if 'OBSERVER' in header:
                metadata['observer'] = str(header['OBSERVER'])
            if 'SITELAT' in header:
                try:
                    metadata['siteLatitude'] = float(header['SITELAT'])
                except (ValueError, TypeError):
                    pass
            if 'SITELONG' in header:
                try:
                    metadata['siteLongitude'] = float(header['SITELONG'])
                except (ValueError, TypeError):
                    pass
            if 'SITEELEV' in header:
                try:
                    metadata['siteElevation'] = float(header['SITEELEV'])
                except (ValueError, TypeError):
                    pass

            # Check for original format info (from conversion)
            if 'ORIGFMT' in header:
                metadata['originalFormat'] = str(header['ORIGFMT'])
            if 'ORIGFILE' in header:
                metadata['originalFile'] = str(header['ORIGFILE'])

            return metadata

    except ImportError:
        return {
            'success': False,
            'error': 'astropy not installed. Install with: pip install astropy'
        }
    except Exception as e:
        return {
            'success': False,
            'error': f'Error reading FITS file: {str(e)}'
        }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            'success': False,
            'error': 'No file path provided'
        }))
        sys.exit(1)

    file_path = sys.argv[1]

    if not os.path.exists(file_path):
        print(json.dumps({
            'success': False,
            'error': f'File not found: {file_path}'
        }))
        sys.exit(1)

    # Determine file type by extension
    ext = os.path.splitext(file_path)[1].lower()

    if ext not in ['.fits', '.fit', '.fts']:
        print(json.dumps({
            'success': False,
            'error': f'Unsupported file type: {ext}. This script only handles FITS files. Use convert_to_fits.py first.'
        }))
        sys.exit(1)

    metadata = extract_fits_metadata(file_path)

    # Output JSON to stdout
    print(json.dumps(metadata, indent=2))


if __name__ == '__main__':
    main()
