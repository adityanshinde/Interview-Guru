/**
 * API Configuration
 * Automatically detects environment and sets correct API URL
 */

export const getAPIUrl = (): string => {
  // Default to same-origin so Vercel rewrites and local dev proxy handle /api.
  // Optional override remains available for advanced deployments.
  return process.env.VITE_API_URL || '';
};

export const API_URL = getAPIUrl();

/**
 * Helper to build full API URL
 * Usage: apiCall(`${API_ENDPOINT}/analyze`)
 */
export const API_ENDPOINT = (path: string): string => {
  const baseUrl = API_URL;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};
