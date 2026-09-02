/**
 * Helper to safely resolve the proof file URL.
 * If the URL is already absolute (http:// or https://), it returns it as is.
 * If the URL is relative, it optionally prepends APP_URL to form a full path, 
 * or returns it as-is so the browser can resolve it relative to the current domain.
 */
export function resolveProofUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || '';
  
  if (!appUrl) {
    // Fallback: If no APP_URL is defined, return the relative path 
    // ensuring it starts with a slash
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }

  // Safely concatenate without double slashes
  const baseUrl = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl;
  const pathPart = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  return `${baseUrl}${pathPart}`;
}
