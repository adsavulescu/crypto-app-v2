import { createError } from 'h3';

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
    
    // This endpoint ONLY fetches data, NEVER saves to database
    // Use /api/v1/storeDatabaseBalance for saving data
    
    try {
        // Fetch live balance from exchange(s)
        let response;
        if (exchangeFilter) {
            // Fetch balance for specific exchange
            response = await nitroApp.ccxtw.fetchBalance(userId, exchangeFilter);
            
            if (response.success && response.data) {
                // Calculate total USD value
                let totalUSD = 0;
                
                // First, collect all coins that need price fetching
                const coinsNeedingPrices = [];
                const balanceEntries = [];
                
                for (const [coin, balance] of Object.entries(response.data)) {
                    if (balance.total > 0) {
                        balanceEntries.push({ coin, balance });
                        if (coin !== 'USDT' && coin !== 'USD') {
                            coinsNeedingPrices.push(coin);
                        }
                    }
                }
                
                // Fetch ALL prices in PARALLEL for massive speed improvement
                const pricePromises = coinsNeedingPrices.map(async coin => {
                    try {
                        const ticker = await nitroApp.ccxtw.fetchTicker(userId, exchangeFilter, `${coin}/USDT`);
                        return { coin, price: ticker.success && ticker.data ? ticker.data.last : 0 };
                    } catch (err) {
                        return { coin, price: 0 };
                    }
                });
                
                const prices = await Promise.all(pricePromises);
                const priceMap = Object.fromEntries(prices.map(p => [p.coin, p.price]));
                
                // Now build the formatted balance with prices
                const formattedBalance = [];
                for (const { coin, balance } of balanceEntries) {
                    let usdValue = 0;
                    if (coin === 'USDT' || coin === 'USD') {
                        usdValue = balance.total;
                    } else {
                        usdValue = balance.total * (priceMap[coin] || 0);
                    }
                    
                    formattedBalance.push({
                        coin,
                        free: balance.free || 0,
                        used: balance.used || 0,
                        total: balance.total || 0,
                        usdt: usdValue
                    });
                    
                    totalUSD += usdValue;
                }
                
                // Sort by USD value descending
                formattedBalance.sort((a, b) => b.usdt - a.usdt);
                
                // NO LONGER SAVING DATA HERE - use storeDatabaseBalance endpoint
                
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
            
            // Fetch from all exchanges in PARALLEL for speed
            const balancePromises = userExchanges.map(async (exchangeConfig) => {
                try {
                    const balanceResponse = await nitroApp.ccxtw.fetchBalance(userId, exchangeConfig.exchange);
                    
                    if (balanceResponse.success && balanceResponse.data) {
                        let totalUSD = 0;
                        
                        // First, collect all coins that need price fetching
                        const coinsNeedingPrices = [];
                        const balanceEntries = [];
                        
                        for (const [coin, balance] of Object.entries(balanceResponse.data)) {
                            if (balance.total > 0) {
                                balanceEntries.push({ coin, balance });
                                if (coin !== 'USDT' && coin !== 'USD') {
                                    coinsNeedingPrices.push(coin);
                                }
                            }
                        }
                        
                        // Fetch ALL prices in PARALLEL
                        const pricePromises = coinsNeedingPrices.map(async coin => {
                            try {
                                const ticker = await nitroApp.ccxtw.fetchTicker(userId, exchangeConfig.exchange, `${coin}/USDT`);
                                return { coin, price: ticker.success && ticker.data ? ticker.data.last : 0 };
                            } catch (err) {
                                return { coin, price: 0 };
                            }
                        });
                        
                        const prices = await Promise.all(pricePromises);
                        const priceMap = Object.fromEntries(prices.map(p => [p.coin, p.price]));
                        
                        // Now build the formatted balance with prices
                        const formattedBalance = [];
                        for (const { coin, balance } of balanceEntries) {
                            let usdValue = 0;
                            if (coin === 'USDT' || coin === 'USD') {
                                usdValue = balance.total;
                            } else {
                                usdValue = balance.total * (priceMap[coin] || 0);
                            }
                            
                            formattedBalance.push({
                                coin,
                                free: balance.free || 0,
                                used: balance.used || 0,
                                total: balance.total || 0,
                                usdt: usdValue
                            });
                            
                            totalUSD += usdValue;
                        }
                        
                        // Sort by USD value descending
                        formattedBalance.sort((a, b) => b.usdt - a.usdt);
                        
                        // NO LONGER SAVING DATA HERE - use storeDatabaseBalance endpoint
                        
                        return {
                            exchange: exchangeConfig.exchange,
                            balance: formattedBalance,
                            totalUSD: totalUSD,
                            timestamp: new Date()
                        };
                    }
                    
                    return {
                        exchange: exchangeConfig.exchange,
                        error: 'No balance data',
                        balance: [],
                        totalUSD: 0
                    };
                } catch (err) {
                    return {
                        exchange: exchangeConfig.exchange,
                        error: err.message,
                        balance: [],
                        totalUSD: 0
                    };
                }
            });
            
            // Wait for all exchanges to complete
            const results = await Promise.all(balancePromises);
            
            return {
                success: true,
                exchanges: results,
                totalPortfolioValue: results.reduce((sum, ex) => sum + ex.totalUSD, 0)
            };
        }
    } catch (error) {
        throw createError({
            statusCode: 500,
            statusMessage: `Failed to fetch balance: ${error.message}`
        });
    }
})