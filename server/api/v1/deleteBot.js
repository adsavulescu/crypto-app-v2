// server/api/v1/deleteBot.js
import { dcaBotSchema } from '~/server/models/dcaBot.schema';

export default defineEventHandler(async (event) => {
    const { botId } = await readBody(event);

    if (!botId) {
        throw createError({ statusCode: 400, statusMessage: 'Missing botId parameter' });
    }

    try {
        // Find the bot first to check if it has an active deal
        const bot = await dcaBotSchema.findById(botId);
        
        if (!bot) {
            throw createError({ statusCode: 404, statusMessage: 'Bot not found' });
        }
        
        // Check if bot has an active deal that's not in START_NEW_DEAL state
        if (bot.activeDeal && bot.activeDeal.status !== 'START_NEW_DEAL') {
            // Check if there are open orders
            const hasOpenOrders = bot.activeDeal.baseOrder || 
                                 bot.activeDeal.safetyOrder || 
                                 bot.activeDeal.takeProfitOrder || 
                                 bot.activeDeal.stopLossOrder;
            
            if (hasOpenOrders) {
                throw createError({ 
                    statusCode: 400, 
                    statusMessage: 'Cannot delete bot with active orders. Please stop the bot and wait for the deal to complete.' 
                });
            }
        }
        
        // Delete the bot
        await dcaBotSchema.findByIdAndDelete(botId);
        
        return { 
            success: true, 
            message: 'Bot deleted successfully.'
        };
    } catch (error) {
        console.error('Error deleting bot:', error);
        
        // Re-throw if it's already a createError
        if (error.statusCode) {
            throw error;
        }
        
        throw createError({ statusCode: 500, statusMessage: 'Failed to delete bot' });
    }
});