import { createError } from 'h3';


export default defineEventHandler(async (event) => {
    const nitroApp = useNitroApp();
    const query = getQuery(event);
    
    // Get userId from authenticated context (set by auth middleware)
    const userId = event.context.userId;
    
    if (!userId) {
        throw createError({ 
            statusCode: 401, 
            statusMessage: 'Authentication required' 
        });
    }
    
    // Exchange still comes from query parameters
    if (!query.exchange) {
        throw createError({ 
            statusCode: 400, 
            statusMessage: 'Exchange parameter is required' 
        });
    }

    let response = await nitroApp.ccxtw.fetchBalance(userId, query.exchange);

    return {
        data: response.data
    }
})
