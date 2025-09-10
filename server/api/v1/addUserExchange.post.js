import {userExchangesSchema} from "~/server/models/userExchanges.schema";
import {dcaBotSchema} from "~/server/models/dcaBot.schema";
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

    //set rest of exchanges as not selected
    await userExchangesSchema.updateMany({userID:userId}, {isSelectedExchange:false});

    //get exchange instance
    let exchangeInstance = await nitroApp.ccxtw.fetchExchangeInstance(data.exchange, data.apiKeys);

    //create new
    let newUserExchange = {
        userID: userId,
        exchange: data.exchange,
        timeframes:exchangeInstance.timeframes,
        isSelectedExchange:true,
        markets:[],
        selectedMarket:'',
        apiKeys:data.apiKeys,
    };

    //push data to db
    let newUserResp = await new userExchangesSchema(newUserExchange).save()

    //get exchange markets
    const marketsRaw = await $fetch('/api/v1/fetchMarkets', {
        query:{
            exchange:data.exchange,
        },
        headers: {
            cookie: event.node.req.headers.cookie  // Pass cookies for auth
        }
    });

    //format markets
    let markets = [];
    const processedMarkets = new Set();

    for (let i = 0; i < marketsRaw.data.length; i++) {
        let key = `${marketsRaw.data[i].base}/${marketsRaw.data[i].quote}`;

        if (marketsRaw.data[i].active && !processedMarkets.has(key)) {
            processedMarkets.add(key);

            markets.push({
                base:marketsRaw.data[i].base,
                quote:marketsRaw.data[i].quote,
                type:(marketsRaw.data[i].type === 'spot') ? 'spot' : 'futures',
                limits: marketsRaw.data[i].limits,
                precision:marketsRaw.data[i].precision,
                maker:marketsRaw.data[i].maker,
                taker:marketsRaw.data[i].taker,
            });
        }
    }


    //update user data to db
    await userExchangesSchema.updateOne({ userID:userId, exchange:data.exchange }, {
        markets:markets,
        selectedMarket:markets[0],
    });

    return {
        data: {
            id: userId,
            exchange: data.exchange,
            apiKeys: data.apiKeys,
        }
    }
})


