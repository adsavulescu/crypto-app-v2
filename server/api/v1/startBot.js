// server/api/v1/startBot.js
import { dcaBotSchema } from '~/server/models/dcaBot.schema';

export default defineEventHandler(async (event) => {
    const { botId } = await readBody(event);

    if (!botId) {
        throw createError({ statusCode: 400, statusMessage: 'Missing botId parameter' });
    }

    try {
        // Find the bot
        const bot = await dcaBotSchema.findById(botId);
        
        if (!bot) {
            throw createError({ statusCode: 404, statusMessage: 'Bot not found' });
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