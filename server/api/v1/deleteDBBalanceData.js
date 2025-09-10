import { createError } from 'h3';
import { balanceSchema } from "~/server/models/balance.schema";
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
        // Delete all balance records for this user
        const balanceResult = await balanceSchema.deleteMany({ userID: userId });
        
        // Delete all asset price records for this user
        const priceResult = await assetPriceSchema.deleteMany({ userID: userId });
        
        return {
            success: true,
            message: 'Balance data deleted successfully',
            deleted: {
                balanceRecords: balanceResult.deletedCount,
                priceRecords: priceResult.deletedCount
            }
        };
    } catch (error) {
        throw createError({
            statusCode: 500,
            statusMessage: `Failed to delete balance data: ${error.message}`
        });
    }
});