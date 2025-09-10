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
    
    if (!data.exchange || !data.id || !data.symbol) {
        throw createError({ 
            statusCode: 400, 
            statusMessage: 'Exchange, order ID, and symbol are required' 
        });
    }

    let response = await nitroApp.ccxtw.cancelOrder(userId, data.exchange, data.id, data.symbol);

    return {
        data: response.data
    }
})
