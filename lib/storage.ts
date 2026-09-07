import { put } from '@vercel/blob';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

/**
 * Uploads an attendance proof document.
 *
 * Storage Architecture:
 * - Production: When BLOB_READ_WRITE_TOKEN is configured (e.g. Vercel deployment),
 *   uploads to Vercel Blob and returns the permanent absolute URL.
 * - Local development: When BLOB_READ_WRITE_TOKEN is not set,
 *   falls back to the local filesystem (public/uploads/proofs/) and returns a relative path.
 *
 * @param file The File object extracted from FormData
 * @returns The URL / path to the stored proof file
 */
export async function uploadAttendanceProof(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Generate unique filename to prevent overwriting and path traversal
  const uniqueId = crypto.randomUUID();
  let extension = path.extname(file.name);
  if (!extension) {
    if (file.type === 'image/jpeg' || file.type === 'image/jpg') extension = '.jpg';
    else if (file.type === 'image/png') extension = '.png';
    else if (file.type === 'application/pdf') extension = '.pdf';
    else extension = '.bin';
  }

  const fileName = `${uniqueId}${extension}`;

  // 1. Production Storage: Vercel Blob
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`proofs/${fileName}`, buffer, {
      access: 'public',
      contentType: file.type || 'application/octet-stream',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return blob.url;
  }

  // 2. Local Development Fallback: Local filesystem storage
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'proofs');
  await fs.mkdir(uploadDir, { recursive: true });

  const filePath = path.join(uploadDir, fileName);
  await fs.writeFile(filePath, buffer);

  return `/uploads/proofs/${fileName}`;
}
