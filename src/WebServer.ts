import * as config from "../config.json";
import getGameMetaData from "./routes/getGameMetaData";
import version from "./routes/version";
import getGameDataChunk from "./routes/getGameDataChunk";
import getKeyFrame from "./routes/getKeyFrame";
import endOfGameStats from "./routes/endOfGameStats";
import getLastChunkInfo from "./routes/getLastChunkInfo";
import spectateSummoner from "./routes/spectateSummoner";
import statistics from "./routes/statistics";
import getWindowsGameStart from "./routes/getWindowsGameStart";

import Fastify from 'fastify'
import { Logger } from "./utils/Logger";

export class WebServer {

  public start() {
    const fastify = Fastify({
      logger: config.server.logger
    });

    fastify.decorate('spectator_servers', config.spectator_servers);
    fastify.decorate('secrets', config.server.secrets);

    fastify.get('/', function (_request, reply) {
      reply.send(`Running Neeko-Server version ${process.env.npm_package_version}`);
    })

    fastify.register(getGameMetaData, { prefix: '/observer-mode/rest/consumer' });
    fastify.register(version, { prefix: '/observer-mode/rest/consumer' });
    fastify.register(getGameDataChunk, { prefix: '/observer-mode/rest/consumer' });
    fastify.register(getKeyFrame, { prefix: '/observer-mode/rest/consumer' });
    fastify.register(endOfGameStats, { prefix: '/observer-mode/rest/consumer' });
    fastify.register(getLastChunkInfo, { prefix: '/observer-mode/rest/consumer' });
    fastify.register(spectateSummoner, { prefix: '/admin/' });
    fastify.register(statistics, { prefix: '/admin/' });
    fastify.register(getWindowsGameStart, { prefix: '/spectate/' });

    fastify.listen(config.server.port, config.server.address, function (err, address) {
      if (err) {
        fastify.log.error(err);
        Logger.error(`Error starting the web server: ${err}`);
      }else{
        Logger.info(`Web server listening to ${address}`);
      }
    })
  }
}