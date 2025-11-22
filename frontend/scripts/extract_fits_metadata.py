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
    """Extract metadata from XISF file (XML-based format)"""
    try:
        # XISF files are XML-based
        tree = ET.parse(file_path)
        root = tree.getroot()

        metadata = {
            'fileType': 'XISF',
            'success': True,
        }

        # XISF stores metadata in FITSKeyword elements
        fits_keywords = root.findall('.//{http://www.pixinsight.com/xisf}FITSKeyword')

        # Build a dictionary of FITS keywords
        keywords = {}
        for keyword in fits_keywords:
            name = keyword.get('name')
            value = keyword.get('value')
            if name and value:
                keywords[name] = value

        # Now extract metadata using similar logic to FITS
        if 'RA' in keywords:
            try:
                metadata['ra'] = float(keywords['RA'])
            except ValueError:
                metadata['raStr'] = keywords['RA']

        if 'DEC' in keywords:
            try:
                metadata['dec'] = float(keywords['DEC'])
            except ValueError:
                metadata['decStr'] = keywords['DEC']

        if 'OBJECT' in keywords:
            metadata['targetName'] = keywords['OBJECT']

        if 'DATE-OBS' in keywords:
            metadata['captureDate'] = keywords['DATE-OBS']
        elif 'DATE' in keywords:
            metadata['captureDate'] = keywords['DATE']

        if 'EXPTIME' in keywords or 'EXPOSURE' in keywords:
            exp_key = 'EXPTIME' if 'EXPTIME' in keywords else 'EXPOSURE'
            metadata['exposureTime'] = float(keywords[exp_key])

        if 'NCOMBINE' in keywords or 'STACKCNT' in keywords:
            count_key = 'NCOMBINE' if 'NCOMBINE' in keywords else 'STACKCNT'
            metadata['exposureCount'] = int(keywords[count_key])
            if 'exposureTime' in metadata:
                metadata['totalIntegrationTime'] = metadata['exposureTime'] * metadata['exposureCount']

        if 'GAIN' in keywords:
            metadata['gain'] = float(keywords['GAIN'])
        if 'ISO' in keywords:
            metadata['iso'] = int(keywords['ISO'])
        if 'OFFSET' in keywords:
            metadata['offset'] = int(keywords['OFFSET'])

        if 'CCD-TEMP' in keywords or 'SET-TEMP' in keywords:
            temp_key = 'CCD-TEMP' if 'CCD-TEMP' in keywords else 'SET-TEMP'
            metadata['temperature'] = float(keywords[temp_key])

        if 'FILTER' in keywords:
            metadata['filter'] = keywords['FILTER']

        if 'TELESCOP' in keywords:
            metadata['telescope'] = keywords['TELESCOP']
        if 'INSTRUME' in keywords or 'CAMERA' in keywords:
            camera_key = 'INSTRUME' if 'INSTRUME' in keywords else 'CAMERA'
            metadata['camera'] = keywords[camera_key]

        if 'FOCALLEN' in keywords:
            metadata['focalLength'] = float(keywords['FOCALLEN'])
        if 'APTDIA' in keywords:
            metadata['aperture'] = float(keywords['APTDIA'])
        if 'FOCRATIO' in keywords:
            metadata['fRatio'] = float(keywords['FOCRATIO'])

        if 'XPIXSZ' in keywords:
            metadata['pixelSizeX'] = float(keywords['XPIXSZ'])
        if 'YPIXSZ' in keywords:
            metadata['pixelSizeY'] = float(keywords['YPIXSZ'])
        if 'PIXSIZE' in keywords:
            metadata['pixelSize'] = float(keywords['PIXSIZE'])

        # Get image dimensions from Image element
        image_elem = root.find('.//{http://www.pixinsight.com/xisf}Image')
        if image_elem is not None:
            geometry = image_elem.get('geometry')
            if geometry:
                dims = geometry.split(':')
                if len(dims) >= 2:
                    metadata['width'] = int(dims[0])
                    metadata['height'] = int(dims[1])

        if 'XBINNING' in keywords:
            metadata['binningX'] = int(keywords['XBINNING'])
        if 'YBINNING' in keywords:
            metadata['binningY'] = int(keywords['YBINNING'])

        if 'SWCREATE' in keywords or 'PROGRAM' in keywords:
            software_key = 'SWCREATE' if 'SWCREATE' in keywords else 'PROGRAM'
            metadata['software'] = keywords[software_key]

        if 'OBSERVER' in keywords:
            metadata['observer'] = keywords['OBSERVER']
        if 'SITELAT' in keywords:
            metadata['siteLatitude'] = float(keywords['SITELAT'])
        if 'SITELONG' in keywords:
            metadata['siteLongitude'] = float(keywords['SITELONG'])
        if 'SITEELEV' in keywords:
            metadata['siteElevation'] = float(keywords['SITEELEV'])

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
