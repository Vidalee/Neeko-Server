export interface ILastChunkInfo {
    chunkId: number;
    availableSince: number;
    nextAvailableChunk: number;
    keyFrameId: number;
    nextChunkId: number;
    endStartupChunkId: number;
    startGameChunkId: number;
    endGameChunkId: number;
    duration: number;
}
