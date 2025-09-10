import { createError } from 'h3';
import { balanceSchema } from "~/server/models/balance.schema";
import { assetPriceSchema } from "~/server/models/assetPrice.schema";

export default defineEventHandler(async (event) => {
    const nitroApp = useNitroApp();
    const query = getQuery(event);
    
    // Get userId from authenticated context
    const userId = event.context.userId;
    
    if (!userId) {
        throw createError({ 
            statusCode: 401, 
            statusMessage: 'Authentication required' 
        });
    }
    
    // Exchange parameter is optional - if not provided, fetch all exchanges
    const exchangeFilter = query.exchange;
    
    try {
        // Fetch live balance from exchange(s)
        let response;
        if (exchangeFilter) {
            // Fetch balance for specific exchange
            response = await nitroApp.ccxtw.fetchBalance(userId, exchangeFilter);
            
            if (response.success && response.data) {
                // Calculate total USD value
                let totalUSD = 0;
                const formattedBalance = [];
                
                for (const [coin, balance] of Object.entries(response.data)) {
                    if (balance.total > 0) {
                        // Get current price in USD
                        let usdValue = 0;
                        try {
                            if (coin === 'USDT' || coin === 'USD') {
                                usdValue = balance.total;
                            } else {
                                const ticker = await nitroApp.ccxtw.fetchTicker(userId, exchangeFilter, `${coin}/USDT`);
                                if (ticker.success && ticker.data) {
                                    usdValue = balance.total * ticker.data.last;
                                }
                            }
                        } catch (err) {
                            console.log(`Could not fetch price for ${coin}:`, err.message);
                        }
                        
                        formattedBalance.push({
                            coin,
                            free: balance.free || 0,
                            used: balance.used || 0,
                            total: balance.total || 0,
                            usdt: usdValue
                        });
                        
                        totalUSD += usdValue;
                        
                        // Store individual asset price for tracking
                        // Only store if significant value change or enough time has passed
                        const now = new Date();
                        const fiveMinutesAgo = new Date(now - 5 * 60 * 1000);
                        
                        // Check if we have a recent record
                        const recentRecord = await assetPriceSchema.findOne({
                            userID: userId,
                            exchange: exchangeFilter,
                            coin,
                            timestamp: { $gte: fiveMinutesAgo }
                        }).sort({ timestamp: -1 });
                        
                        const currentPrice = balance.total > 0 ? usdValue / balance.total : 0;
                        
                        // Only save if no recent record OR price changed significantly (>1%)
                        if (!recentRecord || 
                            Math.abs((currentPrice - recentRecord.price) / recentRecord.price) > 0.01) {
                            
                            const priceDoc = new assetPriceSchema({
                                userID: userId,
                                exchange: exchangeFilter,
                                coin,
                                price: currentPrice,
                                balance: balance.total,
                                usdValue: usdValue,
                                timestamp: now
                            });
                            
                            await priceDoc.save();
                        }
                    }
                }
                
                // Sort by USD value descending
                formattedBalance.sort((a, b) => b.usdt - a.usdt);
                
                // Save to database for historical tracking
                const balanceDoc = new balanceSchema({
                    userID: userId,
                    exchange: exchangeFilter,
                    balance: formattedBalance,
                    totalUSD: totalUSD,
                    timestamp: new Date()
                });
                
                await balanceDoc.save();
                
                return {
                    success: true,
                    exchange: exchangeFilter,
                    balance: formattedBalance,
                    totalUSD: totalUSD,
                    timestamp: new Date()
                };
            }
        } else {
            // Fetch balance for all user exchanges
            const { userExchangesSchema } = await import("~/server/models/userExchanges.schema");
            const userExchanges = await userExchangesSchema.find({ userID: userId });
            
            const results = [];
            
            for (const exchangeConfig of userExchanges) {
                try {
                    const balanceResponse = await nitroApp.ccxtw.fetchBalance(userId, exchangeConfig.exchange);
                    
                    if (balanceResponse.success && balanceResponse.data) {
                        let totalUSD = 0;
                        const formattedBalance = [];
                        
                        for (const [coin, balance] of Object.entries(balanceResponse.data)) {
                            if (balance.total > 0) {
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
                                    console.log(`Could not fetch price for ${coin}:`, err.message);
                                }
                                
                                formattedBalance.push({
                                    coin,
                                    free: balance.free || 0,
                                    used: balance.used || 0,
                                    total: balance.total || 0,
                                    usdt: usdValue
                                });
                                
                                totalUSD += usdValue;
                                
                                // Store individual asset price for tracking
                                // Only store if significant value change or enough time has passed
                                const now = new Date();
                                const fiveMinutesAgo = new Date(now - 5 * 60 * 1000);
                                
                                // Check if we have a recent record
                                const recentRecord = await assetPriceSchema.findOne({
                                    userID: userId,
                                    exchange: exchangeConfig.exchange,
                                    coin,
                                    timestamp: { $gte: fiveMinutesAgo }
                                }).sort({ timestamp: -1 });
                                
                                const currentPrice = balance.total > 0 ? usdValue / balance.total : 0;
                                
                                // Only save if no recent record OR price changed significantly (>1%)
                                if (!recentRecord || 
                                    Math.abs((currentPrice - recentRecord.price) / recentRecord.price) > 0.01) {
                                    
                                    const priceDoc = new assetPriceSchema({
                                        userID: userId,
                                        exchange: exchangeConfig.exchange,
                                        coin,
                                        price: currentPrice,
                                        balance: balance.total,
                                        usdValue: usdValue,
                                        timestamp: now
                                    });
                                    
                                    await priceDoc.save();
                                }
                            }
                        }
                        
                        // Sort by USD value descending
                        formattedBalance.sort((a, b) => b.usdt - a.usdt);
                        
                        // Save to database
                        const balanceDoc = new balanceSchema({
                            userID: userId,
                            exchange: exchangeConfig.exchange,
                            balance: formattedBalance,
                            totalUSD: totalUSD,
                            timestamp: new Date()
                        });
                        
                        await balanceDoc.save();
                        
                        results.push({
                            exchange: exchangeConfig.exchange,
                            balance: formattedBalance,
                            totalUSD: totalUSD,
                            timestamp: new Date()
                        });
                    }
                } catch (err) {
                    console.error(`Error fetching balance for ${exchangeConfig.exchange}:`, err);
                    results.push({
                        exchange: exchangeConfig.exchange,
                        error: err.message,
                        balance: [],
                        totalUSD: 0
                    });
                }
            }
            
            return {
                success: true,
                exchanges: results,
                totalPortfolioValue: results.reduce((sum, ex) => sum + ex.totalUSD, 0)
            };
        }
    } catch (error) {
        console.error('Error fetching live balance:', error);
        throw createError({
            statusCode: 500,
            statusMessage: `Failed to fetch balance: ${error.message}`
        });
    }
})