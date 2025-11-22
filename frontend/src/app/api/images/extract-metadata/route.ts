import { NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  let tempFilePath: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    const validExtensions = ['.fits', '.fit', '.fts', '.xisf'];
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

    if (!hasValidExtension) {
      return NextResponse.json(
        { error: 'Invalid file type. Only FITS (.fits, .fit, .fts) and XISF (.xisf) files are supported.' },
        { status: 400 }
      );
    }

    // Convert file to buffer and save temporarily
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create temp file path
    const ext = fileName.substring(fileName.lastIndexOf('.'));
    tempFilePath = join(tmpdir(), `${randomUUID()}${ext}`);

    // Write file to temp location
    await writeFile(tempFilePath, buffer);

    // Call Python script to extract metadata
    const scriptPath = join(process.cwd(), 'scripts', 'extract_fits_metadata.py');

    try {
      const { stdout, stderr } = await execAsync(`python3 "${scriptPath}" "${tempFilePath}"`);

      if (stderr) {
        console.error('Python script stderr:', stderr);
      }

      // Parse JSON output from Python script
      const metadata = JSON.parse(stdout);

      // Clean up temp file
      if (tempFilePath) {
        await unlink(tempFilePath);
        tempFilePath = null;
      }

      if (!metadata.success) {
        return NextResponse.json(
          { error: metadata.error || 'Failed to extract metadata' },
          { status: 500 }
        );
      }

      return NextResponse.json(metadata);
    } catch (pythonError) {
      console.error('Error executing Python script:', pythonError);

      // Check if it's a missing dependency error
      if (pythonError instanceof Error && pythonError.message.includes('astropy')) {
        return NextResponse.json(
          {
            error: 'Python dependencies not installed',
            details: 'Please install required packages: pip install astropy',
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          error: 'Failed to extract metadata from file',
          details: pythonError instanceof Error ? pythonError.message : String(pythonError),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing file:', error);

    // Clean up temp file if it exists
    if (tempFilePath) {
      try {
        await unlink(tempFilePath);
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError);
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to process file',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
