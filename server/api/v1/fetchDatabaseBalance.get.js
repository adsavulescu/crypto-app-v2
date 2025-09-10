import { createError } from 'h3';
import { balanceSchema } from "~/server/models/balance.schema";

export default defineEventHandler(async (event) => {
    // Get userId from authenticated context
    const userId = event.context.userId;
    
    if (!userId) {
        throw createError({ 
            statusCode: 401, 
            statusMessage: 'Authentication required' 
        });
    }
    
    try {
        // Get the most recent balance snapshot for each exchange
        const { userExchangesSchema } = await import("~/server/models/userExchanges.schema");
        const userExchanges = await userExchangesSchema.find({ userID: userId });
        
        // Fetch all balances in PARALLEL for speed
        const balancePromises = userExchanges.map(async (exchangeConfig) => {
            const latestBalance = await balanceSchema.findOne({
                userID: userId,
                exchange: exchangeConfig.exchange
            }).sort({ timestamp: -1 });
            
            if (latestBalance) {
                return {
                    exchange: exchangeConfig.exchange,
                    balance: latestBalance.balance || [],
                    totalUSD: latestBalance.totalUSD || 0,
                    timestamp: latestBalance.timestamp,
                    isStale: Date.now() - new Date(latestBalance.timestamp) > 30 * 60 * 1000 // Older than 30 min
                };
            } else {
                // No snapshot available for this exchange
                return {
                    exchange: exchangeConfig.exchange,
                    balance: [],
                    totalUSD: 0,
                    timestamp: null,
                    noData: true
                };
            }
        });
        
        const results = await Promise.all(balancePromises);
        
        
        return {
            success: true,
            exchanges: results,
            totalPortfolioValue: results.reduce((sum, ex) => sum + ex.totalUSD, 0),
            fromCache: true
        };
        
    } catch (error) {
        console.error('Error fetching latest snapshot:', error);
        throw createError({
            statusCode: 500,
            statusMessage: `Failed to fetch snapshot: ${error.message}`
        });
    }
})