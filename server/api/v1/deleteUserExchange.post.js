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
    
    if (!data.id) {
        throw createError({ 
            statusCode: 400, 
            statusMessage: 'Exchange ID is required' 
        });
    }
    
    // Verify ownership before deleting
    const exchange = await userExchangesSchema.findOne({
        _id: data.id,
        userID: userId
    });
    
    if (!exchange) {
        throw createError({ 
            statusCode: 404, 
            statusMessage: 'Exchange not found or access denied' 
        });
    }

    let resp = await userExchangesSchema.findByIdAndDelete(data.id);

    return {
        data: resp,
        message: 'Exchange deleted successfully'
    }
})
