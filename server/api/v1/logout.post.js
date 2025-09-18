import { clearAuthCookies } from '~/server/utils/auth';
import { userSchema } from "~/server/models/user.schema";

export default defineEventHandler(async (event) => {
    try {
        // Get userId from authenticated context
        const userId = event.context.userId;
        
        if (userId) {
            // Clear the refresh token from database
            await userSchema.updateOne(
                { _id: userId },
                { 
                    $set: { 
                        refreshToken: null,
                        lastLogout: new Date()
                    }
                }
            );
            
            // console.log(`[AUTH] User logged out: ${userId}`);
        }
        
        // Clear all auth cookies
        clearAuthCookies(event);
        
        return {
            success: true,
            message: 'Logged out successfully'
        };
        
    } catch (error) {
        console.error('[AUTH] Logout error:', error);
        
        // Even if there's an error, clear the cookies
        clearAuthCookies(event);
        
        return {
            success: true,
            message: 'Logged out'
        };
    }
});