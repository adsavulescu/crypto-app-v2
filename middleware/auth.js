export default defineNuxtRouteMiddleware(async (to, from) => {
    // Check for auth-check cookie (readable by JavaScript)
    // The actual JWT tokens are httpOnly for security
    const authCheck = useCookie('auth-check');
    
    // Get all cookies for debugging (only on client side)
    const allCookies = process.client ? document.cookie : 'SSR - no document';
    
    console.log('[AUTH MIDDLEWARE] Checking route:', to.path);
    console.log('[AUTH MIDDLEWARE] Auth check cookie value:', authCheck.value);
    console.log('[AUTH MIDDLEWARE] Auth check cookie type:', typeof authCheck.value);
    console.log('[AUTH MIDDLEWARE] All cookies:', allCookies);
    console.log('[AUTH MIDDLEWARE] Running on:', process.client ? 'CLIENT' : 'SERVER');
    
    // If no authentication exists (check for both string and boolean true)
    if (!authCheck.value || (authCheck.value !== 'true' && authCheck.value !== true)) {
        // Avoid redirect loop - don't redirect if already on login/register/home
        if (to.path !== '/login' && to.path !== '/register' && to.path !== '/') {
            console.log('[AUTH MIDDLEWARE] Not authenticated, redirecting to login from:', to.path);
            console.log('[AUTH MIDDLEWARE] Auth check failed because:', !authCheck.value ? 'no value' : `value is ${authCheck.value} (type: ${typeof authCheck.value})`);
            return navigateTo('/login');
        }
    } else {
        console.log('[AUTH MIDDLEWARE] User authenticated, allowing access to:', to.path);
    }
    
    // The server middleware will handle actual JWT token verification
})
