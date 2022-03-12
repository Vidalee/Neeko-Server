import { ReplayManager } from "../ReplayManager";

export default async function routes(fastify) {
    fastify.get('/getLastChunkInfo/:region/:gameId/:chunkId/token', async (request, reply) => {
        const region = request.params.region;
        const gameId = request.params.gameId;
        const chunkId = request.params.chunkId;

        if (!region || !gameId || !chunkId) {
            reply.code(400).send("Missing parameters");
            return;
        }
        if (!fastify.spectator_servers[region]) {
            reply.code(400).send("Invalid region");
            return;
        }
        try {
            return ReplayManager.getInstance().getLastChunkInfo(region, gameId, request.ip);
        } catch {
            reply.code(404).type('text/html').send('Unexpected error, look at the logs');
        }
    });
}