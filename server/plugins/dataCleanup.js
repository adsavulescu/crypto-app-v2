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
            const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
            
            // Simple cleanup - just remove very old records
            const deletedPrices = await assetPriceSchema.deleteMany({
                timestamp: { $lt: thirtyDaysAgo }
            });
            
            const deletedBalances = await balanceSchema.deleteMany({
                timestamp: { $lt: new Date(now - 90 * 24 * 60 * 60 * 1000) } // Keep balance data longer
            });
            
            console.log('[Data Cleanup] Cleanup completed:', {
                oldPricesDeleted: deletedPrices.deletedCount,
                oldBalancesDeleted: deletedBalances.deletedCount
            });
            
            return {
                success: true,
                cleanup: {
                    oldPricesDeleted: deletedPrices.deletedCount,
                    oldBalancesDeleted: deletedBalances.deletedCount
                }
            };
        } catch (error) {
            console.error('[Data Cleanup] Error during cleanup:', error);
        }
    }
})