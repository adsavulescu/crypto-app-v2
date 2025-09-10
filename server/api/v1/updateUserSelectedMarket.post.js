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
    
    if (!data.exchange || !data.market) {
        throw createError({ 
            statusCode: 400, 
            statusMessage: 'Exchange and market parameters are required' 
        });
    }

    // Get user exchange
    let userExchange = await userExchangesSchema.findOne({
        userID: userId, 
        exchange: data.exchange
    });
    
    if (!userExchange) {
        throw createError({ 
            statusCode: 404, 
            statusMessage: 'Exchange not found for user' 
        });
    }

    // Update selected market data by symbol
    for (let i = 0; i < userExchange.markets.length; i++) {
        if (userExchange.markets[i].base === data.market.split('/')[0] && 
            userExchange.markets[i].quote === data.market.split('/')[1]) {
            
            let resp = await userExchangesSchema.findOneAndUpdate(
                {userID: userId, exchange: data.exchange}, 
                {selectedMarket: userExchange.markets[i]}
            );

            return {
                data: resp
            }
        }
    }
    
    throw createError({ 
        statusCode: 404, 
        statusMessage: 'Market not found' 
    });
})
