export default defineNitroPlugin((nitroApp) => {
    // Schedule cleanup to run every 6 hours
    // Don't run on startup to avoid slowing down server start
    setTimeout(() => {
        performDirectCleanup(); // Run first cleanup after 1 minute
        
        // Then schedule regular cleanups
        setInterval(() => {
            performDirectCleanup();
        }, 6 * 60 * 60 * 1000);
    }, 60000); // Wait 1 minute after startup
    
    async function performDirectCleanup() {
        try {
            console.log('[Data Cleanup] Starting scheduled cleanup...');
            const { assetPriceSchema } = await import("~/server/models/assetPrice.schema");
            const { balanceSchema } = await import("~/server/models/balance.schema");
            
            const now = new Date();
            const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
            const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
            
            // 1. Delete all records older than 30 days
            const deletedOldPrices = await assetPriceSchema.deleteMany({
                timestamp: { $lt: thirtyDaysAgo }
            });
            
            // 2. For records between 7-30 days, keep only hourly snapshots
            const pricesToThin = await assetPriceSchema.aggregate([
                {
                    $match: {
                        timestamp: {
                            $gte: thirtyDaysAgo,
                            $lt: sevenDaysAgo
                        }
                    }
                },
                {
                    $group: {
                        _id: {
                            userID: '$userID',
                            exchange: '$exchange',
                            coin: '$coin',
                            hour: {
                                $dateToString: {
                                    format: '%Y-%m-%d-%H',
                                    date: '$timestamp'
                                }
                            }
                        },
                        keepId: { $first: '$_id' },
                        allIds: { $push: '$_id' }
                    }
                }
            ]);
            
            // Delete all but the first record of each hour
            let thinnedCount = 0;
            for (const group of pricesToThin) {
                const idsToDelete = group.allIds.filter(id => !id.equals(group.keepId));
                if (idsToDelete.length > 0) {
                    await assetPriceSchema.deleteMany({ _id: { $in: idsToDelete } });
                    thinnedCount += idsToDelete.length;
                }
            }
            
            // 3. For balance collection: Keep only daily snapshots after 30 days
            const deletedOldBalances = await balanceSchema.deleteMany({
                timestamp: { $lt: new Date(now - 90 * 24 * 60 * 60 * 1000) }
            });
            
            const balancesToThin = await balanceSchema.aggregate([
                {
                    $match: {
                        timestamp: { 
                            $gte: new Date(now - 90 * 24 * 60 * 60 * 1000),
                            $lt: thirtyDaysAgo 
                        }
                    }
                },
                {
                    $group: {
                        _id: {
                            userID: '$userID',
                            exchange: '$exchange',
                            day: {
                                $dateToString: {
                                    format: '%Y-%m-%d',
                                    date: '$timestamp'
                                }
                            }
                        },
                        keepId: { $first: '$_id' },
                        allIds: { $push: '$_id' }
                    }
                }
            ]);
            
            let balanceThinnedCount = 0;
            for (const group of balancesToThin) {
                const idsToDelete = group.allIds.filter(id => !id.equals(group.keepId));
                if (idsToDelete.length > 0) {
                    await balanceSchema.deleteMany({ _id: { $in: idsToDelete } });
                    balanceThinnedCount += idsToDelete.length;
                }
            }
            
            console.log('[Data Cleanup] Cleanup completed:', {
                oldPricesDeleted: deletedOldPrices.deletedCount,
                priceRecordsThinned: thinnedCount,
                oldBalancesDeleted: deletedOldBalances.deletedCount,
                balanceRecordsThinned: balanceThinnedCount
            });
            
            return {
                success: true,
                cleanup: {
                    oldPricesDeleted: deletedOldPrices.deletedCount,
                    priceRecordsThinned: thinnedCount,
                    oldBalancesDeleted: deletedOldBalances.deletedCount,
                    balanceRecordsThinned: balanceThinnedCount
                }
            };
        } catch (error) {
            console.error('[Data Cleanup] Error during cleanup:', error);
        }
    }
})