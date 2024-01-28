import * as config from "../config.json"
import * as fs from 'fs';
import * as fsp from 'fs/promises';

import { fileExists, getDate } from "./utils/Utils";

import { ANSI } from "./utils/ANSI";
import { CurrentGameInfoDTO } from 'twisted/dist/models-dto';
import { ICurrentGameInfo } from "./interfaces/ICurrentGameInfo";
import { ILastChunkInfo } from "./interfaces/ILastChunkInfo";
import { IMetaData } from "./interfaces/IMetaData";
import { IStatisticsSpectator } from "./interfaces/IStatistics";
import { Logger } from "./utils/Logger";
import { Regions } from 'twisted/dist/constants/regions';
import axios from 'axios';
import { getGameById } from "./RiotAPIHandler";

export class Spectator {
    readonly BASE: string = "/observer-mode/rest/consumer";

    readonly game: ICurrentGameInfo;
    readonly region: Regions;
    readonly targetSummoner: string;
    private alive: boolean = true;
    gameMetaData: IMetaData;
    lastChunkInfo: ILastChunkInfo;
    lastKeyFrameInfo;

    constructor(game: CurrentGameInfoDTO, region: Regions, targetSummoner: string) {
        this.game = game;
        this.region = region;
        this.targetSummoner = targetSummoner;
        this.game.custom = {
            date: getDate(),
            targetSummonerName: targetSummoner,
        };
    }

    public getCurrentSpectatorMinutes(): number {
        if (this.lastChunkInfo === undefined)
            return 0;
        return this.lastChunkInfo.keyFrameId + 2;
    }

    public isAlive(): boolean {
        return this.alive;
    }

    public getStatistics(): IStatisticsSpectator {
        return {
            gameId: this.game.gameId,
            region: this.region,
            targetSummonerName: this.game.custom.targetSummonerName,
            date: this.game.custom.date,
            liveGameMinutes: this.getCurrentSpectatorMinutes(),
            interestScore: this.gameMetaData.interestScore,
            gameMode: this.game.gameMode,
            gameType: this.game.gameType,
        }
    }

    public async startSpectating() {
        this.logInfo(`Launching spectator client instance`);
        this.gameMetaData = await this.getGameMetaData();
        this.gameMetaData.pendingAvailableChunkInfo = [];
        this.gameMetaData.pendingAvailableKeyFrameInfo = [];
        await this.createFileTree();
        await this.getLastChunkInfo();
        await this.getLastKeyFrameInfo();
        this.logInfo(`Game has started since approximately ${this.getCurrentSpectatorMinutes()} minutes.`);
        await this.downloadAvailableChunksAndKeyframes();

        this.waitNextChunk();
    }

    private async endGame() {
        this.gameMetaData.lastChunkId = this.gameMetaData.pendingAvailableChunkInfo.at(-1).chunkId;
        this.gameMetaData.endGameChunkId = this.gameMetaData.lastChunkId;
        this.gameMetaData.endGameKeyFrameId = this.gameMetaData.pendingAvailableKeyFrameInfo.at(-1).keyFrameId;
        this.gameMetaData.gameEnded = true;
        this.saveGameMetaData();
        this.saveEndOfGameStats();
        if (config.spectator.get_riot_match_details) {
            const apiGameInfo = await getGameById(`${this.region}_${this.game.gameId}`, this.region);
            await fsp.writeFile(`${config.paths.games}/${this.game.gameId}/apiGameInfo.json`, JSON.stringify(apiGameInfo.response, null, 4));
        }
        this.logInfo(`Game ended. It is now ready for the spectator server.`);
        this.alive = false;
    }

    private async saveEndOfGameStats() {

        try {
            const response = await axios.get(`http://${config.spectator_servers[this.region] + this.BASE}/endOfGameStats/${this.region}/${this.game.gameId}/null`);

            await fsp.writeFile(`${config.paths.games}/${this.game.gameId}/endOfGameStats.json`, JSON.stringify(response.data, null, 4));
        } catch (error) {
            //The LCU won't retrieve these stats since we just launch the LoL client.
            //Therefore this error is not that important and we can use the replay jsut fine.
            this.logError(`End of game stats are not available on the spectator server for this game Error: ${error}`);
        }
    }

    private waitNextChunk() {
        setTimeout(async () => {
            if (this.lastChunkInfo.endGameChunkId !== 0 && this.lastChunkInfo.endGameChunkId === this.lastChunkInfo.chunkId) {
                this.endGame();
                return;
            }

            await this.getGameDataChunk(this.lastChunkInfo.chunkId + 1);

            const chunkKeyFrame: number = this.lastChunkInfo.keyFrameId;
            await this.getLastChunkInfo();
            if (this.lastChunkInfo.keyFrameId === 0 || this.lastChunkInfo.keyFrameId !== chunkKeyFrame)
                this.getKeyFrame(this.lastChunkInfo.keyFrameId);

            this.waitNextChunk();
        }, this.lastChunkInfo.nextAvailableChunk + 1000);
    }

    private async getGameMetaData(): Promise<IMetaData> {
        const path = `http://${config.spectator_servers[this.region] + this.BASE}/getGameMetaData/${this.region}/${this.game.gameId}/0/token`;

        this.logInfo(path);

        try {
            const response = await axios.get(path);
            return response.data;
        } catch (error) {
            this.logError(`This game is not available on this spectator server. Error: ${error}`);
        }
    }

    private async getLastChunkInfo() {
        const path = `http://${config.spectator_servers[this.region] + this.BASE}/getLastChunkInfo/${this.region}/${this.game.gameId}/0/token`;

        // this.logInfo(path);

        try {
            const response = await axios.get(path);
            this.lastChunkInfo = response.data;
        } catch (error) {
            this.logError(`This game is not available on this spectator server. Error: ${error}`);
        }
    }

    private async getLastKeyFrameInfo() {
        const path = `http://${config.spectator_servers[this.region] + this.BASE}/getLastKeyFrameInfo/${this.region}/${this.game.gameId}/0/token`;

        // this.logInfo(path);

        try {
            const response = await axios.get(path);
            this.lastKeyFrameInfo = response.data;
        } catch (error) {
            console.log(error)

            this.logError(`This game is not available on this spectator server. Error: ${error}`);
        }
    }

    private async downloadAvailableChunksAndKeyframes() {
        if (!this.gameMetaData) {
            this.logError("Game meta data not found. Please call getGameMetaData() first.");
            return;
        }
        if (!this.lastChunkInfo) {
            this.logError("Last chunk info not found. Please call getLastChunkInfo() first.");
            return;
        }
        if (!this.lastKeyFrameInfo) {
            this.logError("Last keyframe info not found. Please call getLastKeyFrameInfo() first.");
            return;
        }

        // If we start spectating mid-games, a bunch of chunks will be unavailable.
        // We still iterate through all of them since sometimes we can get chunks and framerates that still were not deleted.
        for (let chunkId = 1; chunkId <= this.lastChunkInfo.chunkId; chunkId++) {
            await this.getGameDataChunk(chunkId);
        }

        for (let keyFrameId = 1; keyFrameId <= this.lastKeyFrameInfo.chunkId; keyFrameId++) {
            await this.getKeyFrame(keyFrameId);
        }
    }


    private async getGameDataChunk(chunkId: number) {
        const filePath = `${config.paths.games}/${this.game.gameId}/chunks/${chunkId}.bin`;
        this.logInfo(`Downloading chunk ${chunkId} to ${filePath}`);

        if (await fileExists(filePath)) {
            this.logInfo(`Chunk ${chunkId} already exists at path: ${filePath}`);
            return;
        }

        const path = `http://${config.spectator_servers[this.region] + this.BASE}/getGameDataChunk/${this.region}/${this.game.gameId}/${chunkId}/token`;
        // this.logInfo(path);

        try {
            const response = await axios.get(path, {
                responseType: 'stream'
            });
            this.gameMetaData.pendingAvailableChunkInfo.push({
                chunkId: chunkId,
                duration: 30000,
                receivedTime: getDate()
            });
            await response.data.pipe(fs.createWriteStream(`${config.paths.games}/${this.game.gameId}/chunks/${chunkId}.bin`));

        } catch (error) {
            // This is not really an error since we iterate through all the chunks knwowing that
            // if we start spectating midgame we will not be able to get past chunks.
            this.logError(`Chunk no longer/not yet available: ${error}`);
        }
    }

    private async getKeyFrame(keyFrameId: number) {
        const filePath = `${config.paths.games}/${this.game.gameId}/keyframes/${keyFrameId}.bin`;
        this.logInfo(`Downloading keyframe ${keyFrameId} to ${filePath}`);

        if (await fileExists(filePath)) {
            this.logInfo(`Keyframe ${keyFrameId} already exists at path: ${filePath}`);
            return;
        }
        const path = `http://${config.spectator_servers[this.region] + this.BASE}/getKeyFrame/${this.region}/${this.game.gameId}/${keyFrameId}/token`;
        this.logInfo(path);

        try {
            const response = await axios.get(path, {
                responseType: 'stream'
            });
            this.gameMetaData.pendingAvailableKeyFrameInfo.push({
                keyFrameId: keyFrameId,
                receivedTime: getDate(),
                nextChunkId: keyFrameId * 2
            });
            await response.data.pipe(fs.createWriteStream(`${config.paths.games}/${this.game.gameId}/keyframes/${keyFrameId}.bin`));

        } catch (error) {
            // This is not really an error since we iterate through all the keyFrames knwowing that
            // if we start spectating midgame we will not be able to get past keyFrames.
            this.logError(`KeyFrame no longer/not yet available: ${error}`);
        }
    }

    private async createFileTree() {
        if (!await fileExists(config.paths.games))
            await fsp.mkdir(config.paths.games);

        if (!await fileExists(`${config.paths.games}/${this.game.gameId}`))
            await fsp.mkdir(`${config.paths.games}/${this.game.gameId}`);

        if (!await fileExists(`${config.paths.games}/${this.game.gameId}/chunks`))
            await fsp.mkdir(`${config.paths.games}/${this.game.gameId}/chunks`);

        if (!await fileExists(`${config.paths.games}/${this.game.gameId}/keyframes`))
            await fsp.mkdir(`${config.paths.games}/${this.game.gameId}/keyframes`);

        await fsp.writeFile(`${config.paths.games}/${this.game.gameId}/game.json`, JSON.stringify(this.game, null, 4));
        await this.saveGameMetaData();
    }

    private async saveGameMetaData() {
        await fsp.writeFile(`${config.paths.games}/${this.game.gameId}/metadata.json`, JSON.stringify(this.gameMetaData, null, 4));
    }

    private logInfo(message: string) {
        if (config.spectator.logger)
            Logger.info(`${ANSI.FgMagenta}[Spectator][${this.region}/${this.game.gameId}]:${ANSI.FgGreen} ${message}${ANSI.Reset}`);
    }

    private logError(message: string) {
        if (config.spectator.logger)
            Logger.error(`${ANSI.FgMagenta}[Spectator][${this.region}/${this.game.gameId}]:${ANSI.FgRed} ${message}${ANSI.Reset}`);
    }
}