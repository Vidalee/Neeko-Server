import { MatchV5DTOs } from "twisted/dist/models-dto";

export default function getCustomGameStats(match: MatchV5DTOs.MatchDto): any {
    let largestMultiKill = 0;

    for (let participant of match.info.participants) {
        if (participant.largestMultiKill > largestMultiKill)
            largestMultiKill = participant.largestMultiKill;
    }
    return { largestMultiKill: largestMultiKill };
}