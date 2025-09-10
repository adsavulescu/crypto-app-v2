import { setIntervalAsync } from "set-interval-async"
import { userExchangesSchema } from "~/server/models/userExchanges.schema";
import { balanceSchema } from "~/server/models/balance.schema";
import { create, all } from 'mathjs';
const config = {
    number: 'BigNumber',
    precision: 20
}
const math = create(all, config);

export default defineNitroPlugin((nitroApp) => {
    startScheduler(nitroApp)
    // console.log('Balance Engine Loaded...')
})

function startScheduler(nitroApp) {
    setIntervalAsync(async () => {

        //get user exchanges
        const exchanges = await userExchangesSchema.find({ });

        if (exchanges.length) {
            for (let i = 0; i < exchanges.length; i++) {

                let currentExchange = exchanges[i].exchange;
                let userID = exchanges[i].userID;


                // Call ccxtw directly instead of going through the API
                // since this is a server-side background task
                const balanceResponse = await nitroApp.ccxtw.fetchBalance(userID, currentExchange);
                const balance = { data: balanceResponse.data };

                if (balance.data) {
                    let newBalance = [];
                    let total = 0;

                    for (const coin in balance.data.total) {
                        if (balance.data.total[coin] !== 0) {

                            let usdtVal = 0;

                            // Call ccxtw directly instead of going through the API
                            // since this is a server-side background task
                            const ticker = await nitroApp.ccxtw.fetchTicker(userID, currentExchange, `${coin}/USDT`);

                            if (ticker.data){
                                usdtVal = math.evaluate(`${balance.data.total[coin]} * ${ticker.data.last}`).toFixed(2);
                                total = math.evaluate(`${total} + ${usdtVal}`);
                            } else {
                                if (coin === 'USDT') {
                                    usdtVal = balance.data.total[coin].toFixed(2);
                                }
                                total = math.evaluate(`${total} + ${usdtVal}`);
                            }

                            // console.log('processing coin: ', coin, balance.data.total[coin], usdtVal);

                            newBalance.push({
                                coin:coin,
                                free:balance.data.free[coin],
                                used:balance.data.used[coin],
                                total:balance.data.total[coin],
                                usdt:usdtVal
                            });
                        }
                    }

                    await new balanceSchema({
                        userID:userID,
                        exchange:currentExchange,
                        balance:newBalance,
                        totalUSD:total,
                        timestamp:new Date()
                    }).save()
                }
            }
        }


    }, 10000);//once a minute
}
