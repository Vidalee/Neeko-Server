import { SpectatorManager } from "../SpectatorManager";

export default async function routes(fastify) {
    fastify.get('/statistics', async (request, reply) => {
        if(fastify.secrets.check_statistics_secret && fastify.secrets.statistics_secret !== request.headers.secret){
            reply.code(403).send("Invalid secret");
            return;
        }

        return await SpectatorManager.getInstance().getStatistics();
    });
}