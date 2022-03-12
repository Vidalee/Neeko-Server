import { ReplayManager } from "../ReplayManager";

export default async function routes(fastify) {
    fastify.get('/getKeyFrame/:region/:gameId/:keyFrameId/token', async (request, reply) => {
        const region = request.params.region;
        const gameId = request.params.gameId;
        const keyFrameId = request.params.keyFrameId;

        if (!region || !gameId || !keyFrameId) {
            reply.code(400).send("Missing parameters");
            return;
        }
        if (!fastify.spectator_servers[region]) {
            reply.code(400).send("Invalid region");
            return;
        }
        try {
            return await ReplayManager.getInstance().getKeyFrame(region, gameId, keyFrameId, request.ip);
        } catch {
            reply.code(404).type('text/html').send('Game or keyFrame not found');
        }
    });
}