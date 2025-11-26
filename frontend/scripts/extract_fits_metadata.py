#!/usr/bin/env python3
"""
FITS/XISF Metadata Extraction Script
Extracts metadata from astronomical image files and outputs JSON
"""

import sys
import json
import os
from datetime import datetime
from typing import Dict, Any, Optional
import xml.etree.ElementTree as ET

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
                metadata['ra'] = float(header['RA'])
            if 'DEC' in header:
                metadata['dec'] = float(header['DEC'])
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
                metadata['exposureTime'] = float(header['EXPTIME'])
            elif 'EXPOSURE' in header:
                metadata['exposureTime'] = float(header['EXPOSURE'])

            # Integration time / number of exposures
            if 'NCOMBINE' in header or 'STACKCNT' in header:
                count = header.get('NCOMBINE', header.get('STACKCNT'))
                metadata['exposureCount'] = int(count)
                if 'exposureTime' in metadata:
                    metadata['totalIntegrationTime'] = metadata['exposureTime'] * metadata['exposureCount']

            # Camera/Sensor info
            if 'GAIN' in header:
                metadata['gain'] = float(header['GAIN'])
            if 'ISO' in header:
                metadata['iso'] = int(header['ISO'])
            if 'OFFSET' in header:
                metadata['offset'] = int(header['OFFSET'])

            # Temperature
            if 'CCD-TEMP' in header:
                metadata['temperature'] = float(header['CCD-TEMP'])
            elif 'SET-TEMP' in header:
                metadata['temperature'] = float(header['SET-TEMP'])

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
                metadata['focalLength'] = float(header['FOCALLEN'])
            if 'APTDIA' in header:
                metadata['aperture'] = float(header['APTDIA'])
            if 'FOCRATIO' in header:
                metadata['fRatio'] = float(header['FOCRATIO'])

            # Pixel scale
            if 'XPIXSZ' in header:
                metadata['pixelSizeX'] = float(header['XPIXSZ'])
            if 'YPIXSZ' in header:
                metadata['pixelSizeY'] = float(header['YPIXSZ'])
            if 'PIXSIZE' in header:
                metadata['pixelSize'] = float(header['PIXSIZE'])

            # Image dimensions
            if 'NAXIS1' in header:
                metadata['width'] = int(header['NAXIS1'])
            if 'NAXIS2' in header:
                metadata['height'] = int(header['NAXIS2'])

            # Binning
            if 'XBINNING' in header:
                metadata['binningX'] = int(header['XBINNING'])
            if 'YBINNING' in header:
                metadata['binningY'] = int(header['YBINNING'])

            # Software used
            if 'SWCREATE' in header:
                metadata['software'] = str(header['SWCREATE'])
            elif 'PROGRAM' in header:
                metadata['software'] = str(header['PROGRAM'])

            # Observer/Location
            if 'OBSERVER' in header:
                metadata['observer'] = str(header['OBSERVER'])
            if 'SITELAT' in header:
                metadata['siteLatitude'] = float(header['SITELAT'])
            if 'SITELONG' in header:
                metadata['siteLongitude'] = float(header['SITELONG'])
            if 'SITEELEV' in header:
                metadata['siteElevation'] = float(header['SITEELEV'])

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


def extract_xisf_metadata(file_path: str) -> Dict[str, Any]:
    """Extract metadata from XISF file

    XISF files have a binary structure:
    - Signature: 'XISF0100' (8 bytes)
    - Header length: 4 bytes (little-endian uint32)
    - Reserved: 4 bytes
    - XML header (variable length)
    - Binary image data
    """
    try:
        metadata = {
            'fileType': 'XISF',
            'success': True,
        }

        with open(file_path, 'rb') as f:
            # Read and validate signature
            signature = f.read(8)
            if signature != b'XISF0100':
                return {
                    'success': False,
                    'error': f'Invalid XISF signature: {signature}'
                }

            # Read header length (little-endian uint32)
            header_length_bytes = f.read(4)
            header_length = int.from_bytes(header_length_bytes, byteorder='little')

            # Skip reserved bytes
            f.read(4)

            # Read XML header
            xml_data = f.read(header_length)

            # Parse XML
            root = ET.fromstring(xml_data)

        # XISF stores metadata in FITSKeyword elements
        # Handle both namespaced and non-namespaced versions
        namespaces = {
            'xisf': 'http://www.pixinsight.com/xisf'
        }

        fits_keywords = root.findall('.//xisf:FITSKeyword', namespaces)
        if not fits_keywords:
            # Try without namespace
            fits_keywords = root.findall('.//FITSKeyword')

        # Build a dictionary of FITS keywords
        keywords = {}
        for keyword in fits_keywords:
            name = keyword.get('name')
            value = keyword.get('value')
            if name and value:
                # Strip quotes from values
                value = value.strip("'").strip()
                keywords[name] = value

        # Now extract metadata using similar logic to FITS
        if 'RA' in keywords:
            try:
                metadata['ra'] = float(keywords['RA'])
            except ValueError:
                metadata['raStr'] = keywords['RA']
        if 'OBJCTRA' in keywords:
            metadata['raStr'] = keywords['OBJCTRA']

        if 'DEC' in keywords:
            try:
                metadata['dec'] = float(keywords['DEC'])
            except ValueError:
                metadata['decStr'] = keywords['DEC']
        if 'OBJCTDEC' in keywords:
            metadata['decStr'] = keywords['OBJCTDEC']

        if 'OBJECT' in keywords:
            metadata['targetName'] = keywords['OBJECT']

        if 'DATE-OBS' in keywords:
            metadata['captureDate'] = keywords['DATE-OBS']
        elif 'DATE' in keywords:
            metadata['captureDate'] = keywords['DATE']

        if 'EXPTIME' in keywords or 'EXPOSURE' in keywords:
            exp_key = 'EXPTIME' if 'EXPTIME' in keywords else 'EXPOSURE'
            try:
                metadata['exposureTime'] = float(keywords[exp_key])
            except ValueError:
                pass

        if 'NCOMBINE' in keywords or 'STACKCNT' in keywords:
            count_key = 'NCOMBINE' if 'NCOMBINE' in keywords else 'STACKCNT'
            try:
                metadata['exposureCount'] = int(float(keywords[count_key]))
                if 'exposureTime' in metadata:
                    metadata['totalIntegrationTime'] = metadata['exposureTime'] * metadata['exposureCount']
            except ValueError:
                pass

        if 'GAIN' in keywords:
            try:
                metadata['gain'] = float(keywords['GAIN'])
            except ValueError:
                pass
        if 'ISO' in keywords:
            try:
                metadata['iso'] = int(float(keywords['ISO']))
            except ValueError:
                pass
        if 'OFFSET' in keywords:
            try:
                metadata['offset'] = int(float(keywords['OFFSET']))
            except ValueError:
                pass

        if 'CCD-TEMP' in keywords or 'SET-TEMP' in keywords:
            temp_key = 'CCD-TEMP' if 'CCD-TEMP' in keywords else 'SET-TEMP'
            try:
                metadata['temperature'] = float(keywords[temp_key])
            except ValueError:
                pass

        if 'FILTER' in keywords:
            metadata['filter'] = keywords['FILTER']

        if 'TELESCOP' in keywords:
            metadata['telescope'] = keywords['TELESCOP']
        if 'INSTRUME' in keywords or 'CAMERA' in keywords:
            camera_key = 'INSTRUME' if 'INSTRUME' in keywords else 'CAMERA'
            metadata['camera'] = keywords[camera_key]

        if 'FOCALLEN' in keywords:
            try:
                metadata['focalLength'] = float(keywords['FOCALLEN'])
            except ValueError:
                pass
        if 'APTDIA' in keywords:
            try:
                metadata['aperture'] = float(keywords['APTDIA'])
            except ValueError:
                pass
        if 'FOCRATIO' in keywords:
            try:
                metadata['fRatio'] = float(keywords['FOCRATIO'])
            except ValueError:
                pass

        if 'XPIXSZ' in keywords:
            try:
                metadata['pixelSizeX'] = float(keywords['XPIXSZ'])
            except ValueError:
                pass
        if 'YPIXSZ' in keywords:
            try:
                metadata['pixelSizeY'] = float(keywords['YPIXSZ'])
            except ValueError:
                pass
        if 'PIXSIZE' in keywords:
            try:
                metadata['pixelSize'] = float(keywords['PIXSIZE'])
            except ValueError:
                pass

        # Get image dimensions from Image element
        image_elem = root.find('.//{http://www.pixinsight.com/xisf}Image')
        if image_elem is None:
            image_elem = root.find('.//Image')
        if image_elem is not None:
            geometry = image_elem.get('geometry')
            if geometry:
                dims = geometry.split(':')
                if len(dims) >= 2:
                    try:
                        metadata['width'] = int(dims[0])
                        metadata['height'] = int(dims[1])
                    except ValueError:
                        pass

        # Also check NAXIS keywords
        if 'NAXIS1' in keywords:
            try:
                metadata['width'] = int(float(keywords['NAXIS1']))
            except ValueError:
                pass
        if 'NAXIS2' in keywords:
            try:
                metadata['height'] = int(float(keywords['NAXIS2']))
            except ValueError:
                pass

        if 'XBINNING' in keywords:
            try:
                metadata['binningX'] = int(float(keywords['XBINNING']))
            except ValueError:
                pass
        if 'YBINNING' in keywords:
            try:
                metadata['binningY'] = int(float(keywords['YBINNING']))
            except ValueError:
                pass

        if 'SWCREATE' in keywords or 'PROGRAM' in keywords:
            software_key = 'SWCREATE' if 'SWCREATE' in keywords else 'PROGRAM'
            metadata['software'] = keywords[software_key]

        if 'OBSERVER' in keywords:
            metadata['observer'] = keywords['OBSERVER']
        if 'SITELAT' in keywords:
            try:
                metadata['siteLatitude'] = float(keywords['SITELAT'])
            except ValueError:
                pass
        if 'SITELONG' in keywords:
            try:
                metadata['siteLongitude'] = float(keywords['SITELONG'])
            except ValueError:
                pass
        if 'SITEELEV' in keywords:
            try:
                metadata['siteElevation'] = float(keywords['SITEELEV'])
            except ValueError:
                pass

        return metadata

    except Exception as e:
        return {
            'success': False,
            'error': f'Error reading XISF file: {str(e)}'
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

    if ext in ['.fits', '.fit', '.fts']:
        metadata = extract_fits_metadata(file_path)
    elif ext == '.xisf':
        metadata = extract_xisf_metadata(file_path)
    else:
        metadata = {
            'success': False,
            'error': f'Unsupported file type: {ext}'
        }

    # Output JSON to stdout
    print(json.dumps(metadata, indent=2))


if __name__ == '__main__':
    main()
