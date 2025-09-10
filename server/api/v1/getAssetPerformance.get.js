import { createError } from 'h3';
import { assetPriceSchema } from "~/server/models/assetPrice.schema";

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
        
        // Get current prices (most recent for each asset)
        const currentPrices = await assetPriceSchema.aggregate([
            {
                $match: {
                    userID: userId,
                    timestamp: { $gte: new Date(now - 60 * 60 * 1000) } // Last hour
                }
            },
            {
                $sort: { timestamp: -1 }
            },
            {
                $group: {
                    _id: { exchange: '$exchange', coin: '$coin' },
                    price: { $first: '$price' },
                    usdValue: { $first: '$usdValue' },
                    balance: { $first: '$balance' },
                    timestamp: { $first: '$timestamp' }
                }
            }
        ]);
        
        // Get 24h ago prices
        const historicalPrices = await assetPriceSchema.aggregate([
            {
                $match: {
                    userID: userId,
                    timestamp: { 
                        $gte: new Date(oneDayAgo - 60 * 60 * 1000), // 25 hours ago
                        $lte: new Date(oneDayAgo + 60 * 60 * 1000)  // 23 hours ago
                    }
                }
            },
            {
                $sort: { timestamp: -1 }
            },
            {
                $group: {
                    _id: { exchange: '$exchange', coin: '$coin' },
                    price: { $first: '$price' },
                    usdValue: { $first: '$usdValue' },
                    balance: { $first: '$balance' },
                    timestamp: { $first: '$timestamp' }
                }
            }
        ]);
        
        // Calculate performance for each asset
        const performance = [];
        
        currentPrices.forEach(current => {
            const historical = historicalPrices.find(h => 
                h._id.exchange === current._id.exchange && 
                h._id.coin === current._id.coin
            );
            
            if (historical && historical.price > 0) {
                const priceChange = ((current.price - historical.price) / historical.price) * 100;
                const valueChange = current.usdValue - (historical.balance * current.price); // Value change based on current holdings
                
                performance.push({
                    exchange: current._id.exchange,
                    coin: current._id.coin,
                    currentPrice: current.price,
                    historicalPrice: historical.price,
                    currentValue: current.usdValue,
                    priceChange24h: priceChange,
                    valueChange24h: valueChange,
                    balance: current.balance
                });
            }
        });
        
        // Sort by performance
        performance.sort((a, b) => b.priceChange24h - a.priceChange24h);
        
        // Get best and worst performers (minimum $50 value to be considered)
        const significantAssets = performance.filter(p => p.currentValue >= 50);
        
        const bestPerformer = significantAssets.length > 0 ? significantAssets[0] : null;
        const worstPerformer = significantAssets.length > 0 ? significantAssets[significantAssets.length - 1] : null;
        
        return {
            success: true,
            bestPerformer: bestPerformer ? {
                coin: bestPerformer.coin,
                change: bestPerformer.priceChange24h.toFixed(2),
                value: bestPerformer.currentValue,
                exchange: bestPerformer.exchange
            } : null,
            worstPerformer: worstPerformer ? {
                coin: worstPerformer.coin,
                change: worstPerformer.priceChange24h.toFixed(2),
                value: worstPerformer.currentValue,
                exchange: worstPerformer.exchange
            } : null,
            allPerformance: performance
        };
        
    } catch (error) {
        console.error('Error calculating asset performance:', error);
        throw createError({
            statusCode: 500,
            statusMessage: `Failed to calculate performance: ${error.message}`
        });
    }
})