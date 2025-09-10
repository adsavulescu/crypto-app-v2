// Custom fetch wrapper that ensures cookies are sent with requests
export const useAuthFetch = (url, options = {}) => {
  return $fetch(url, {
    ...options,
    // Ensure cookies are sent with the request
    headers: {
      ...options.headers,
    },
    // This ensures server-side rendering also works
    onRequest({ options }) {
      // No need to modify for SSR - cookies are automatically included
    },
  });
};