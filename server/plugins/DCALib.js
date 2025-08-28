import {SMA, RSI, CrossUp, CrossDown, EMA, MACD} from 'technicalindicators';
import moment from 'moment';
import { create, all } from 'mathjs';
import {dcaBotSchema} from "~/server/models/dcaBot.schema";
const config = {
    number: 'BigNumber',
    precision: 20
}
const math = create(all, config);

export default defineNitroPlugin((nitroApp) => {
    // console.log('DCA Library Loaded...')
    
    // IMPORTANT: All fee calculations use hardcoded 0.1% (0.001) fee rate
    // This applies to both maker and taker orders for simplicity

    nitroApp.DCALib = {

        placeBaseOrder: async function(bot) {
            let status = await nitroApp.ccxtw.fetchTicker(bot.userID, bot.exchange, bot.symbol);
            let baseOrderPrice = status.data.last;
            let baseOrderAmount = math.evaluate(`(${bot.baseOrderAmount} * ${bot.leverage}) / ${baseOrderPrice}`);
            let side = this.getSide(bot);
            let log = null;

            baseOrderPrice = await nitroApp.ccxtw.priceToPrecision(bot.userID, bot.exchange, bot.symbol, baseOrderPrice);
            baseOrderAmount = await nitroApp.ccxtw.amountToPrecision(bot.userID, bot.exchange, bot.symbol, baseOrderAmount);

            if (bot.marketType === 'future') {
                await nitroApp.ccxtw.setLeverage(bot.userID, bot.exchange, bot.leverage, bot.symbol);
            }

            let orderResponse = await nitroApp.ccxtw.createOrder(
                bot.userID,
                bot.exchange,
                bot.symbol,
                bot.baseOrderType,
                side.mainDirection,
                baseOrderAmount,
                baseOrderPrice,
            );

            if (orderResponse.success) {

                bot.activeDeal.baseOrder = this.parseOrderData(orderResponse.data);
                log =`${this.getCurrentTime()}: ${bot.symbol} - ${bot.activeDeal.status} - Type: ${bot.baseOrderType}, Side: ${side.mainDirection}, Amount: ${baseOrderAmount}, Price: ${baseOrderPrice}`;

                //next step->>
                bot.activeDeal.status = 'WAIT_FOR_FILLS';
            }

            if (!orderResponse.success) {
                bot.activeDeal.baseOrder = null;
                log =`${this.getCurrentTime()}: ${bot.symbol} - ${bot.activeDeal.status} - ${orderResponse.log} - Type: ${bot.baseOrderType}, Side: ${side.mainDirection}, Amount: ${baseOrderAmount}, Price: ${baseOrderPrice}`;
                
                // Retry or go to error state instead of proceeding to WAIT_FOR_FILLS with null order
                bot.activeDeal.status = 'ERROR_BASE_ORDER_FAILED';
            }

            bot.logs.push(log);
            console.log(log);

            return bot;
        },
        placeSafetyOrder: async function(bot) {
            let sign = this.getSign(bot);
            let safetyOrderPrice = math.evaluate(`${bot.activeDeal.filledOrders[bot.activeDeal.filledOrders.length -1].price} ${sign.mainSign} ((${bot.activeDeal.filledOrders[bot.activeDeal.filledOrders.length -1].price} / 100) * ${bot.safetyOrderPercent})`);
            let safetyOrderAmount = math.evaluate(`(${bot.safetyOrderAmount} * ${bot.leverage}) / ${safetyOrderPrice}`);
            let side = this.getSide(bot);
            let log = null;

            safetyOrderPrice = await nitroApp.ccxtw.priceToPrecision(bot.userID, bot.exchange, bot.symbol, safetyOrderPrice);
            safetyOrderAmount = await nitroApp.ccxtw.amountToPrecision(bot.userID, bot.exchange, bot.symbol, safetyOrderAmount);

            let orderResponse = await nitroApp.ccxtw.createOrder(
                bot.userID,
                bot.exchange,
                bot.symbol,
                'limit',
                side.mainDirection,
                safetyOrderAmount,
                safetyOrderPrice
            );

            if (orderResponse.success) {
                bot.activeDeal.safetyOrder = this.parseOrderData(orderResponse.data);
                log =`${this.getCurrentTime()}: ${bot.symbol} - ${bot.activeDeal.status} - Type: limit, Side: ${side.mainDirection}, Amount: ${safetyOrderAmount}, Price: ${safetyOrderPrice}`;

                //next step->>
                bot.activeDeal.status = 'PLACE_TAKE_PROFIT_ORDER';
            }

            if (!orderResponse.success) {
                bot.activeDeal.safetyOrder = null;
                log =`${this.getCurrentTime()}: ${bot.symbol} - ${bot.activeDeal.status} - ${orderResponse.log} - Type: limit, Side: ${side.mainDirection}, Amount: ${safetyOrderAmount}, Price: ${safetyOrderPrice}`;
                
                // Skip this safety order and continue to TP order
                bot.activeDeal.status = 'PLACE_TAKE_PROFIT_ORDER';
            }

            bot.logs.push(log);
            console.log(log);

            return bot;
        },
        placeTakeProfitOrder: async function(bot) {
            let sign = this.getSign(bot);
            let side = this.getSide(bot);
            let log = null;
            const feeRate = 0.001; // 0.1% fee hardcoded

            let tpTotalAmount = 0;
            let tpTotalCostWithFees = 0; // Total cost including fees paid
            
            // IMPORTANT: Only count ACTUALLY FILLED orders, not pending ones
            // Note: We may have pending safety orders when calculating TP - this is expected
            
            // Check for duplicate order IDs to prevent double counting
            let processedOrderIds = new Set();
            
            for (let i = 0; i < bot.activeDeal.filledOrders.length; i++) {
                // Skip if we've already processed this order ID
                if (processedOrderIds.has(bot.activeDeal.filledOrders[i].id)) {
                    continue;
                }
                processedOrderIds.add(bot.activeDeal.filledOrders[i].id);
                
                if (bot.activeDeal.filledOrders[i].side === side.mainDirection) {
                    // Use the actual filled amount from the order
                    // The exchange already handled fees - we have what we have
                    tpTotalAmount = math.evaluate(`${tpTotalAmount} + ${bot.activeDeal.filledOrders[i].amount}`);
                    
                    // Include fees in the total cost (what we actually paid including fees)
                    let orderCostWithFee = math.evaluate(`${bot.activeDeal.filledOrders[i].cost} * (1 + ${feeRate})`);
                    tpTotalCostWithFees = math.evaluate(`${tpTotalCostWithFees} + ${orderCostWithFee}`);
                }
            }
            
            // Calculate the average entry price including fees
            let avgEntryPriceWithFees = math.evaluate(`${tpTotalCostWithFees} / ${tpTotalAmount}`);
            
            // Calculate TP price that accounts for:
            // 1. Recovering all costs including fees from entries
            // 2. Adding desired profit percentage
            // 3. Accounting for the fee we'll pay when closing (selling/buying back)
            
            // Use detected direction if bot is in auto mode
            let direction = bot.direction;
            if (bot.direction === 'auto' && bot.activeDeal && bot.activeDeal.detectedDirection) {
                direction = bot.activeDeal.detectedDirection;
            }
            
            let tpPrice;
            let targetPriceBeforeFees;
            if (direction === 'long') {
                // For long: buy low, sell high
                // TP = avgEntry * (1 + profit%) / (1 - fee)
                targetPriceBeforeFees = math.evaluate(`${avgEntryPriceWithFees} * (1 + ${bot.takeProfitOrderPercent} / 100)`);
                tpPrice = math.evaluate(`${targetPriceBeforeFees} / (1 - ${feeRate})`);
            } else {
                // For short: sell high, buy low
                // We need to buy back at a LOWER price to make profit
                // TP = avgEntry * (1 - profit%) * (1 - fee) 
                // We multiply by (1 - fee) because we're buying and fees reduce our purchasing power
                targetPriceBeforeFees = math.evaluate(`${avgEntryPriceWithFees} * (1 - ${bot.takeProfitOrderPercent} / 100)`);
                tpPrice = math.evaluate(`${targetPriceBeforeFees} * (1 - ${feeRate})`);
            }


            let type = null;
            let params = null;
            if (bot.exchange === 'binance') {
                if (bot.marketType === 'spot') {
                    // For spot markets, use take_profit_limit only for long positions
                    // For short positions (selling high, buying low), use regular limit orders
                    if (direction === 'long') {
                        type = 'take_profit_limit';
                        params = {'stopPrice': tpPrice};
                    } else {
                        // Short on spot: just use limit order to buy back lower
                        type = 'limit';
                        params = null;
                    }
                }
                if (bot.marketType === 'future') {
                    type = 'take_profit';
                    params = {'stopPrice': tpPrice};
                }
            } else {
                type = 'limit';
            }
            
            tpPrice = await nitroApp.ccxtw.priceToPrecision(bot.userID, bot.exchange, bot.symbol, tpPrice);
            tpTotalAmount = await nitroApp.ccxtw.amountToPrecision(bot.userID, bot.exchange, bot.symbol, tpTotalAmount);

            let orderResponse = await nitroApp.ccxtw.createOrder(
                bot.userID,
                bot.exchange,
                bot.symbol,
                type,
                side.oppositeDirection,
                tpTotalAmount,
                tpPrice,
                params
            );

            if (orderResponse.success) {
                bot.activeDeal.takeProfitOrder = this.parseOrderData(orderResponse.data);
                log =`${this.getCurrentTime()}: ${bot.symbol} - ${bot.activeDeal.status} - Type: ${type}, Side: ${side.oppositeDirection}, Amount: ${tpTotalAmount}, Price: ${tpPrice}`;

                //next step->>
                bot.activeDeal.status = 'WAIT_FOR_FILLS';
            }

            if (!orderResponse.success) {
                bot.activeDeal.takeProfitOrder = null;
                log =`${this.getCurrentTime()}: ${bot.symbol} - ${bot.activeDeal.status} - ${orderResponse.log} - Type: ${type}, Side: ${side.oppositeDirection}, Amount: ${tpTotalAmount}, Price: ${tpPrice}`;
                
                // Continue without TP order
                bot.activeDeal.status = 'WAIT_FOR_FILLS';
            }

            bot.logs.push(log);
            console.log(log);

            return bot;
        },
        placeStopLossOrder: async function(bot) {
            let sign = this.getSign(bot);
            let side = this.getSide(bot);
            let log = null;
            const feeRate = 0.001; // 0.1% fee hardcoded

            let baseOrderPrice = bot.activeDeal.filledOrders[0].price;
            let stopLossOrderPrice = math.evaluate(`${baseOrderPrice} ${sign.mainSign} ((${baseOrderPrice} / 100) * ${bot.stopLossOrderPercent})`);

            let totalAmount = 0;
            let tpTotalCostWithFees = 0; // Total cost including fees paid
            
            for (let i = 0; i < bot.activeDeal.filledOrders.length; i++) {
                if (bot.activeDeal.filledOrders[i].side === side.mainDirection) {
                    // Use actual filled amount - exchange already handled fees
                    totalAmount = math.evaluate(`${totalAmount} + ${bot.activeDeal.filledOrders[i].amount}`);
                    
                    // Include fees in the total cost (what we actually paid including fees)
                    let orderCostWithFee = math.evaluate(`${bot.activeDeal.filledOrders[i].cost} * (1 + ${feeRate})`);
                    tpTotalCostWithFees = math.evaluate(`${tpTotalCostWithFees} + ${orderCostWithFee}`);
                }
            }

            // Calculate the average entry price including fees
            let avgEntryPriceWithFees = math.evaluate(`${tpTotalCostWithFees} / ${totalAmount}`);
            
            // Use detected direction if bot is in auto mode
            let direction = bot.direction;
            if (bot.direction === 'auto' && bot.activeDeal && bot.activeDeal.detectedDirection) {
                direction = bot.activeDeal.detectedDirection;
            }
            
            // Calculate TP price that accounts for fees (same as in placeTakeProfitOrder)
            let targetPriceBeforeFees;
            let tpPrice;
            if (direction === 'long') {
                targetPriceBeforeFees = math.evaluate(`${avgEntryPriceWithFees} * (1 + ${bot.takeProfitOrderPercent} / 100)`);
                tpPrice = math.evaluate(`${targetPriceBeforeFees} / (1 - ${feeRate})`);
            } else {
                targetPriceBeforeFees = math.evaluate(`${avgEntryPriceWithFees} * (1 - ${bot.takeProfitOrderPercent} / 100)`);
                tpPrice = math.evaluate(`${targetPriceBeforeFees} * (1 - ${feeRate})`);
            }

            let type = null;
            let params = null;
            if(bot.marketType === 'future') {
                type = 'STOP_MARKET';
                params = {
                    'stopPrice': stopLossOrderPrice
                };
            }
            if(bot.marketType === 'spot') {
                type = 'oco';
                params = {
                    tpPrice:tpPrice,
                    stopLossPrice: stopLossOrderPrice,
                    stopLimitPrice: stopLossOrderPrice
                };
            }

            stopLossOrderPrice = await nitroApp.ccxtw.priceToPrecision(bot.userID, bot.exchange, bot.symbol, stopLossOrderPrice);
            totalAmount = await nitroApp.ccxtw.amountToPrecision(bot.userID, bot.exchange, bot.symbol, totalAmount);

            let orderResponse = await nitroApp.ccxtw.createOrder(
                bot.userID,
                bot.exchange,
                bot.symbol,
                type,
                side.oppositeDirection,
                totalAmount,
                stopLossOrderPrice,
                params
            );

            if (orderResponse.success) {
                log =`${this.getCurrentTime()}: ${bot.symbol} - ${bot.activeDeal.status} - Type: ${type}, Side: ${side.oppositeDirection}, Amount: ${totalAmount}, Price: ${stopLossOrderPrice}`;
                bot.logs.push(log);
                console.log(log);

                //next step->>
                if(bot.marketType === 'future') {
                    bot.activeDeal.stopLossOrder = this.parseOrderData(orderResponse.data);

                    bot.activeDeal.status = 'PLACE_TAKE_PROFIT_ORDER';
                }

                if(bot.marketType === 'spot') {
                    let stopLossOrder = await nitroApp.ccxtw.fetchOrder(bot.userID, bot.exchange, orderResponse.data.orders[0].orderId, bot.symbol);
                    bot.activeDeal.stopLossOrder = this.parseOrderData(stopLossOrder.data);

                    let takeProfitOrder = await nitroApp.ccxtw.fetchOrder(bot.userID, bot.exchange, orderResponse.data.orders[1].orderId, bot.symbol);
                    bot.activeDeal.takeProfitOrder = this.parseOrderData(takeProfitOrder.data);

                    bot.activeDeal.status = 'WAIT_FOR_FILLS';
                }

            }

            if (!orderResponse.success) {
                bot.activeDeal.stopLossOrder = null;
                log =`${this.getCurrentTime()}: ${bot.symbol} - ${bot.activeDeal.status} - ${orderResponse.log} - Type: ${type}, Side: ${side.mainDirection}, Amount: ${totalAmount}, Price: ${stopLossOrderPrice}`;
                bot.logs.push(log);
                console.log(log);
                
                // Continue to TP order if futures, or WAIT_FOR_FILLS if spot
                if(bot.marketType === 'future') {
                    bot.activeDeal.status = 'PLACE_TAKE_PROFIT_ORDER';
                } else {
                    bot.activeDeal.status = 'WAIT_FOR_FILLS';
                }
            }

            return bot;
        },
        checkBaseOrder: async function(bot) {
            let orderResponse = await nitroApp.ccxtw.fetchOrder(bot.userID, bot.exchange, bot.activeDeal.baseOrder.id, bot.symbol);
            let log = null;

            if (orderResponse.success) {
                if (orderResponse.data.status === 'closed') {
                    bot.activeDeal.filledOrders.push(bot.activeDeal.baseOrder);
                    log =`${this.getCurrentTime()}: ${bot.symbol} - ${bot.activeDeal.status} - BASE_ORDER_FILLED - Amount: ${bot.activeDeal.baseOrder.amount}, Price: ${bot.activeDeal.baseOrder.price}`;
                    bot.logs.push(log);
                    console.log(log);
                    bot.activeDeal.baseOrder = null;

                    //next step->>
                    if ((bot.activeDeal.filledOrders.length - 1) < bot.maxSafetyOrdersCount) {

                        bot.activeDeal.status = 'PLACE_SAFETY_ORDER';
                    } else {

                        if (bot.stopLossOrderPercent > 0) {
                            bot.activeDeal.status = 'PLACE_STOP_LOSS_ORDER';
                        } else {
                            log = `${this.getCurrentTime()}: ${bot.symbol} - SAFETY_ORDERS_NR_REACHED`;
                            bot.activeDeal.status = 'PLACE_TAKE_PROFIT_ORDER';

                            bot.logs.push(log);
                            console.log(log);
                        }
                    }
                }
            }
            return bot;
        },
        checkSafetyOrder: async function(bot) {
            let orderResponse = await nitroApp.ccxtw.fetchOrder(bot.userID, bot.exchange, bot.activeDeal.safetyOrder.id, bot.symbol);
            let log = null;

            if (orderResponse.success) {
                if (orderResponse.data.status === 'closed') {
                    bot.activeDeal.filledOrders.push(bot.activeDeal.safetyOrder);
                    log =`${this.getCurrentTime()}: ${bot.symbol} - ${bot.activeDeal.status} - SAFETY_ORDER_FILLED - Amount: ${bot.activeDeal.safetyOrder.amount}, Price: ${bot.activeDeal.safetyOrder.price}`;
                    bot.logs.push(log);
                    console.log(log);
                    bot.activeDeal.safetyOrder = null;

                    //cancel tp order if any
                    if (bot.activeDeal.takeProfitOrder !== null){
                        let cancelOrderResponse = await nitroApp.ccxtw.cancelOrder(bot.userID, bot.exchange, bot.activeDeal.takeProfitOrder.id, bot.symbol);
                        if (!cancelOrderResponse.success) {
                            bot.logs.push(cancelOrderResponse.log);
                            console.log(cancelOrderResponse.log);
                        }
                        bot.activeDeal.takeProfitOrder = null;
                    }
                    //next step->>
                    if ((bot.activeDeal.filledOrders.length - 1) < bot.maxSafetyOrdersCount) {
                        bot.activeDeal.status = 'PLACE_SAFETY_ORDER';
                    } else {
                        if (bot.stopLossOrderPercent > 0) {
                            bot.activeDeal.status = 'PLACE_STOP_LOSS_ORDER';
                        } else {
                            log = `${this.getCurrentTime()}: ${bot.symbol} - SAFETY_ORDERS_NR_REACHED`;
                            bot.activeDeal.status = 'PLACE_TAKE_PROFIT_ORDER';

                            bot.logs.push(log);
                            console.log(log);
                        }
                    }
                }
            }

            return bot;
        },
        checkTakeProfitOrder: async function(bot) {
            let side = this.getSide(bot);
            let orderResponse = await nitroApp.ccxtw.fetchOrder(bot.userID, bot.exchange, bot.activeDeal.takeProfitOrder.id, bot.symbol);
            let log = null;

            if (orderResponse.success) {
                if (orderResponse.data.status === 'closed') {
                    bot.activeDeal.filledOrders.push(bot.activeDeal.takeProfitOrder);
                    log =`${this.getCurrentTime()}: ${bot.symbol} - ${bot.activeDeal.status} - TAKE_PROFIT_ORDER_FILLED - Amount: ${bot.activeDeal.takeProfitOrder.amount}, Price: ${bot.activeDeal.takeProfitOrder.price}`;
                    bot.logs.push(log);
                    console.log(log);
                    bot.activeDeal.takeProfitOrder = null;

                    //next step->>
                    //cancel old safety order
                    if (bot.activeDeal.safetyOrder !== null){
                        let cancelOrderResponse = await nitroApp.ccxtw.cancelOrder(bot.userID, bot.exchange, bot.activeDeal.safetyOrder.id, bot.symbol);
                        if (!cancelOrderResponse.success) {
                            bot.logs.push(cancelOrderResponse.log);
                            console.log(cancelOrderResponse.log);
                        }
                        bot.activeDeal.safetyOrder = null;
                    }


                    if (bot.marketType === 'future') {
                        if (bot.activeDeal.stopLossOrder !== null){
                            let cancelOrderResponse = await nitroApp.ccxtw.cancelOrder(bot.userID, bot.exchange, bot.activeDeal.stopLossOrder.id, bot.symbol);
                            if (!cancelOrderResponse.success) {
                                bot.logs.push(cancelOrderResponse.log);
                                console.log(cancelOrderResponse.log);
                            }
                            bot.activeDeal.stopLossOrder = null;
                        }
                    }

                    //calculate profit
                    bot.activeDeal.profit = this.calculateProfit(bot.activeDeal.filledOrders, side.mainDirection);
                    bot.profit = math.evaluate(`${bot.profit} + ${bot.activeDeal.profit}`);
                    bot.activeDeal.status = 'CLOSED_DEAL';

                    bot.closedDeals.push(bot.activeDeal);

                    log = `${this.getCurrentTime()}: ${bot.symbol} - CLOSED_DEAL - Profit: ${bot.activeDeal.profit}!!!. Resetting.`;
                    bot.logs.push(log);
                    console.log(log);

                    //reset - but only start new deal if bot is still running
                    bot.activeDeal = {
                        status: bot.isRunning ? 'START_NEW_DEAL' : 'BOT_STOPPED',
                        baseOrder:null,
                        safetyOrder:null,
                        takeProfitOrder:null,
                        stopLossOrder:null,
                        filledOrders:[],
                        profit:0,
                        detectedDirection: null, // Clear detected direction for next deal
                        waitingForEntry: false, // Clear smart entry waiting flag
                        waitStartTime: null // Clear wait start time
                    };
                    
                    if (!bot.isRunning) {
                        log = `${this.getCurrentTime()}: ${bot.symbol} - Bot stopped, not starting new deal.`;
                        bot.logs.push(log);
                        console.log(log);
                    }
                }
            }

            return bot;
        },
        checkStopLossOrder: async function(bot) {
            let side = this.getSide(bot);
            let orderResponse = await nitroApp.ccxtw.fetchOrder(bot.userID, bot.exchange, bot.activeDeal.stopLossOrder.id, bot.symbol);
            let log = null;

            if (orderResponse.success) {
                if (orderResponse.data.status === 'closed') {
                    bot.activeDeal.filledOrders.push(bot.activeDeal.stopLossOrder);
                    log =`${this.getCurrentTime()}: ${bot.symbol} - ${bot.activeDeal.status} - STOP_LOSS_ORDER_FILLED - Amount: ${bot.activeDeal.stopLossOrder.amount}, Price: ${bot.activeDeal.stopLossOrder.price}`;
                    bot.logs.push(log);
                    console.log(log);
                    bot.activeDeal.stopLossOrder = null;

                    //next step->>
                    //cancel tp order
                    if (bot.marketType === 'future') {
                        if (bot.activeDeal.takeProfitOrder !== null){
                            let cancelOrderResponse = await nitroApp.ccxtw.cancelOrder(bot.userID, bot.exchange, bot.activeDeal.takeProfitOrder.id, bot.symbol);
                            if (!cancelOrderResponse.success) {
                                bot.logs.push(cancelOrderResponse.log);
                                console.log(cancelOrderResponse.log);
                            }
                            bot.activeDeal.takeProfitOrder = null;
                        }
                    }

                    bot.activeDeal.profit = this.calculateProfit(bot.activeDeal.filledOrders, side.mainDirection);
                    bot.profit = math.evaluate(`${bot.profit} + ${bot.activeDeal.profit}`);
                    bot.activeDeal.status = 'CLOSED_DEAL';
                    bot.closedDeals.push(bot.activeDeal);
                    log = `${this.getCurrentTime()}: ${bot.symbol} - STOP_LOSS_FILLED - LOSS: ${bot.activeDeal.profit}`;
                    bot.logs.push(log);
                    console.log(log);

                    //reset - but only start new deal if bot is still running
                    bot.activeDeal = {
                        status: bot.isRunning ? 'START_NEW_DEAL' : 'BOT_STOPPED',
                        baseOrder:null,
                        safetyOrder:null,
                        takeProfitOrder:null,
                        stopLossOrder:null,
                        filledOrders:[],
                        profit:0,
                        detectedDirection: null, // Clear detected direction for next deal
                        waitingForEntry: false, // Clear smart entry waiting flag
                        waitStartTime: null // Clear wait start time
                    };
                    
                    if (!bot.isRunning) {
                        log = `${this.getCurrentTime()}: ${bot.symbol} - Bot stopped, not starting new deal after stop loss.`;
                        bot.logs.push(log);
                        console.log(log);
                    }
                }
            }
            return bot;
        },
        createBot: async function(data){

            if (data.marketType === 'spot') {
                data.leverage = 1;
            }

            data.activeDeal = {
                status:'START_NEW_DEAL',
                baseOrder:null,
                safetyOrder:null,
                takeProfitOrder:null,
                stopLossOrder:null,
                filledOrders:[],
                profit:0,
                detectedDirection: null, // For auto direction mode
                waitingForEntry: false, // For smart start mode
                waitStartTime: null // Track how long we've been waiting
            };

            data.closedDeals = [];

            data.profit = 0;

            data.logs = [];

            await new dcaBotSchema(data).save()
        },
        startBot: async function(id) {
            await dcaBotSchema.updateOne({ _id:id }, { status:true });
        },
        stopBot: async function(id) {
            await dcaBotSchema.updateOne({ _id:id }, { status:false });
        },
        deleteBot: async function(id) {
            await dcaBotSchema.findByIdAndDelete(id);
        },
        getBots: async function(){
            let bots = await dcaBotSchema.find({});
            let formattedBots = [];

            for (let i = 0; i < bots.length; i++) {
                let bot = bots[i].toObject();
                // Bot already has its own profit, no need to recalculate
                formattedBots.push(bot);
            }
            return formattedBots;
        },
        getDirection: async function(userID, exchange, symbol) {
            let status = await nitroApp.ccxtw.fetchOHLCV(userID, exchange, symbol, '1m');
            if (status.success) {
                let prices = [];
                for (let i = 0; i < status.data.length; i++) {
                    prices.push(status.data[i][3]);
                }

                let ma7Data = [];
                let ma7 = new SMA({period : 7, values : prices});
                let results = ma7.getResult();
                let offset = prices.length - results.length;
                for (let i = 0; i < results.length; i++) {
                    ma7Data.push({
                        time:(status.data[i+offset][0] / 1000),
                        value:results[i],
                    });
                }

                let ma25Data = [];
                let ma25 = new SMA({period : 25, values : prices});
                results = ma25.getResult();
                offset = prices.length - results.length;
                for (let i = 0; i < results.length; i++) {
                    ma25Data.push({
                        time:(status.data[i+offset][0] / 1000),
                        value:results[i],
                    });
                }

                let rsiData = [];
                let rsi = new RSI({period : 14, values : prices});
                results = rsi.getResult();
                offset = prices.length - results.length;
                for (let i = 0; i < results.length; i++) {
                    rsiData.push({
                        time:(status.data[i+offset][0] / 1000),
                        value:results[i],
                    });
                }

                let data = {
                    ma7:ma7Data,
                    ma25:ma25Data,
                    rsi:rsiData,
                }


                let maOffset = data.ma7.length - data.ma25.length;
                let ma7Vals = [];
                for (let i = maOffset; i < data.ma7.length; i++) {
                    ma7Vals.push(data.ma7[i].value);
                }

                let ma25Vals = [];
                for (let i = 0; i < data.ma25.length; i++) {
                    ma25Vals.push(data.ma25[i].value);
                }

                let crossLines = {
                    lineA: ma7Vals,
                    lineB: ma25Vals,
                };

                let crossUp = new CrossUp(crossLines);
                let crossDown = new CrossDown(crossLines);
                let crossUpValues = crossUp.getResult();
                let crossDownValues = crossDown.getResult();


                let overboughtCondition = false;
                let oversoldCondition = false;
                let trend = null;

                for (let i = 0; i < crossUpValues.length; i++) {

                    if (crossUpValues[i] === true) {
                        trend = 'bullish';
                    }

                    if (crossDownValues[i] === true) {
                        trend = 'bearish';
                    }
                }

                for (let i = 0; i < data.rsi.length; i++) {
                    if (data.rsi[i].value > 80 && !overboughtCondition) {
                        overboughtCondition = true;
                    } else {
                        overboughtCondition = false;
                    }
                    if (data.rsi[i].value < 20 && !oversoldCondition) {
                        oversoldCondition = true;
                    } else {
                        oversoldCondition = false;
                    }
                }

                return {
                    trend,
                    overboughtCondition,
                    oversoldCondition
                }
            }
        },
        getCurrentTime: function() {
            return moment(new Date()).format('lll');
        },
        getSide: function(bot){
            // Use detected direction if bot is in auto mode
            let direction = bot.direction;
            if (bot.direction === 'auto' && bot.activeDeal && bot.activeDeal.detectedDirection) {
                direction = bot.activeDeal.detectedDirection;
            }
            
            let side = null;
            let opposite = null;
            if (direction === 'long') {
                side = 'buy';
                opposite = 'sell';
            }
            if (direction === 'short') {
                side = 'sell';
                opposite = 'buy';
            }
            return {
                mainDirection:side,
                oppositeDirection:opposite
            }
        },
        getSign: function(bot){
            // Use detected direction if bot is in auto mode
            let direction = bot.direction;
            if (bot.direction === 'auto' && bot.activeDeal && bot.activeDeal.detectedDirection) {
                direction = bot.activeDeal.detectedDirection;
            }
            
            let mainSign = null;
            let oppositeSign = null

            if (direction === 'long') {
                mainSign = '-';
                oppositeSign = '+';
            } else {
                mainSign = '+';
                oppositeSign = '-';
            }

            return {
                mainSign:mainSign,
                oppositeSign:oppositeSign
            }
        },
        parseOrderData(order) {

            // Assume feeRate is 0.1% (0.001)
            const feeRate = 0.001;

            // Ensure numeric values (if they aren't already)
            const cost = math.evaluate(`${order.amount} * ${order.price}`);     // Total cost in quote currency (e.g. USDC)
            const amount = order.amount;   // Total amount in base currency (e.g. ETH)

            // Calculate fees in both quote and base terms:
            const feesQuote = cost * feeRate;   // e.g. 0.1% of the cost in quote currency
            const feesBase = amount * feeRate;    // e.g. 0.1% of the amount in base currency

            // Build your order object with fees expressed in both currencies:

            return {
                id: order.id,
                symbol: order.symbol,
                type: order.type,
                side: order.side,
                price: order.price,
                amount: order.amount,
                cost: cost,
                // Here we include the fees as an object with two properties: base and quote
                fees: {
                    base: feesBase,
                    quote: feesQuote,
                },
                datetime: order.datetime,
            };

        },
        calculateProfit(orders, side){
            //calc profit with 0.1% fee
            const feeRate = 0.001; // 0.1% hardcoded fee
            let totalBuyCost = 0;
            let totalSellRevenue = 0;
            let profit = 0;

            for (let i = 0; i < orders.length; i++) {
                if (orders[i].side === side) {
                    // For buy orders: actual cost = order cost + fees
                    let costWithFee = math.evaluate(`${orders[i].cost} * (1 + ${feeRate})`);
                    totalBuyCost = math.evaluate(`${totalBuyCost} + ${costWithFee}`);
                }
                if (orders[i].side !== side) {
                    // For sell orders: actual revenue = order cost - fees
                    let revenueAfterFee = math.evaluate(`${orders[i].cost} * (1 - ${feeRate})`);
                    totalSellRevenue = math.evaluate(`${totalSellRevenue} + ${revenueAfterFee}`);
                }
            }

            if (side === 'buy') {
                // Long position: profit = sell revenue - buy cost
                profit = math.evaluate(`${totalSellRevenue} - ${totalBuyCost}`);
            } else {
                // Short position: profit = buy revenue - sell cost  
                profit = math.evaluate(`${totalBuyCost} - ${totalSellRevenue}`);
            }
            return profit;
        },
        
        // Auto direction detection using composite score system
        detectAutoDirection: async function(bot) {
            try {
                console.log(`Auto direction detection for ${bot.symbol}...`);
                
                // Fetch last 100 1-minute candles
                const now = Date.now();
                const fromTimestamp = now - (100 * 60 * 1000); // 100 minutes ago
                
                const candlesResponse = await nitroApp.ccxtw.fetchOHLCV(
                    bot.userID, 
                    bot.exchange, 
                    bot.symbol, 
                    '1m', 
                    fromTimestamp, 
                    100
                );
                
                if (!candlesResponse.success || !candlesResponse.data || candlesResponse.data.length < 50) {
                    console.log('Insufficient candle data for auto detection, defaulting to long');
                    return 'long';
                }
                
                const candles = candlesResponse.data;
                const closes = candles.map(c => c[4]);
                const highs = candles.map(c => c[2]);
                const lows = candles.map(c => c[3]);
                const volumes = candles.map(c => c[5]);
                
                let score = 0;
                
                // 1. EMA Crossover Score (+2/-2 points)
                const ema9 = EMA.calculate({period: 9, values: closes});
                const ema21 = EMA.calculate({period: 21, values: closes});
                const ema50 = EMA.calculate({period: 50, values: closes});
                
                if (ema9.length > 0 && ema21.length > 0 && ema50.length > 0) {
                    const lastEma9 = ema9[ema9.length - 1];
                    const lastEma21 = ema21[ema21.length - 1];
                    const lastEma50 = ema50[ema50.length - 1];
                    const currentPrice = closes[closes.length - 1];
                    
                    // Bullish alignment: price > EMA9 > EMA21 > EMA50
                    if (currentPrice > lastEma9 && lastEma9 > lastEma21 && lastEma21 > lastEma50) {
                        score += 2;
                        console.log('  EMA alignment: Bullish (+2)');
                    }
                    // Bearish alignment: price < EMA9 < EMA21 < EMA50
                    else if (currentPrice < lastEma9 && lastEma9 < lastEma21 && lastEma21 < lastEma50) {
                        score -= 2;
                        console.log('  EMA alignment: Bearish (-2)');
                    } else {
                        console.log('  EMA alignment: Mixed (0)');
                    }
                }
                
                // 2. RSI Score (+1/-1 points)
                const rsiValues = RSI.calculate({period: 14, values: closes});
                if (rsiValues.length > 0) {
                    const currentRSI = rsiValues[rsiValues.length - 1];
                    
                    if (currentRSI < 30) {
                        score += 1;
                        console.log(`  RSI: ${currentRSI.toFixed(2)} - Oversold (+1)`);
                    } else if (currentRSI > 70) {
                        score -= 1;
                        console.log(`  RSI: ${currentRSI.toFixed(2)} - Overbought (-1)`);
                    } else {
                        console.log(`  RSI: ${currentRSI.toFixed(2)} - Neutral (0)`);
                    }
                }
                
                // 3. MACD Histogram Score (+1/-1 points)
                const macdResult = MACD.calculate({
                    values: closes,
                    fastPeriod: 12,
                    slowPeriod: 26,
                    signalPeriod: 9,
                    SimpleMAOscillator: false,
                    SimpleMASignal: false
                });
                
                if (macdResult.length >= 2) {
                    const lastMACD = macdResult[macdResult.length - 1];
                    const prevMACD = macdResult[macdResult.length - 2];
                    
                    if (lastMACD.histogram && prevMACD.histogram) {
                        if (lastMACD.histogram > prevMACD.histogram) {
                            score += 1;
                            console.log('  MACD histogram: Rising (+1)');
                        } else if (lastMACD.histogram < prevMACD.histogram) {
                            score -= 1;
                            console.log('  MACD histogram: Falling (-1)');
                        } else {
                            console.log('  MACD histogram: Flat (0)');
                        }
                    }
                }
                
                // 4. Volume Score (+1/0 points)
                const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
                const currentVolume = volumes[volumes.length - 1];
                
                if (currentVolume > avgVolume * 1.2) {
                    score += 1;
                    console.log('  Volume: Above average (+1)');
                } else {
                    console.log('  Volume: Normal (0)');
                }
                
                // 5. Candle Pattern Score (+1/-1 points)
                // Simple bullish/bearish candle detection
                const lastCandle = candles[candles.length - 1];
                const prevCandle = candles[candles.length - 2];
                const lastOpen = lastCandle[1];
                const lastClose = lastCandle[4];
                const prevOpen = prevCandle[1];
                const prevClose = prevCandle[4];
                
                // Bullish engulfing or strong bullish candle
                if (lastClose > lastOpen && (lastClose - lastOpen) > (Math.abs(prevClose - prevOpen) * 1.5)) {
                    score += 1;
                    console.log('  Candle pattern: Bullish (+1)');
                }
                // Bearish engulfing or strong bearish candle
                else if (lastOpen > lastClose && (lastOpen - lastClose) > (Math.abs(prevClose - prevOpen) * 1.5)) {
                    score -= 1;
                    console.log('  Candle pattern: Bearish (-1)');
                } else {
                    console.log('  Candle pattern: Neutral (0)');
                }
                
                // Final decision based on score
                console.log(`  Total Score: ${score}`);
                
                if (score >= 3) {
                    console.log('  Decision: LONG');
                    return 'long';
                } else if (score <= -3) {
                    console.log('  Decision: SHORT');
                    return 'short';
                } else {
                    console.log('  Decision: WAIT (defaulting to long)');
                    // For DCA bot, we'll default to long if uncertain
                    // You could also return 'wait' and handle it differently
                    return 'long';
                }
                
            } catch (error) {
                console.error('Error in auto direction detection:', error);
                // Default to long on error
                return 'long';
            }
        },
        
        // Smart entry detection - finds optimal entry points based on direction
        detectSmartEntry: async function(bot, direction) {
            try {
                // Use provided direction or detected direction for auto bots
                const actualDirection = direction || 
                    (bot.direction === 'auto' && bot.activeDeal?.detectedDirection) || 
                    bot.direction;
                
                console.log(`Smart entry detection for ${bot.symbol} (${actualDirection})...`);
                
                // Fetch last 50 1-minute candles (faster, we need recent data)
                const now = Date.now();
                const fromTimestamp = now - (50 * 60 * 1000); // 50 minutes ago
                
                const candlesResponse = await nitroApp.ccxtw.fetchOHLCV(
                    bot.userID, 
                    bot.exchange, 
                    bot.symbol, 
                    '1m', 
                    fromTimestamp, 
                    50
                );
                
                if (!candlesResponse.success || !candlesResponse.data || candlesResponse.data.length < 30) {
                    console.log('Insufficient candle data for smart entry, allowing entry');
                    return true; // Allow entry if we can't determine
                }
                
                const candles = candlesResponse.data;
                const closes = candles.map(c => c[4]);
                const highs = candles.map(c => c[2]);
                const lows = candles.map(c => c[3]);
                const volumes = candles.map(c => c[5]);
                const currentPrice = closes[closes.length - 1];
                
                // Calculate indicators for entry timing
                const ema9 = EMA.calculate({period: 9, values: closes});
                const ema21 = EMA.calculate({period: 21, values: closes});
                const rsiValues = RSI.calculate({period: 14, values: closes});
                
                if (ema9.length < 2 || ema21.length < 2 || rsiValues.length < 5) {
                    console.log('Not enough indicator data, allowing entry');
                    return true;
                }
                
                const currentEma9 = ema9[ema9.length - 1];
                const currentEma21 = ema21[ema21.length - 1];
                const prevEma9 = ema9[ema9.length - 2];
                
                const currentRSI = rsiValues[rsiValues.length - 1];
                const recentRSIs = rsiValues.slice(-5); // Last 5 RSI values
                const rsiMin = Math.min(...recentRSIs);
                const rsiMax = Math.max(...recentRSIs);
                
                // Calculate MACD for momentum
                const macdResult = MACD.calculate({
                    values: closes,
                    fastPeriod: 12,
                    slowPeriod: 26,
                    signalPeriod: 9,
                    SimpleMAOscillator: false,
                    SimpleMASignal: false
                });
                
                let macdTurning = false;
                if (macdResult.length >= 3) {
                    const lastMACD = macdResult[macdResult.length - 1];
                    const prevMACD = macdResult[macdResult.length - 2];
                    const prevPrevMACD = macdResult[macdResult.length - 3];
                    
                    if (actualDirection === 'long') {
                        // Check if MACD is turning up (was falling, now rising)
                        macdTurning = prevPrevMACD.histogram > prevMACD.histogram && 
                                     prevMACD.histogram < lastMACD.histogram;
                    } else {
                        // Check if MACD is turning down (was rising, now falling)
                        macdTurning = prevPrevMACD.histogram < prevMACD.histogram && 
                                     prevMACD.histogram > lastMACD.histogram;
                    }
                }
                
                // Volume analysis
                const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
                const currentVolume = volumes[volumes.length - 1];
                const volumeSpike = currentVolume > avgVolume * 1.15; // 15% above average
                
                // Price action analysis
                const priceNearEma9 = Math.abs(currentPrice - currentEma9) / currentPrice < 0.002; // Within 0.2%
                const priceNearEma21 = Math.abs(currentPrice - currentEma21) / currentPrice < 0.003; // Within 0.3%
                
                // Recent price momentum check (avoid buying after big moves)
                const recentHigh = Math.max(...closes.slice(-10)); // Last 10 candles
                const recentLow = Math.min(...closes.slice(-10));
                const priceRange = (recentHigh - recentLow) / recentLow;
                const pricePosition = (currentPrice - recentLow) / (recentHigh - recentLow); // 0 = bottom, 1 = top
                
                // Check if price has been pulling back
                const last3Candles = candles.slice(-3);
                let pullbackCount = 0;
                let rallyCount = 0;
                for (let i = 1; i < last3Candles.length; i++) {
                    if (last3Candles[i][4] < last3Candles[i-1][4]) pullbackCount++;
                    if (last3Candles[i][4] > last3Candles[i-1][4]) rallyCount++;
                }
                
                let entryScore = 0;
                let reasons = [];
                let penalties = [];
                
                if (actualDirection === 'long') {
                    // LONG entry conditions
                    
                    // PENALTIES - Avoid buying at tops
                    if (pricePosition > 0.8) {
                        entryScore -= 2;
                        penalties.push('Price near recent high');
                    }
                    if (currentRSI > 65) {
                        entryScore -= 1;
                        penalties.push(`RSI overbought (${currentRSI.toFixed(1)})`);
                    }
                    if (pullbackCount < 1) {
                        entryScore -= 1;
                        penalties.push('No recent pullback');
                    }
                    
                    // POSITIVE CONDITIONS
                    // 1. Price pullback to EMA support (but must be coming from above)
                    if (priceNearEma9 && currentPrice > prevEma9 && pullbackCount >= 1) {
                        entryScore += 3;
                        reasons.push('Bouncing off EMA9 support');
                    } else if (priceNearEma21 && currentPrice > currentEma21 && pullbackCount >= 1) {
                        entryScore += 3;
                        reasons.push('Bouncing off EMA21 support');
                    }
                    
                    // 2. RSI conditions - must show recovery, not just low
                    if (rsiMin < 35 && currentRSI > rsiMin + 5 && currentRSI < 55) {
                        entryScore += 3;
                        reasons.push(`RSI bouncing from oversold ${rsiMin.toFixed(1)}`);
                    } else if (currentRSI < 45 && currentRSI > 30 && pricePosition < 0.5) {
                        entryScore += 1;
                        reasons.push('RSI in lower range');
                    }
                    
                    // 3. MACD momentum turning positive (stronger signal)
                    if (macdTurning && pricePosition < 0.7) {
                        entryScore += 2;
                        reasons.push('MACD turning bullish');
                    }
                    
                    // 4. Volume confirmation with pullback
                    if (volumeSpike && currentPrice > candles[candles.length - 2][4] && pullbackCount >= 1) {
                        entryScore += 2;
                        reasons.push('Volume spike after pullback');
                    }
                    
                    // 5. Trend confirmation but not extended
                    if (currentPrice > currentEma9 && currentPrice > currentEma21 && pricePosition < 0.6) {
                        entryScore += 1;
                        reasons.push('Above EMAs but not extended');
                    }
                    
                } else {
                    // SHORT entry conditions
                    
                    // PENALTIES - Avoid shorting at bottoms
                    if (pricePosition < 0.2) {
                        entryScore -= 2;
                        penalties.push('Price near recent low');
                    }
                    if (currentRSI < 35) {
                        entryScore -= 1;
                        penalties.push(`RSI oversold (${currentRSI.toFixed(1)})`);
                    }
                    if (rallyCount < 1) {
                        entryScore -= 1;
                        penalties.push('No recent rally');
                    }
                    
                    // POSITIVE CONDITIONS
                    // 1. Price rally to EMA resistance (but must be coming from below)
                    if (priceNearEma9 && currentPrice < prevEma9 && rallyCount >= 1) {
                        entryScore += 3;
                        reasons.push('Rejected at EMA9 resistance');
                    } else if (priceNearEma21 && currentPrice < currentEma21 && rallyCount >= 1) {
                        entryScore += 3;
                        reasons.push('Rejected at EMA21 resistance');
                    }
                    
                    // 2. RSI conditions - must show weakness, not just high
                    if (rsiMax > 65 && currentRSI < rsiMax - 5 && currentRSI > 45) {
                        entryScore += 3;
                        reasons.push(`RSI falling from overbought ${rsiMax.toFixed(1)}`);
                    } else if (currentRSI > 55 && currentRSI < 70 && pricePosition > 0.5) {
                        entryScore += 1;
                        reasons.push('RSI in upper range');
                    }
                    
                    // 3. MACD momentum turning negative (stronger signal)
                    if (macdTurning && pricePosition > 0.3) {
                        entryScore += 2;
                        reasons.push('MACD turning bearish');
                    }
                    
                    // 4. Volume confirmation with rally
                    if (volumeSpike && currentPrice < candles[candles.length - 2][4] && rallyCount >= 1) {
                        entryScore += 2;
                        reasons.push('Volume spike after rally');
                    }
                    
                    // 5. Trend confirmation but not oversold
                    if (currentPrice < currentEma9 && currentPrice < currentEma21 && pricePosition > 0.4) {
                        entryScore += 1;
                        reasons.push('Below EMAs but not oversold');
                    }
                }
                
                // Decision based on entry score (higher threshold for better entries)
                const threshold = 4; // Increased from 3 to 4 for stricter entry
                const shouldEnter = entryScore >= threshold;
                
                console.log(`  Entry Score: ${entryScore}/${threshold}`);
                if (penalties.length > 0) {
                    console.log(`  ⚠️ Penalties: ${penalties.join(', ')}`);
                }
                if (reasons.length > 0) {
                    console.log(`  ✓ Conditions: ${reasons.join(', ')}`);
                }
                console.log(`  Price Position: ${(pricePosition * 100).toFixed(1)}% (0%=low, 100%=high)`);
                console.log(`  Decision: ${shouldEnter ? '✅ ENTER NOW' : '⏳ WAIT FOR BETTER ENTRY'}`);
                
                return shouldEnter;
                
            } catch (error) {
                console.error('Error in smart entry detection:', error);
                // Allow entry on error to not block the bot
                return true;
            }
        }
    };

})
