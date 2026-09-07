export const MAX_PROOF_FILE_SIZE = 1 * 1024 * 1024; // 1 MB

export const ALLOWED_PROOF_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
] as const;

export const ALLOWED_PROOF_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf'] as const;

export interface ProofValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates an attendance proof file for existence, size, MIME type, and extension.
 * Enforced strictly server-side as the final authority.
 */
export function validateProofFile(
  file: { size: number; type: string; name?: string } | null | undefined
): ProofValidationResult {
  if (!file || file.size === 0) {
    return {
      valid: false,
      error: 'Bukti wajib diunggah untuk pengajuan IZIN atau SAKIT.',
    };
  }

  if (file.size > MAX_PROOF_FILE_SIZE) {
    return {
      valid: false,
      error: 'Ukuran file maksimal 1 MB.',
    };
  }

  const normalizedType = file.type.toLowerCase().trim();
  const isAllowedMime = (ALLOWED_PROOF_MIME_TYPES as readonly string[]).includes(normalizedType);
  if (!isAllowedMime) {
    return {
      valid: false,
      error: 'Format bukti harus berupa JPG, JPEG, PNG, atau PDF.',
    };
  }

  if (file.name) {
    const lastDotIndex = file.name.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return {
        valid: false,
        error: 'Format bukti harus berupa JPG, JPEG, PNG, atau PDF.',
      };
    }
    const ext = file.name.slice(lastDotIndex).toLowerCase().trim();
    const isAllowedExt = (ALLOWED_PROOF_EXTENSIONS as readonly string[]).includes(ext);
    if (!isAllowedExt) {
      return {
        valid: false,
        error: 'Format bukti harus berupa JPG, JPEG, PNG, atau PDF.',
      };
    }
  }

  return { valid: true };
}
