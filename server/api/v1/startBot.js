import { createError } from 'h3';

// server/api/v1/startBot.js
import { dcaBotSchema } from '~/server/models/dcaBot.schema';

export default defineEventHandler(async (event) => {
    const { botId } = await readBody(event);
    
    // Get userId from authenticated context
    const userId = event.context.userId;
    
    if (!userId) {
        throw createError({ 
            statusCode: 401, 
            statusMessage: 'Authentication required' 
        });
    }

    if (!botId) {
        throw createError({ statusCode: 400, statusMessage: 'Missing botId parameter' });
    }

    try {
        // Find the bot and verify ownership
        const bot = await dcaBotSchema.findOne({ _id: botId, userID: userId });
        
        if (!bot) {
            throw createError({ 
                statusCode: 404, 
                statusMessage: 'Bot not found or access denied' 
            });
        }

        // Set isRunning to true
        bot.isRunning = true;
        
        // Add a log entry
        const log = `${new Date().toISOString()}: Bot started by user.`;
        bot.logs.push(log);
        
        // Reset the deal status if needed
        if (!bot.activeDeal || !bot.activeDeal.status) {
            bot.activeDeal = {
                status: 'START_NEW_DEAL',
                baseOrder: null,
                safetyOrder: null,
                takeProfitOrder: null,
                stopLossOrder: null,
                filledOrders: [],
                profit: 0,
                detectedDirection: null,
                waitingForEntry: false,
                waitStartTime: null
            };
        }
        
        await bot.save();
        
        return { 
            success: true, 
            message: 'Bot started successfully.'
        };
    } catch (error) {
        console.error('Error starting bot:', error);
        throw createError({ statusCode: 500, statusMessage: 'Failed to start bot' });
    }
});