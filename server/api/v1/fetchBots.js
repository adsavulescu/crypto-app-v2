import { createError } from 'h3';

// server/api/v1/fetchBots.js
import { dcaBotSchema } from '~/server/models/dcaBot.schema';

export default defineEventHandler(async (event) => {
    // Get userId from authenticated context
    const userId = event.context.userId;
    
    if (!userId) {
        throw createError({ 
            statusCode: 401, 
            statusMessage: 'Authentication required' 
        });
    }

    try {
        const bots = await dcaBotSchema.find({ userID: userId });
        return { data: bots };
    } catch (error) {
        console.error('[API] Failed to fetch bots:', error);
        throw createError({ 
            statusCode: 500, 
            statusMessage: 'Failed to fetch bots' 
        });
    }
});
