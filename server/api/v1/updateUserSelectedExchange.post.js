import {userExchangesSchema} from "~/server/models/userExchanges.schema";
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
    
    if (!data.exchange) {
        throw createError({ 
            statusCode: 400, 
            statusMessage: 'Exchange parameter is required' 
        });
    }

    // Reset all exchanges for this user
    let resp1 = await userExchangesSchema.updateMany(
        {userID: userId}, 
        {isSelectedExchange: false}
    );

    // Set selected exchange
    let resp2 = await userExchangesSchema.findOneAndUpdate(
        {userID: userId, exchange: data.exchange}, 
        {isSelectedExchange: true}
    );

    return {
        data: resp2
    }
})
