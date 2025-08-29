import { setIntervalAsync } from "set-interval-async"
import { dcaBotSchema } from "~/server/models/dcaBot.schema"

export default defineNitroPlugin((nitroApp) => {
    startScheduler(nitroApp)
    // console.log('DCA Engine Loaded...')
})

function startScheduler(nitroApp) {
    setIntervalAsync(async () => {
        try {
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
                                    // Stay in START_NEW_DEAL status to check again next cycle
                                    await dcaBotSchema.updateOne({_id: bot._id}, bot);
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

                    await dcaBotSchema.updateOne({_id: bot._id}, bot);
                } catch (botError) {
                    console.error(`Error processing bot ${bot._id}:`, botError);
                    let errorLog = `${nitroApp.DCALib.getCurrentTime()}: ${bot.symbol} - ERROR: ${botError.message}`;
                    bot.logs.push(errorLog);
                    await dcaBotSchema.updateOne({_id: bot._id}, { $push: { logs: errorLog } });
                }
            }
        } catch (error) {
            console.error('Error in DCA Engine scheduler:', error);
        }

    }, 1000);
}
