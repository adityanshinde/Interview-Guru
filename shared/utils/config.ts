/**
 * API Configuration
 * Automatically detects environment and sets correct API URL
 */

export const getAPIUrl = (): string => {
  // Development mode (localhost)
  if (process.env.NODE_ENV === 'development') {
    return '';
  }

  // Production mode (Vercel or any deployed backend)
  const productionUrl = process.env.REACT_APP_API_URL || 'https://interview-guru-smoky.vercel.app';
  return productionUrl;
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
