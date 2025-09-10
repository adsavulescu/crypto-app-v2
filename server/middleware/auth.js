import { verifyAccessToken, extractUserFromEvent } from '../utils/auth';
import { createError, getCookie } from 'h3';

// List of public endpoints that don't require authentication
const publicEndpoints = [
  '/api/v1/login',
  '/api/v1/register',
  '/api/v1/refresh',
  '/api/v1/logout',  // Logout handles its own auth
  '/api/v1/fetchCCXTExchanges'
];

export default defineEventHandler(async (event) => {
  // Only check API routes
  if (!event.node.req.url?.startsWith('/api/')) {
    return;
  }
  
  // Get the endpoint path
  const url = event.node.req.url.split('?')[0];
  
  // Skip authentication for public endpoints
  if (publicEndpoints.includes(url)) {
    return;
  }
  
  // Skip if not an API v1 endpoint
  if (!url.startsWith('/api/v1/')) {
    return;
  }
  
  try {
    // Extract and verify the access token
    const token = getCookie(event, 'access-token');
    
    // Debug logging
    console.log(`[AUTH] Checking auth for ${url}, token present:`, !!token);
    if (token) {
      console.log('[AUTH] Token preview:', token.substring(0, 20) + '...');
    }
    
    if (!token) {
      throw createError({ 
        statusCode: 401, 
        statusMessage: 'Authentication required' 
      });
    }
    
    // Verify the token and extract user information
    const decoded = verifyAccessToken(token);
    
    // Attach user information to the event context
    event.context.userId = decoded.userId;
    event.context.authenticated = true;
    
  } catch (error) {
    // No legacy support - authentication must use JWT tokens only
    throw createError({ 
      statusCode: 401, 
      statusMessage: error.statusMessage || 'Invalid or expired token' 
    });
  }
});