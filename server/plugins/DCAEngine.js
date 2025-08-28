import { setIntervalAsync } from "set-interval-async"
import { dcaBotSchema } from "~/server/models/dcaBot.schema"

export default defineNitroPlugin((nitroApp) => {
    startScheduler(nitroApp)
    // console.log('DCA Engine Loaded...')
})

function startScheduler(nitroApp) {
    // Track database update statistics
    let updateStats = {
        totalCycles: 0,
        totalUpdates: 0,
        lastReportTime: Date.now()
    };
    
    setIntervalAsync(async () => {
        try {
            updateStats.totalCycles++;
            // get all bots that are either running OR have an active deal to manage
            let activeBots = await dcaBotSchema.find({
                $or: [
                    { isRunning: true },
                    { 
                        isRunning: false,
                        'activeDeal.status': { 
                            $nin: ['START_NEW_DEAL', 'BOT_STOPPED', 'CLOSED_DEAL', null] 
                        }
                    }
                ]
            });
            for (let bot of activeBots) {
                try {
                    // Track if bot state changed to determine if we need to save
                    const originalStatus = bot.activeDeal.status;
                    const originalLogsLength = bot.logs.length;
                    const originalFilledOrdersLength = bot.activeDeal.filledOrders?.length || 0;
                    const originalProfit = bot.profit;
                    const originalDealProfit = bot.activeDeal.profit;
                    const originalClosedDealsLength = bot.closedDeals?.length || 0;
                    const originalBaseOrderId = bot.activeDeal.baseOrder?.id;
                    const originalSafetyOrderId = bot.activeDeal.safetyOrder?.id;
                    const originalTpOrderId = bot.activeDeal.takeProfitOrder?.id;
                    const originalStopLossOrderId = bot.activeDeal.stopLossOrder?.id;
                    const originalDetectedDirection = bot.activeDeal.detectedDirection;
                    const originalWaitingForEntry = bot.activeDeal.waitingForEntry;
                    let needsUpdate = false;
                    
                    // console.log(bot.activeDeal.status);

                    //NEW_DEAL --> 0
                    if (bot.activeDeal.status === 'START_NEW_DEAL') {
                        // Only start new deals if bot is running
                        if (bot.isRunning) {
                            // Check for auto direction
                            let actualDirection = bot.direction;
                            if (bot.direction === 'auto') {
                                // Only detect direction if we haven't already for this deal
                                if (!bot.activeDeal.detectedDirection) {
                                    actualDirection = await nitroApp.DCALib.detectAutoDirection(bot);
                                    // Store the detected direction for this deal
                                    bot.activeDeal.detectedDirection = actualDirection;
                                    console.log(`${nitroApp.DCALib.getCurrentTime()}: ${bot.symbol} - Auto direction detected: ${actualDirection}`);
                                } else {
                                    // Use already detected direction
                                    actualDirection = bot.activeDeal.detectedDirection;
                                }
                            } else if (bot.activeDeal && bot.activeDeal.detectedDirection) {
                                // Use previously detected direction if available (shouldn't happen for non-auto bots)
                                actualDirection = bot.activeDeal.detectedDirection;
                            }
                            
                            // Check smart entry conditions if enabled
                            if (bot.dealStartCondition === 'smartStart') {
                                const shouldEnter = await nitroApp.DCALib.detectSmartEntry(bot, actualDirection);
                                if (!shouldEnter) {
                                    // Update status to show we're waiting for entry
                                    if (!bot.activeDeal.waitingForEntry) {
                                        bot.activeDeal.waitingForEntry = true;
                                        bot.activeDeal.waitStartTime = Date.now();
                                        let log = `${nitroApp.DCALib.getCurrentTime()}: ${bot.symbol} - Waiting for smart entry conditions (${actualDirection})...`;
                                        bot.logs.push(log);
                                        console.log(log);
                                    }
                                    // Only update if we just started waiting (not every cycle)
                                    if (originalLogsLength !== bot.logs.length) {
                                        await dcaBotSchema.updateOne({_id: bot._id}, bot);
                                    }
                                    continue; // Skip to next bot
                                }
                                
                                // Clear waiting flag if we were waiting
                                if (bot.activeDeal.waitingForEntry) {
                                    const waitTime = Math.round((Date.now() - bot.activeDeal.waitStartTime) / 1000);
                                    let log = `${nitroApp.DCALib.getCurrentTime()}: ${bot.symbol} - Smart entry conditions met after ${waitTime}s! Starting deal...`;
                                    bot.logs.push(log);
                                    console.log(log);
                                    bot.activeDeal.waitingForEntry = false;
                                    bot.activeDeal.waitStartTime = null;
                                }
                            }
                            
                            let log = `${nitroApp.DCALib.getCurrentTime()}: ${bot.symbol} - NEW_DEAL - Side: ${actualDirection}`;
                            bot.logs.push(log);
                            console.log(log);

                            bot.activeDeal.status = 'PLACE_BASE_ORDER';
                        }
                    }

            //PLACE_BASE_ORDER
            if (bot.activeDeal.status === 'PLACE_BASE_ORDER') {
                bot = await nitroApp.DCALib.placeBaseOrder(bot);
            }

            //PLACE_SAFETY_ORDER
            if (bot.activeDeal.status === 'PLACE_SAFETY_ORDER') {
                bot = await nitroApp.DCALib.placeSafetyOrder(bot);
            }

            //PLACE_TAKE_PROFIT_ORDER
            if (bot.activeDeal.status === 'PLACE_TAKE_PROFIT_ORDER') {
                bot = await nitroApp.DCALib.placeTakeProfitOrder(bot);
            }

            //PLACE_STOP_LOSS_ORDER
            if (bot.activeDeal.status === 'PLACE_STOP_LOSS_ORDER') {
                bot = await nitroApp.DCALib.placeStopLossOrder(bot);
            }

            //WAIT_FOR_FILLS
            if (bot.activeDeal.status === 'WAIT_FOR_FILLS') {

                ///BASE_ORDER_FILLED?
                if (bot.activeDeal.baseOrder !== null){
                    bot = await nitroApp.DCALib.checkBaseOrder(bot);
                }

                ///SAFETY_ORDER_FILLED?
                if (bot.activeDeal.safetyOrder !== null){
                    bot = await nitroApp.DCALib.checkSafetyOrder(bot);
                }

                ///TAKE_PROFIT_ORDER_FILLED?
                if (bot.activeDeal.takeProfitOrder !== null){
                    bot = await nitroApp.DCALib.checkTakeProfitOrder(bot);
                }

                ///STOP_LOSS_ORDER_FILLED?
                if (bot.activeDeal.stopLossOrder !== null){
                    bot = await nitroApp.DCALib.checkStopLossOrder(bot);
                }
            }

            //SAFETY_ORDERS_NR_REACHED - waiting for TP to fill
            if (bot.activeDeal.status === 'SAFETY_ORDERS_NR_REACHED') {
                // Just continue checking for fills
                if (bot.activeDeal.takeProfitOrder !== null){
                    bot = await nitroApp.DCALib.checkTakeProfitOrder(bot);
                }
                if (bot.activeDeal.stopLossOrder !== null){
                    bot = await nitroApp.DCALib.checkStopLossOrder(bot);
                }
            }

            //ERROR_BASE_ORDER_FAILED - retry or stop bot
            if (bot.activeDeal.status === 'ERROR_BASE_ORDER_FAILED') {
                // Reset to try again after a delay
                bot.activeDeal.status = 'START_NEW_DEAL';
                let log = `${nitroApp.DCALib.getCurrentTime()}: ${bot.symbol} - Base order failed, restarting deal`;
                bot.logs.push(log);
                console.log(log);
            }

                    // Determine if we need to update the database
                    needsUpdate = 
                        // Status changed
                        bot.activeDeal.status !== originalStatus ||
                        // New logs were added
                        bot.logs.length !== originalLogsLength ||
                        // Orders were filled (filledOrders array grew)
                        (bot.activeDeal.filledOrders?.length || 0) !== originalFilledOrdersLength ||
                        // Profit changed
                        bot.profit !== originalProfit ||
                        bot.activeDeal.profit !== originalDealProfit ||
                        // New deal completed
                        (bot.closedDeals?.length || 0) !== originalClosedDealsLength ||
                        // New orders were placed (comparing order IDs)
                        bot.activeDeal.baseOrder?.id !== originalBaseOrderId ||
                        bot.activeDeal.safetyOrder?.id !== originalSafetyOrderId ||
                        bot.activeDeal.takeProfitOrder?.id !== originalTpOrderId ||
                        bot.activeDeal.stopLossOrder?.id !== originalStopLossOrderId ||
                        // Direction was detected (for auto mode)
                        bot.activeDeal.detectedDirection !== originalDetectedDirection ||
                        // Waiting for entry status changed  
                        bot.activeDeal.waitingForEntry !== originalWaitingForEntry;
                    
                    // Only update database if something actually changed
                    if (needsUpdate) {
                        await dcaBotSchema.updateOne({_id: bot._id}, bot);
                        updateStats.totalUpdates++;
                        // console.log(`Updated bot ${bot.symbol} - Status: ${bot.activeDeal.status}`);
                    }
                } catch (botError) {
                    console.error(`Error processing bot ${bot._id}:`, botError);
                    let errorLog = `${nitroApp.DCALib.getCurrentTime()}: ${bot.symbol} - ERROR: ${botError.message}`;
                    bot.logs.push(errorLog);
                    await dcaBotSchema.updateOne({_id: bot._id}, { $push: { logs: errorLog } });
                }
            }
            
            // Report statistics every 60 seconds
            const now = Date.now();
            if (now - updateStats.lastReportTime > 60000) {
                const efficiency = updateStats.totalCycles > 0 
                    ? ((1 - updateStats.totalUpdates / updateStats.totalCycles) * 100).toFixed(1)
                    : 0;
                console.log(`📊 DCA Engine DB Efficiency: ${efficiency}% saved (${updateStats.totalUpdates} updates in ${updateStats.totalCycles} cycles)`);
                // Reset counters
                updateStats.totalCycles = 0;
                updateStats.totalUpdates = 0;
                updateStats.lastReportTime = now;
            }
        } catch (error) {
            console.error('Error in DCA Engine scheduler:', error);
        }

    }, 1000);
}
