import {userExchangesSchema} from "~/server/models/userExchanges.schema";
import { createError } from 'h3';

export default defineEventHandler(async (event) => {
    const nitroApp = useNitroApp();
    
    // Get userId from authenticated context (set by auth middleware)
    const userId = event.context.userId;
    
    if (!userId) {
        throw createError({ 
            statusCode: 401, 
            statusMessage: 'Authentication required' 
        });
    }
    
    const apiKeys = await userExchangesSchema.find({ userID: userId });

    return {
        data: apiKeys
    }
})
