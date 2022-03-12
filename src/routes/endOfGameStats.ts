import { ReplayManager } from "../ReplayManager";

export default async function routes(fastify) {
    fastify.get('/endOfGameStats/:region/:gameId/null', async (request, reply) => {
        const region = request.params.region;
        const gameId = request.params.gameId;
        if (!region || !gameId) {
            reply.code(400).send("Missing parameters");
            return;
        }
        if (!fastify.spectator_servers[region]) {
            reply.code(400).send("Invalid region");
            return;
        }
        try {
            return await ReplayManager.getInstance().endOfGameStats(region, gameId, request.ip);
        } catch {
            reply.code(404).type('text/html').send('Game or end of game not found');
        }
    });
}