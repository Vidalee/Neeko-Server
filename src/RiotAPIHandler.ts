import { LolApi } from 'twisted'
import { RegionGroups, Regions, regionToRegionGroup } from 'twisted/dist/constants/regions';
import { ApiResponseDTO, CurrentGameInfoDTO, MatchV5DTOs, SpectatorNotAvailableDTO } from 'twisted/dist/models-dto';
import * as config from "../config.json"

const api = new LolApi({ key: config.riot_api_key })

export async function activeGame(summonerName: string, region: Regions): Promise<ApiResponseDTO<CurrentGameInfoDTO> | SpectatorNotAvailableDTO> {
    const { response: { id } } = await api.Summoner.getByName(summonerName, region)    
    return await api.Spectator.activeGame(id, region)
}

export async function getGameById(gameId: string, region: Regions): Promise<ApiResponseDTO<MatchV5DTOs.MatchDto>> {
    return await api.MatchV5.get(gameId, regionToRegionGroup(region));
}
