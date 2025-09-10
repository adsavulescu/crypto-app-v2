import { createError } from 'h3';
import { balanceSchema } from "~/server/models/balance.schema";
import { assetPriceSchema } from "~/server/models/assetPrice.schema";

// Mutex to prevent concurrent saves for the same user
const saveMutex = new Map();

export default defineEventHandler(async (event) => {
    const nitroApp = useNitroApp();
    
    // Get userId from authenticated context
    const userId = event.context.userId;
    
    if (!userId) {
        throw createError({ 
            statusCode: 401, 
            statusMessage: 'Authentication required' 
        });
    }
    
    // Check if a save is already in progress for this user
    if (saveMutex.has(userId)) {
        return {
            success: true,
            message: 'Balance snapshot already in progress',
            skipped: true
        };
    }
    
    // Set mutex
    saveMutex.set(userId, true);
    
    try {
        // Fetch live balance from all exchanges
        const { userExchangesSchema } = await import("~/server/models/userExchanges.schema");
        const userExchanges = await userExchangesSchema.find({ userID: userId });
        
        const now = new Date();
        const thirtyMinutesAgo = new Date(now - 30 * 60 * 1000);
        const fiveMinutesAgo = new Date(now - 5 * 60 * 1000);
        
        // Process all exchanges in parallel
        const exchangePromises = userExchanges.map(async (exchangeConfig) => {
            try {
                const balanceResponse = await nitroApp.ccxtw.fetchBalance(userId, exchangeConfig.exchange);
                
                if (balanceResponse.success && balanceResponse.data) {
                    let totalUSD = 0;
                    const formattedBalance = [];
                    
                    // First, collect all coins that need processing
                    const coinsToProcess = [];
                    for (const [coin, balance] of Object.entries(balanceResponse.data)) {
                        if (balance.total > 0) {
                            coinsToProcess.push({ coin, balance });
                        }
                    }
                    
                    // Fetch all prices in parallel
                    const pricePromises = coinsToProcess.map(async ({ coin, balance }) => {
                        let usdValue = 0;
                        try {
                            if (coin === 'USDT' || coin === 'USD') {
                                usdValue = balance.total;
                            } else {
                                const ticker = await nitroApp.ccxtw.fetchTicker(userId, exchangeConfig.exchange, `${coin}/USDT`);
                                if (ticker.success && ticker.data) {
                                    usdValue = balance.total * ticker.data.last;
                                }
                            }
                        } catch (err) {
                            // Silently skip if price fetch fails
                        }
                        
                        return {
                            coin,
                            free: balance.free || 0,
                            used: balance.used || 0,
                            total: balance.total || 0,
                            usdt: usdValue
                        };
                    });
                    
                    // Wait for all prices
                    const balanceData = await Promise.all(pricePromises);
                    
                    // Calculate total and build formatted balance
                    for (const item of balanceData) {
                        formattedBalance.push(item);
                        totalUSD += item.usdt;
                        
                        // Store individual asset price for tracking (process later in parallel)
                        const currentPrice = item.total > 0 ? item.usdt / item.total : 0;
                        
                        // Check for recent price record
                        const recentPriceRecord = await assetPriceSchema.findOne({
                            userID: userId,
                            exchange: exchangeConfig.exchange,
                            coin: item.coin,
                            timestamp: { $gte: fiveMinutesAgo }
                        }).sort({ timestamp: -1 });
                        
                        // Only save if no recent record OR price changed significantly (>1%)
                        if (!recentPriceRecord || 
                            Math.abs((currentPrice - recentPriceRecord.price) / recentPriceRecord.price) > 0.01) {
                            
                            const priceDoc = new assetPriceSchema({
                                userID: userId,
                                exchange: exchangeConfig.exchange,
                                coin: item.coin,
                                price: currentPrice,
                                balance: item.total,
                                usdValue: item.usdt,
                                timestamp: now
                            });
                            
                            await priceDoc.save();
                        }
                    }
                    
                    // Check if we should save balance snapshot
                    const recentBalance = await balanceSchema.findOne({
                        userID: userId,
                        exchange: exchangeConfig.exchange,
                        timestamp: { $gte: thirtyMinutesAgo }
                    }).sort({ timestamp: -1 });
                    
                    // Calculate value change - handle zero values properly
                    let shouldSave = false;
                    if (!recentBalance) {
                        shouldSave = true; // No recent record
                    } else if (recentBalance.totalUSD === 0 && totalUSD === 0) {
                        shouldSave = false; // Both zero, no need to save
                    } else if (recentBalance.totalUSD === 0 || totalUSD === 0) {
                        shouldSave = true; // One is zero, significant change
                    } else {
                        const valueChangePercent = Math.abs((totalUSD - recentBalance.totalUSD) / recentBalance.totalUSD);
                        shouldSave = valueChangePercent > 0.02; // 2% threshold
                    }
                    
                    // Only save if needed
                    if (shouldSave) {
                        const balanceDoc = new balanceSchema({
                            userID: userId,
                            exchange: exchangeConfig.exchange,
                            balance: formattedBalance,
                            totalUSD: totalUSD,
                            timestamp: now
                        });
                        
                        await balanceDoc.save();
                        return 1; // Return 1 to count saved snapshots
                    } else {
                        return 0;
                    }
                }
                return 0;
            } catch (err) {
                return 0;
            }
        });
        
        // Wait for all exchanges to complete
        const results = await Promise.all(exchangePromises);
        const totalSaved = results.reduce((sum, count) => sum + count, 0);
        
        return {
            success: true,
            message: `Stored ${totalSaved} balance snapshots`,
            timestamp: now
        };
        
    } catch (error) {
        throw createError({
            statusCode: 500,
            statusMessage: `Failed to store balance snapshot: ${error.message}`
        });
    } finally {
        // Always clear mutex
        saveMutex.delete(userId);
    }
})