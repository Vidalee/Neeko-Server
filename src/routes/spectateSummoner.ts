import { SpectatorManager } from "../SpectatorManager";

export default async function routes(fastify) {
    fastify.get("/spectate/:region/:gameName/:tagLine", async (request, reply) => {
        const region = request.params.region;
        const gameName = request.params.gameName;
        const tagLine = request.params.tagLine;

        if (!region || !gameName || !tagLine) {
            reply.code(400).send("Missing parameters");
            return;
        }
        if (!fastify.spectator_servers[region]) {
            reply.code(400).send("Invalid region");
            return;
        }

        if (fastify.secrets.check_spectate_secret && fastify.secrets.spectate_secret !== request.headers.secret) {
            reply.code(403).send("Invalid secret");
            return;
        }

        if (await SpectatorManager.getInstance().spectateBySummonerName(gameName, tagLine, region)) {
            reply.code(200).send(`Spectating ${gameName}#${tagLine}.`);
        } else {
            reply.code(200).send(`Summoner ${gameName}#${tagLine} not in game or not found.`);
        }
    });
}
