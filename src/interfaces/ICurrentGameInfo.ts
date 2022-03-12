import { CurrentGameInfoDTO } from "twisted/dist/models-dto";

export interface ICurrentGameInfo extends CurrentGameInfoDTO {
    custom?: {
        targetSummonerName: string;
        date: string;
    }
}