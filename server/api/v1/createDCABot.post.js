import { createError } from 'h3';

export default defineEventHandler(async (event) => {
    const nitroApp = useNitroApp();
    const data = await readBody(event);
    
    // Get userId from authenticated context
    const userId = event.context.userId;
    
    if (!userId) {
        throw createError({ 
            statusCode: 401, 
            statusMessage: 'Authentication required' 
        });
    }
    
    // Override userID with authenticated userId for security
    data.userID = userId;
    
    if (!data.exchange || !data.symbol || !data.baseOrderAmount) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Exchange, symbol, and base order amount are required'
        });
    }

    await nitroApp.DCALib.createBot(data);

    return {
        data: 'OK',
        message: 'DCA bot created successfully'
    }
})
