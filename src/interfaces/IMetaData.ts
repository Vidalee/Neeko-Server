import { IPendingAvailableChunkInfo } from "./IPendingAvailableChunkInfo";
import { IPendingAvailableKeyFrameInfo } from "./IPendingAvailableKeyFrameInfo";

export interface IMetaData {
    gameKey: {
        gameId: number;
        platformId: string;
    },
    gameServerAddress: string;
    port: number;
    encryptionKey: string;
    chunkTimeInterval: number;
    startTime: string;
    endTime: string;
    gameEnded: boolean;
    lastChunkId: number;
    lastKeyFrameId: number;
    endStartupChunkId: number;
    delayTime: number;
    pendingAvailableChunkInfo: IPendingAvailableChunkInfo[],
    pendingAvailableKeyFrameInfo: IPendingAvailableKeyFrameInfo[],
    keyFrameTimeInterval: number;
    decodedEncryptionKey: string;
    startGameChunkId: number;
    gameLength: number;
    clientAddedLag: number;
    clientBackFetchingEnabled: boolean;
    clientBackFetchingFreq: number;
    interestScore: number;
    featuredGame: boolean;
    createTime: string;
    endGameChunkId: number;
    endGameKeyFrameId: number;
}
