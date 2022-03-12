import { Regions } from "twisted/dist/constants";
import * as fsp from 'fs/promises';
import * as config from "../config.json";
import { fileExists } from "./utils/Utils";
import { ApiResponseDTO, CurrentGameInfoDTO, MatchV5DTOs, SpectatorNotAvailableDTO } from "twisted/dist/models-dto";
import { activeGame } from "./RiotAPIHandler";
import { Spectator } from "./Spectator";
import { ANSI } from "./utils/ANSI";
import { Logger } from "./utils/Logger";
import { IStatistics, IStatisticsGame } from "./interfaces/IStatistics";
import { IMetaData } from "./interfaces/IMetaData";
import { ICurrentGameInfo } from "./interfaces/ICurrentGameInfo";
import getCustomGameStats from "./utils/getCustomGameStats";

export class SpectatorManager {

    private static _instance: SpectatorManager = new SpectatorManager();
    private spectators: Spectator[] = [];
    // The private constructor is not empty since when transpiled to js, it is not private anymore
    private constructor() {
        if (SpectatorManager._instance) {
            throw new Error("Instantiation failed: Use SpectatorManager.getInstance() instead of new.");
        }
        SpectatorManager._instance = this;
    }

    public static getInstance(): SpectatorManager {
        return SpectatorManager._instance;
    }

    public async spectateBySummonerName(summonerName: string, region: Regions): Promise<boolean> {
        try {
            const data: SpectatorNotAvailableDTO | ApiResponseDTO<CurrentGameInfoDTO> = await activeGame(summonerName, region);
            if (data['response']) {
                const game: CurrentGameInfoDTO = data['response'];

                if (this.spectators.find(s => s.game.gameId === game.gameId)) {
                    this.logInfo(`Game ${game.gameId} is already being recorded!`);
                    return true;
                }

                const spec: Spectator = new Spectator(game, Regions.EU_WEST, summonerName);

                this.logInfo(`Started spectating ${summonerName} in game ${game.gameId} on server ${region}`);
                spec.startSpectating();
                this.spectators.push(spec);
                return true;
            }
            this.logInfo(`Cannot spectate ${summonerName} since they are not in a game`);
            return false;
        } catch (err) {
            this.logInfo(`Cannot spectate ${summonerName} since they are not in a game`);
            return false;
        }
    }

    public async getStatistics(): Promise<IStatistics> {
        this.logInfo('Querying statistics');
        this.spectators = this.spectators.filter(s => s.isAlive());
        const spectatorStats = this.spectators.map(s => s.getStatistics());
        const gamesStats = await this.getLocalGamesStatistics();
        return { spectators: spectatorStats, games: gamesStats };
    }

    public async getWindowsGameStart(gameId: string, address, port) {
        if (await fileExists(`${config.paths.games}/${gameId}/game.json`)) {
            this.logInfo(`Getting Windows game start file for game ${gameId}`);
            const game: CurrentGameInfoDTO = JSON.parse(await fsp.readFile(`${config.paths.games}/${gameId}/game.json`, 'utf8'));
            const encryptionKey = game.observers.encryptionKey;
            const region = game.platformId;
            const file = (await fsp.readFile(`ressources/start.bat`, 'utf8'))
                .replace('{encryptionKey}', encryptionKey)
                .replace('{region}', region)
                .replace('{gameId}', gameId)
                .replace('{address}', address)
                .replace('{port}', port);

            return Buffer.from(file);
        }
        throw new Error('Game not found');
    }


    private async getLocalGamesStatistics(): Promise<IStatisticsGame[]> {
        if (!await fileExists(config.paths.games)) return [];
        const gameDir = await fsp.readdir(config.paths.games);
        const gamesDir = [];
        for (const path of gameDir) {
            if (await (await fsp.lstat(`${config.paths.games}/${path}`)).isDirectory()) gamesDir.push(path);
        }
        const gamesStats: IStatisticsGame[] = [];
        for (const game of gamesDir) {
            if (await fileExists(`${config.paths.games}/${game}/metadata.json`) && await fileExists(`${config.paths.games}/${game}/game.json`)) {
                const metadata: IMetaData = JSON.parse(await fsp.readFile(`${config.paths.games}/${game}/metadata.json`, 'utf8'));
                const gameDTO: ICurrentGameInfo = JSON.parse(await fsp.readFile(`${config.paths.games}/${game}/game.json`, 'utf8'));

                const gameStats: IStatisticsGame = {
                    gameId: metadata.gameKey.gameId,
                    region: metadata.gameKey.platformId,
                    targetSummonerName: gameDTO.custom.targetSummonerName,
                    date: gameDTO.custom.date,
                    interestScore: metadata.interestScore,
                    gameLength: metadata.gameLength,
                    gameMode: gameDTO.gameMode,
                    gameType: gameDTO.gameType,
                };

                if (await fileExists(`${config.paths.games}/${game}/apiGameInfo.json`)) {
                    gameStats.custom = getCustomGameStats(JSON.parse(await fsp.readFile(`${config.paths.games}/${game}/apiGameInfo.json`, 'utf8')));
                }

                gamesStats.push(gameStats);
            }
        }
        return gamesStats;
    }

    private logInfo(message: string) {
        if (config.spectator_manager.logger)
            Logger.info(`${ANSI.FgCyan}[Spectator Manager]:${ANSI.FgWhite} ${message}${ANSI.Reset}`);
    }
}