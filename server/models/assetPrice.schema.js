import { defineMongooseModel } from '#nuxt/mongoose'

export const assetPriceSchema = defineMongooseModel({
    name: 'assetPrice',
    schema: {
        userID: {
            type: String,
            required: true,
            index: true
        },
        exchange: {
            type: String,
            required: true,
            index: true
        },
        coin: {
            type: String,
            required: true,
            index: true
        },
        price: {
            type: Number,
            required: true
        },
        balance: {
            type: Number,
            required: true
        },
        usdValue: {
            type: Number,
            required: true
        },
        timestamp: {
            type: Date,
            required: true,
            index: true
        }
    },
    options: {
        // Create compound index for efficient queries
        indexes: [
            { userID: 1, exchange: 1, coin: 1, timestamp: -1 }
        ]
    }
})