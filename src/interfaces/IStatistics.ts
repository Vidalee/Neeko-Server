export interface IStatistics {
    spectators: IStatisticsSpectator[];
    games: IStatisticsGame[];
};

export interface IStatisticsSpectator {
    gameId: number;
    region: string;
    targetSummonerName: string;
    date: string;
    interestScore: number;
    liveGameMinutes: number;
    gameMode: string;
    gameType: string;
}

export interface IStatisticsGame {
    gameId: number;
    region: string;
    targetSummonerName: string;
    date: string;
    interestScore: number;
    gameLength: number;
    gameMode: string;
    gameType: string;
    custom?: any;
}