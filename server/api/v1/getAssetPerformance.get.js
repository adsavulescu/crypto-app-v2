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
        const now = new Date();
        const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
        
        // Get user's exchanges
        const { userExchangesSchema } = await import("~/server/models/userExchanges.schema");
        const userExchanges = await userExchangesSchema.find({ userID: userId });
        
        // Aggregate all current and historical assets across all exchanges
        const currentAssets = new Map(); // coin -> { totalValue, exchanges }
        const historicalAssets = new Map(); // coin -> { totalValue }
        
        await Promise.all(userExchanges.map(async (exchangeConfig) => {
            // Get most recent balance
            const currentBalance = await balanceSchema.findOne({
                userID: userId,
                exchange: exchangeConfig.exchange
            }).sort({ timestamp: -1 });
            
            // Get balance from ~24h ago
            const historicalBalance = await balanceSchema.findOne({
                userID: userId,
                exchange: exchangeConfig.exchange,
                timestamp: { $lte: oneDayAgo }
            }).sort({ timestamp: -1 });
            
            // Process current balances
            if (currentBalance && currentBalance.balance) {
                currentBalance.balance.forEach(asset => {
                    if (asset.total > 0 && asset.usdt > 0.01) {
                        const existing = currentAssets.get(asset.coin) || { totalValue: 0, exchanges: [] };
                        currentAssets.set(asset.coin, {
                            totalValue: existing.totalValue + (parseFloat(asset.usdt) || 0),
                            exchanges: [...existing.exchanges, exchangeConfig.exchange]
                        });
                    }
                });
            }
            
            // Process historical balances
            if (historicalBalance && historicalBalance.balance) {
                historicalBalance.balance.forEach(asset => {
                    if (asset.total > 0 && asset.usdt > 0.01) {
                        const existing = historicalAssets.get(asset.coin) || { totalValue: 0 };
                        historicalAssets.set(asset.coin, {
                            totalValue: existing.totalValue + (parseFloat(asset.usdt) || 0)
                        });
                    }
                });
            }
        }));
        
        // Calculate performance for each asset
        const performance = [];
        
        currentAssets.forEach((current, coin) => {
            const historical = historicalAssets.get(coin);
            
            let changePercent = 0;
            if (historical && historical.totalValue > 0) {
                // Asset existed 24h ago - calculate real change
                changePercent = ((current.totalValue - historical.totalValue) / historical.totalValue) * 100;
            } else if (!historical && current.totalValue > 0) {
                // New asset (wasn't in portfolio 24h ago)
                changePercent = 100;
            }
            
            if (current.totalValue >= 10) { // Only include assets worth at least $10
                performance.push({
                    coin,
                    currentValue: current.totalValue,
                    historicalValue: historical ? historical.totalValue : 0,
                    change: parseFloat(changePercent.toFixed(2)),
                    exchanges: current.exchanges
                });
            }
        });
        
        // Sort by absolute change to find best and worst
        performance.sort((a, b) => b.change - a.change);
        
        // Filter for significant holdings (at least $50) for best/worst
        const significantAssets = performance.filter(p => p.currentValue >= 50);
        
        const bestPerformer = significantAssets.length > 0 ? significantAssets[0] : null;
        const worstPerformer = significantAssets.length > 0 ? significantAssets[significantAssets.length - 1] : null;
        
        return {
            success: true,
            bestPerformer: bestPerformer ? {
                coin: bestPerformer.coin,
                change: bestPerformer.change,
                value: bestPerformer.currentValue.toFixed(2),
                exchanges: bestPerformer.exchanges
            } : null,
            worstPerformer: worstPerformer ? {
                coin: worstPerformer.coin,
                change: worstPerformer.change,
                value: worstPerformer.currentValue.toFixed(2),
                exchanges: worstPerformer.exchanges
            } : null,
            allPerformance: performance,
            totalAssets: performance.length
        };
        
    } catch (error) {
        console.error('Error calculating asset performance:', error);
        throw createError({
            statusCode: 500,
            statusMessage: `Failed to calculate performance: ${error.message}`
        });
    }
})