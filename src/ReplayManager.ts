import { Regions } from "twisted/dist/constants";
import * as fs from 'fs/promises';
import * as config from "../config.json";
import { IMetaData } from "./interfaces/IMetaData";
import { ILastChunkInfo } from "./interfaces/ILastChunkInfo";
import { fileExists } from "./utils/Utils";
import { ANSI } from "./utils/ANSI";
import { Logger } from "./utils/Logger";
export class ReplayManager {

    private static _instance: ReplayManager = new ReplayManager();

    //Stores the relation between gameIds and IPs so that 2 clients can watch the same game.
    private _clientsLastChunk: Map<string, Number> = new Map();

    // The private constructor is not empty since when transpiled to js, it is not private anymore
    private constructor() {
        if (ReplayManager._instance) {
            throw new Error("Instantiation failed: Use ReplayManager.getInstance() instead of new.");
        }
        ReplayManager._instance = this;
    }

    public static getInstance(): ReplayManager {
        return ReplayManager._instance;
    }

    public getVersion(ip){
        this.logInfo(`Client ${ip} queried server's version`);
        return '2.0.0';
    }
    public async getGameMetaData(region: Regions, gameId: string, ip: string): Promise<string | Object> {
        this.logInfo(`Client ${ip} queried metadata of game ${gameId} (${region})`);
        await this.testGameExists(gameId);

        if (!await fileExists(`${config.paths.games}/${gameId}/metadata.json`))
            throw new Error('Game metadata does not exist');

        this._clientsLastChunk[gameId + ip] = 0;
        return await fs.readFile(`${config.paths.games}/${gameId}/metadata.json`, 'utf8');
    }

    public async getGameDataChunk(region: any, gameId: any, chunkId: any, ip: string): Promise<string | Buffer> {
        this.logInfo(`Client ${ip} queried chunk ${chunkId} of game ${gameId} (${region})`);
        await this.testGameExists(gameId);

        const path = `${config.paths.games}/${gameId}/chunks/${chunkId}.bin`;
        if (!await fileExists(path))
            throw new Error('Chunk does not exist');
        return await fs.readFile(path);
    }

    public async getKeyFrame(region: any, gameId: any, keyFrameId: any, ip: string): Promise<string | Buffer> {
        this.logInfo(`Client ${ip} queried keyFrame ${keyFrameId} of game ${gameId} (${region})`);
        await this.testGameExists(gameId);

        const path = `${config.paths.games}/${gameId}/keyframes/${keyFrameId}.bin`;
        if (!await fileExists(path))
            throw new Error('KeyFrame does not exist');

        return await fs.readFile(path);
    }

    public async endOfGameStats(region: any, gameId: any, ip: string): Promise<string | Buffer> {
        this.logInfo(`Client ${ip} queried endOfGameStats of game ${gameId} (${region})`);
        await this.testGameExists(gameId);

        const path = `${config.paths.games}/${gameId}/endOfGameStats.json`;
        if (!await fileExists(path))
            throw new Error('End of game stats do not exist');
        return await fs.readFile(path);
    }

    // Note: Chunk 1 is always called independently by the client, thus it is not handled here.
    public async getLastChunkInfo(region: any, gameId: any, ip: string): Promise<Object> {
        this.logInfo(`Client ${ip} queried last chunk info of game ${gameId} (${region}). Client's current chunk: ${this._clientsLastChunk[gameId + ip]}`);
        await this.testGameExists(gameId);

        if (this._clientsLastChunk[gameId + ip] === undefined) {
            return "You must call getGameMetaData first.";
        }

        //Increase chunk counter to simulate game progression
        let currentChunkId = ++this._clientsLastChunk[gameId + ip];

        const metadataPath = `${config.paths.games}/${gameId}/metadata.json`;
        if (!await fileExists(metadataPath))
            throw new Error('Game metadata does not exist');
        const metadata = JSON.parse(await fs.readFile(`${config.paths.games}/${gameId}/metadata.json`, 'utf-8')) as IMetaData;

        if (metadata.pendingAvailableChunkInfo.length === 0 || metadata.pendingAvailableKeyFrameInfo.length === 0)
            throw new Error("No chunks or keyFrames available");

        const firstChunkWithKeyFrame = metadata.pendingAvailableKeyFrameInfo[0].nextChunkId;
        let firstChunkId = firstChunkWithKeyFrame;

        // Quoting Divi from 7 years ago: "A bug appears when endStartupChunkId = 3 and startGameChunkId = 5, the game won't load"
        // Never had that an endStartupChunkId at 3 but leaving it for safety
        if (metadata.endStartupChunkId + 2 === firstChunkId) {
            firstChunkId = metadata.startGameChunkId + 2;
        }


        let keyFrameId = this.findKeyFrameByChunkId(metadata, firstChunkId);
        const lastChunkInfo: ILastChunkInfo = {
            chunkId: firstChunkId,
            availableSince: 30000,
            nextAvailableChunk: 30000,
            nextChunkId: firstChunkId,
            keyFrameId: keyFrameId,
            endStartupChunkId: metadata.endStartupChunkId,
            startGameChunkId: metadata.startGameChunkId,
            endGameChunkId: 0,
            duration: 30000
        }

        // If we don't have the chunks between 1 and the first chunk with keyFrame, skip them in order
        // to avoid the client to call getLastChunkInfo an unnecessary amount of times
        if (firstChunkId !== metadata.startGameChunkId && currentChunkId - 1 == metadata.startGameChunkId) {
            currentChunkId = firstChunkId;
            this._clientsLastChunk[gameId + ip] = currentChunkId;
        }

        // In-game chunks
        if (currentChunkId > metadata.startGameChunkId) {
            // Failsafes for currentChunkId to not go out of bounds
            if (currentChunkId > metadata.lastChunkId) {
                currentChunkId = metadata.lastChunkId;
            } else if (currentChunkId < firstChunkWithKeyFrame) {
                currentChunkId = firstChunkWithKeyFrame;
            }
            keyFrameId = this.findKeyFrameByChunkId(metadata, currentChunkId);
            lastChunkInfo.keyFrameId = keyFrameId;
            lastChunkInfo.chunkId = currentChunkId;
            lastChunkInfo.nextChunkId = metadata.lastChunkId;
            lastChunkInfo.nextAvailableChunk = currentChunkId === firstChunkId + 6 ? 30000 : 100;
        }

        // No more chunks, game is finished.
        if (currentChunkId === metadata.lastChunkId) {
            lastChunkInfo.nextAvailableChunk = 90000;
            lastChunkInfo.endGameChunkId = metadata.endGameChunkId;
            this.logInfo(`Client ${ip} has queried the last chunk of game ${gameId} (${region})`);
        }
        return lastChunkInfo;
    }

    private findKeyFrameByChunkId(metadata: IMetaData, chunkId: number): number {
        for (let keyFrameInfo of metadata.pendingAvailableKeyFrameInfo) {
            if (keyFrameInfo.nextChunkId === chunkId) {
                return keyFrameInfo.keyFrameId;
            }
        }

        for (let keyFrameInfo of metadata.pendingAvailableKeyFrameInfo) {
            if (keyFrameInfo.nextChunkId === chunkId - 1) {
                return keyFrameInfo.keyFrameId;
            }
        }

        throw new Error("keyframe not found for chunkId: " + chunkId);
    }

    private async testGameExists(gameId: string): Promise<void> {
        if (!await fileExists(`${config.paths.games}/${gameId}`))
            throw new Error('Game does not exist');
    }

    private logInfo(message: string) {
        if (config.replay_manager.logger)
            Logger.info(`${ANSI.FgBlue}[Replay Manager]:${ANSI.FgWhite} ${message}${ANSI.Reset}`);
    }
}