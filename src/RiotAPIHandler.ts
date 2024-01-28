import * as config from "../config.json"

import { ApiResponseDTO, CurrentGameInfoDTO, MatchV5DTOs, SpectatorNotAvailableDTO } from 'twisted/dist/models-dto';
import { Constants, LolApi, RiotApi } from 'twisted'
import { RegionGroups, Regions, regionToRegionGroup } from 'twisted/dist/constants/regions';

const lolApi = new LolApi({ key: config.riot_api_key })
const riotApi = new RiotApi({ key: config.riot_api_key })

export async function activeGame(gameName: string, tagLine, region: Regions): Promise<ApiResponseDTO<CurrentGameInfoDTO> | SpectatorNotAvailableDTO> {
    const { puuid } = (await riotApi.Account.getByRiotId(gameName, tagLine, Constants.RegionGroups.EUROPE)).response;
    const { response: { id } } = await lolApi.Summoner.getByPUUID(puuid, region)
    return await lolApi.Spectator.activeGame(id, region)
}

export async function getGameById(gameId: string, region: Regions): Promise<ApiResponseDTO<MatchV5DTOs.MatchDto>> {
    return await lolApi.MatchV5.get(gameId, regionToRegionGroup(region));
}
