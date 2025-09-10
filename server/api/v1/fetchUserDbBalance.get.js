import { balanceSchema } from "~/server/models/balance.schema";
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
    
    if (!query.exchange) {
        throw createError({ 
            statusCode: 400, 
            statusMessage: 'Exchange parameter is required' 
        });
    }

    const response = await balanceSchema.find({ 
        userID: userId, 
        exchange: query.exchange 
    });

    return {
        data: response
    }
})
