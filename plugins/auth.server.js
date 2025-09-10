// Server-side plugin to forward cookies during SSR
export default defineNuxtPlugin((nuxtApp) => {
  // During SSR, we need to forward cookies from the incoming request to API calls
  nuxtApp.$fetch = $fetch.create({
    onRequest({ options }) {
      // Get the incoming request headers
      const headers = useRequestHeaders(['cookie']);
      
      // Merge the cookie header with any existing headers
      if (headers.cookie) {
        options.headers = {
          ...options.headers,
          cookie: headers.cookie
        };
      }
    }
  });
});