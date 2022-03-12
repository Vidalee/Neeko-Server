import { ReplayManager } from "../ReplayManager";

export default async function routes(fastify, options) {
    fastify.get('/version', async (request, reply) => {
        return ReplayManager.getInstance().getVersion(request.ip);
    });
}