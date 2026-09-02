import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

/**
 * Uploads an attendance proof document.
 * 
 * IMPORTANT: This is a temporary local-development implementation.
 * In a serverless environment (like Vercel), this filesystem storage is ephemeral.
 * When official office storage infrastructure (e.g., S3) is provided,
 * replace this implementation without changing the frontend or database logic.
 *
 * @param file The File object extracted from FormData
 * @returns The unique relative URL/reference to the stored file
 */
export async function uploadAttendanceProof(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Generate unique filename to prevent overwriting and path traversal
  const uniqueId = crypto.randomUUID();
  // Safe extraction of extension
  let extension = path.extname(file.name);
  if (!extension) {
    if (file.type === 'image/jpeg') extension = '.jpg';
    else if (file.type === 'image/png') extension = '.png';
    else if (file.type === 'application/pdf') extension = '.pdf';
    else extension = '.unknown';
  }
  
  const fileName = `${uniqueId}${extension}`;

  // Use public/uploads/proofs for local compatibility
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'proofs');
  
  // Ensure directory exists
  await fs.mkdir(uploadDir, { recursive: true });

  const filePath = path.join(uploadDir, fileName);
  await fs.writeFile(filePath, buffer);

  // Return the public URL path
  return `/uploads/proofs/${fileName}`;
}
