import { 
  verifyRefreshToken, 
  generateAccessToken, 
  generateRefreshToken,
  setAuthCookies 
} from '~/server/utils/auth';
import { userSchema } from "~/server/models/user.schema";
import { createError, getCookie } from 'h3';

export default defineEventHandler(async (event) => {
    // Get refresh token from cookie
    const refreshToken = getCookie(event, 'refresh-token');
    
    if (!refreshToken) {
        throw createError({ 
            statusCode: 401, 
            statusMessage: 'No refresh token provided' 
        });
    }
    
    try {
        // Verify the refresh token
        const decoded = verifyRefreshToken(refreshToken);
        
        // Find the user
        const user = await userSchema.findById(decoded.userId);
        
        if (!user) {
            throw createError({ 
                statusCode: 401, 
                statusMessage: 'User not found' 
            });
        }
        
        // Check if the refresh token matches the one stored in database
        if (user.refreshToken !== refreshToken) {
            // Possible token theft - invalidate all tokens
            user.refreshToken = null;
            await user.save();
            
            console.warn(`[AUTH] Refresh token mismatch for user ${user._id}. Possible token theft.`);
            
            throw createError({ 
                statusCode: 401, 
                statusMessage: 'Invalid refresh token' 
            });
        }
        
        // Check if user account is active
        if (!user.isActive) {
            throw createError({ 
                statusCode: 403, 
                statusMessage: 'Account is deactivated' 
            });
        }
        
        // Generate new tokens
        const newAccessToken = generateAccessToken(user._id.toString());
        const newRefreshToken = generateRefreshToken(user._id.toString());
        
        // Update refresh token in database (token rotation)
        user.refreshToken = newRefreshToken;
        user.lastTokenRefresh = new Date();
        await user.save();
        
        // Set new cookies
        setAuthCookies(event, newAccessToken, newRefreshToken);
        
        // Log token refresh
        console.log(`[AUTH] Tokens refreshed for user: ${user.username} (${user._id})`);
        
        // Return success response
        return {
            success: true,
            data: {
                username: user.username,
                userID: user._id,
                email: user.email || null,
                message: 'Tokens refreshed successfully'
            }
        };
        
    } catch (error) {
        // If refresh token is expired or invalid
        if (error.statusCode === 401) {
            throw error;
        }
        
        console.error('[AUTH] Token refresh error:', error);
        throw createError({ 
            statusCode: 401, 
            statusMessage: 'Failed to refresh tokens' 
        });
    }
});