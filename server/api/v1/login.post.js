import { 
  verifyPassword, 
  generateAccessToken, 
  generateRefreshToken, 
  setAuthCookies,
  hashPassword
} from '~/server/utils/auth';
import { userSchema } from "~/server/models/user.schema";
import { createError } from 'h3';

export default defineEventHandler(async (event) => {
    const data = await readBody(event);
    
    // Validate input
    if (!data.username || !data.password) {
        throw createError({ 
            statusCode: 400, 
            statusMessage: 'Username and password are required' 
        });
    }
    
    // Find user by username (case-insensitive)
    const user = await userSchema.findOne({ 
        username: { $regex: new RegExp(`^${data.username}$`, 'i') }
    });
    
    // SECURITY: Prevent timing attacks by always performing password hash
    // Even if user doesn't exist, we still do a dummy password comparison
    // This ensures consistent response time regardless of username validity
    if (!user) {
        // Perform dummy password hash to prevent timing attacks
        // This takes the same time as a real password verification
        const dummyHash = '$2b$10$X4kv7j5ZcG39WgogSl16le0kEOxEhNRkDPKmLpGRCKQCwLkC0XzR6'; // Random hash
        await verifyPassword(data.password, dummyHash);
        
        // Log failed login attempt (for security monitoring)
        console.log(`[AUTH] Failed login attempt for username: ${data.username}`);
        
        throw createError({ 
            statusCode: 401, 
            statusMessage: 'Invalid username or password' 
        });
    }
    
    // Check if account is locked
    if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
        const lockTimeRemaining = Math.ceil((user.accountLockedUntil - new Date()) / 1000 / 60);
        throw createError({ 
            statusCode: 403, 
            statusMessage: `Account is locked. Try again in ${lockTimeRemaining} minutes.` 
        });
    }
    
    // Verify password
    const isValidPassword = await verifyPassword(data.password, user.password);
    
    if (!isValidPassword) {
        // Increment failed login attempts
        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
        
        // Lock account after 5 failed attempts
        if (user.failedLoginAttempts >= 5) {
            user.accountLockedUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
            await user.save();
            
            throw createError({ 
                statusCode: 403, 
                statusMessage: 'Account locked due to multiple failed login attempts. Try again in 30 minutes.' 
            });
        }
        
        await user.save();
        
        throw createError({ 
            statusCode: 401, 
            statusMessage: 'Invalid username or password' 
        });
    }
    
    // Reset failed login attempts on successful login
    if (user.failedLoginAttempts > 0) {
        user.failedLoginAttempts = 0;
        user.accountLockedUntil = null;
        await user.save();
    }
    
    // Update last login timestamp
    user.lastLogin = new Date();
    await user.save();
    
    // Generate tokens
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());
    
    // Store refresh token in database (optional but recommended)
    user.refreshToken = refreshToken;
    await user.save();
    
    // Set secure cookies
    console.log('[AUTH] About to set auth cookies...');
    setAuthCookies(event, accessToken, refreshToken);
    console.log('[AUTH] Auth cookies should be set now');
    
    // Log for debugging
    console.log('[AUTH] Login successful for user:', user.username, user._id.toString());
    console.log('[AUTH] Access token generated:', accessToken.substring(0, 20) + '...');
    
    // Return user data (without sensitive information)
    return {
        success: true,
        data: {
            username: user.username,
            userID: user._id,
            email: user.email || null,
            lastLogin: user.lastLogin
        }
    };
})
