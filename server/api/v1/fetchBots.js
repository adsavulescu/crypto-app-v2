// server/api/v1/fetchBots.js
import { dcaBotSchema } from '~/server/models/dcaBot.schema';

export default defineEventHandler(async (event) => {
    const { userID } = getQuery(event);

    if (!userID) {
        throw createError({ statusCode: 400, statusMessage: 'Missing userID parameter' });
    }

    try {
        const bots = await dcaBotSchema.find({ userID });
        return { data: bots };
    } catch (error) {
        throw createError({ statusCode: 500, statusMessage: 'Failed to fetch bots' });
    }
});
