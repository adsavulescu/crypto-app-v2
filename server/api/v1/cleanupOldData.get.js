import { assetPriceSchema } from "~/server/models/assetPrice.schema";
import { balanceSchema } from "~/server/models/balance.schema";

export default defineEventHandler(async (event) => {
    try {
        const now = new Date();
        
        // Keep detailed data for 7 days, hourly snapshots for 30 days
        const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
        
        // For assetPrice collection:
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
        
        // For balance collection:
        // Keep only daily snapshots after 30 days
        const balancesToThin = await balanceSchema.aggregate([
            {
                $match: {
                    timestamp: { $lt: thirtyDaysAgo }
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
        
        return {
            success: true,
            cleanup: {
                oldPricesDeleted: deletedOldPrices.deletedCount,
                priceRecordsThinned: thinnedCount,
                balanceRecordsThinned: balanceThinnedCount,
                timestamp: now
            }
        };
        
    } catch (error) {
        console.error('Cleanup error:', error);
        return {
            success: false,
            error: error.message
        };
    }
})