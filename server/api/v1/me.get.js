import { userSchema } from "~/server/models/user.schema";
import { createError } from 'h3';

export default defineEventHandler(async (event) => {
    // Get userId from authenticated context
    const userId = event.context.userId;
    
    if (!userId) {
        throw createError({ 
            statusCode: 401, 
            statusMessage: 'Authentication required' 
        });
    }
    
    // Find the user
    const user = await userSchema.findById(userId).select('-password -refreshToken');
    
    if (!user) {
        throw createError({ 
            statusCode: 404, 
            statusMessage: 'User not found' 
        });
    }
    
    return {
        data: {
            id: user._id,
            username: user.username,
            email: user.email || null
        }
    };
});