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
    
    if (!data.exchange || !data.pair || !data.baseOrderSize) {
        throw createError({ 
            statusCode: 400, 
            statusMessage: 'Exchange, pair, and base order size are required' 
        });
    }

    await nitroApp.DCALib.createBot(data);

    return {
        data: 'OK',
        message: 'DCA bot created successfully'
    }
})
