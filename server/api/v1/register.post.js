import { 
  hashPassword, 
  validatePassword,
  generateAccessToken, 
  generateRefreshToken,
  setAuthCookies 
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
    
    // Validate username format
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(data.username)) {
        throw createError({ 
            statusCode: 400, 
            statusMessage: 'Username must be 3-20 characters and contain only letters, numbers, and underscores' 
        });
    }
    
    // Validate password strength
    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.isValid) {
        throw createError({ 
            statusCode: 400, 
            statusMessage: `Password validation failed: ${passwordValidation.errors.join(', ')}` 
        });
    }
    
    // Validate email if provided
    if (data.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            throw createError({ 
                statusCode: 400, 
                statusMessage: 'Invalid email format' 
            });
        }
    }
    
    // Check if username already exists (case-insensitive)
    const existingUser = await userSchema.findOne({ 
        username: { $regex: new RegExp(`^${data.username}$`, 'i') }
    });
    
    if (existingUser) {
        throw createError({ 
            statusCode: 409, 
            statusMessage: 'Username already exists' 
        });
    }
    
    // Check if email already exists (if provided)
    if (data.email) {
        const existingEmail = await userSchema.findOne({ 
            email: { $regex: new RegExp(`^${data.email}$`, 'i') }
        });
        
        if (existingEmail) {
            throw createError({ 
                statusCode: 409, 
                statusMessage: 'Email already registered' 
            });
        }
    }
    
    // Hash the password
    const hashedPassword = await hashPassword(data.password);
    
    // Create new user
    const user = new userSchema({ 
        username: data.username, 
        password: hashedPassword,
        email: data.email || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        failedLoginAttempts: 0,
        accountLockedUntil: null,
        lastLogin: null,
        isActive: true
    });
    
    try {
        await user.save();
    } catch (error) {
        console.error('[AUTH] Registration error:', error);
        throw createError({ 
            statusCode: 500, 
            statusMessage: 'Failed to create user account' 
        });
    }
    
    // Generate tokens
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());
    
    // Store refresh token in database
    user.refreshToken = refreshToken;
    await user.save();
    
    // Set secure cookies
    setAuthCookies(event, accessToken, refreshToken);
    
    // Log successful registration
    console.log(`[AUTH] New user registered: ${user.username} (${user._id})`);
    
    // Return success response (without sensitive information)
    return {
        success: true,
        data: {
            username: user.username,
            userID: user._id,
            email: user.email || null,
            createdAt: user.createdAt
        }
    };
})
