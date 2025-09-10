import { createError } from 'h3';

export default defineEventHandler(async (event) => {
    const nitroApp = useNitroApp();
    const data = await readBody(event);
    
    // Get userId from authenticated context (set by auth middleware)
    const userId = event.context.userId;
    
    if (!userId) {
        throw createError({ 
            statusCode: 401, 
            statusMessage: 'Authentication required' 
        });
    }
    
    // Validate required parameters
    if (!data.exchange || !data.symbol || !data.type || !data.side || !data.amount) {
        throw createError({ 
            statusCode: 400, 
            statusMessage: 'Missing required order parameters' 
        });
    }

    let response = await nitroApp.ccxtw.createOrder(
        userId,  // Use authenticated userId instead of data.userID
        data.exchange, 
        data.symbol, 
        data.type, 
        data.side, 
        data.amount, 
        data.price
    );

    return response;
})
