import { ReplayManager } from "../ReplayManager";

export default async function routes(fastify) {
    fastify.get('/getGameMetaData/:region/:gameId/:random/token', async (request, reply) => {

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
            return ReplayManager.getInstance().getGameMetaData(region, gameId, request.ip);
        } catch {
            reply.code(404).type('text/html').send('Game or metadata not found');
        }
    });
}