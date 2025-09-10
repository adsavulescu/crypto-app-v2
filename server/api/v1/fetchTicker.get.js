import { createError } from 'h3';


export default defineEventHandler(async (event) => {
    const nitroApp = useNitroApp();
    const query = getQuery(event);
    
    // Get userId from authenticated context
    const userId = event.context.userId;
    
    if (!userId) {
        throw createError({ 
            statusCode: 401, 
            statusMessage: 'Authentication required' 
        });
    }
    
    if (!query.exchange || !query.symbol) {
        throw createError({ 
            statusCode: 400, 
            statusMessage: 'Exchange and symbol parameters are required' 
        });
    }

    let response = await nitroApp.ccxtw.fetchTicker(userId, query.exchange, query.symbol);

    return {
        data: response.data
    }
})
