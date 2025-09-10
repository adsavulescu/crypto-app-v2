import { createError } from 'h3';

// server/api/v1/stopBot.js
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

        // Set isRunning to false - this prevents new deals from starting
        // But allows current deal to finish gracefully
        bot.isRunning = false;
        
        // Add a log entry
        const log = `${new Date().toISOString()}: Bot stopped by user. Current deal will complete if active.`;
        bot.logs.push(log);
        
        // Check current deal status
        const hasActiveDeal = bot.activeDeal && 
                            bot.activeDeal.status && 
                            bot.activeDeal.status !== 'START_NEW_DEAL' && 
                            bot.activeDeal.status !== 'BOT_STOPPED' &&
                            bot.activeDeal.status !== 'CLOSED_DEAL';
        
        if (hasActiveDeal) {
            // Has active orders or positions
            const hasOpenOrders = bot.activeDeal.baseOrder || 
                                 bot.activeDeal.safetyOrder || 
                                 bot.activeDeal.takeProfitOrder || 
                                 bot.activeDeal.stopLossOrder;
            
            const hasPosition = bot.activeDeal.filledOrders && bot.activeDeal.filledOrders.length > 0;
            
            if (hasOpenOrders || hasPosition) {
                bot.logs.push(`${new Date().toISOString()}: Active deal in progress (${bot.activeDeal.status}), will complete before fully stopping.`);
                if (hasPosition) {
                    bot.logs.push(`${new Date().toISOString()}: Open position with ${bot.activeDeal.filledOrders.length} filled orders.`);
                }
            }
        } else {
            // No active deal, mark as stopped
            bot.activeDeal.status = 'BOT_STOPPED';
            bot.logs.push(`${new Date().toISOString()}: No active deal, bot stopped immediately.`);
        }
        
        await bot.save();
        
        return { 
            success: true, 
            message: bot.activeDeal && bot.activeDeal.status !== 'START_NEW_DEAL' 
                ? 'Bot stopping. Current deal will complete first.' 
                : 'Bot stopped successfully.'
        };
    } catch (error) {
        console.error('Error stopping bot:', error);
        throw createError({ statusCode: 500, statusMessage: 'Failed to stop bot' });
    }
});