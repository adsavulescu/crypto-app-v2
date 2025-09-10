import { defineMongooseModel } from '#nuxt/mongoose'

export const userSchema = defineMongooseModel({
    name: 'users',
    schema: {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            minlength: 3,
            maxlength: 20,
            match: /^[a-zA-Z0-9_]+$/
        },
        password: {
            type: String,
            required: true
        },
        email: {
            type: String,
            unique: true,
            sparse: true, // Allows null values while maintaining uniqueness
            trim: true,
            lowercase: true,
            match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        },
        refreshToken: {
            type: String,
            default: null
        },
        failedLoginAttempts: {
            type: Number,
            default: 0
        },
        accountLockedUntil: {
            type: Date,
            default: null
        },
        isActive: {
            type: Boolean,
            default: true
        },
        lastLogin: {
            type: Date,
            default: null
        },
        lastLogout: {
            type: Date,
            default: null
        },
        lastTokenRefresh: {
            type: Date,
            default: null
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: {
            type: Date,
            default: Date.now
        },
        passwordResetToken: {
            type: String,
            default: null
        },
        passwordResetExpires: {
            type: Date,
            default: null
        },
        emailVerified: {
            type: Boolean,
            default: false
        },
        emailVerificationToken: {
            type: String,
            default: null
        },
        twoFactorSecret: {
            type: String,
            default: null
        },
        twoFactorEnabled: {
            type: Boolean,
            default: false
        },
        role: {
            type: String,
            enum: ['user', 'admin', 'moderator'],
            default: 'user'
        },
        ipAddress: {
            type: String,
            default: null
        },
        userAgent: {
            type: String,
            default: null
        }
    },
    options: {
        timestamps: true, // Automatically manage createdAt and updatedAt
    },
    hooks(schema) {
        // Update the updatedAt timestamp before saving
        schema.pre('save', function(next) {
            this.updatedAt = new Date();
            next();
        });
        
        // Create indexes for better query performance
        schema.index({ username: 1 });
        schema.index({ email: 1 });
        schema.index({ createdAt: -1 });
    }
})
