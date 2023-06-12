
# Neeko-Server ![example workflow](https://github.com/Vidalee/Neeko-Server/actions/workflows/build.yaml/badge.svg) ![example workflow](https://github.com/Vidalee/Neeko-Server/actions/workflows/check_servers.yaml/badge.svg)

Neeko-Server is an application that record games emulates a League of Legends spectator server to serve them to the League of Legends client.

It is an asynchronous software capable of recording multiple League of Legends live games at the same time, while simultaneously allowing multiple League of Legends clients to watch different games at the same time.

If you have any questions of want to participate to the development, feel free to join this Discord server: https://discord.gg/gqkjwBK58Z

## Building

#### 1. Clone from repo
```shell
git clone git@github.com:Vidalee/Neeko-Server.git
```

#### 2. Install dependencies
```shell
yarn install
```

#### 3. Build
```shell
yarn build
```
#### 4. Start
```shell
yarn start
```

## Configuration

Ensure that you customize the config.json file according to your requirements, as it handles all the configuration settings.

```json
{
    "riot_api_key": "RGAPI-YOUR-API-KEY-HERE",         // See next section for more information.
    "spectator_servers": {
        ...                                            // URLs of the League of Legends spectator servers for the different regions.
    },
    "paths": {
        "games": "games"                               // Path of where the games recorded will be saved.
    },
    "server": {
        "address": "127.0.0.1",                        // Spectator server address
        "port": 3000,                                  // Spectator server port
        "logger": false,                               // Enable Fastify logger
        "secrets": {
            "spectate_secret": "spectate_secret",      // Secret of the /spectate endpoint.
            "check_spectate_secret": true,             // Wether to use it or not
            "statistics_secret": "statistics_secret",  // Secret of the /spectate endpoint.
            "check_statistics_secret": true            // Wether to use it or not
        }
    },
    "spectator": {
        "logger": true,                                // Enable spectator client logger (used to record games).
        "get_riot_match_details": true                 // Use the riot_api_key to retrieve more information using the matchv5 Riot Games API endpoint.
    },
    "spectator_manager": {
        "logger": true                                 // Our SpectatorManager logger (used to spectate new games and give statistics).
    },
    "replay_manager": {
        "logger": true                                 // Our ReplayManager logger (used to serve games to League of Legends clients).
    },
    "use_ansi_colors": true                            // If your terminal does not support ANSI escape code, set it to false.
}
```

## Riot Games API

This application uses the Riot Games API to get the gameId of a summoner currently in game, in order to record that game.
If `config.spectator.get_riot_match_details` is set to true, it will also query for the results of the game through the match endpoint of the Riot Games API.
Thus, if you want to fully use this application your API key must have access to the corresponding endpoints:

```
/lol/summoner/v4/summoners/by-name/{summonerName}
/lol/spectator/v4/active-games/by-summoner/{encryptedSummonerId}
/lol/match/v5/matches/{matchId}
```

The API key is not required if you only intend to serve games that you have already recorded.

## Server endpoints


### GET `/admin/spectate/:region/:summonerName`


Record the live game of a summoner. The region options are:

```
BR1, EUN1, EUW1, KR, LA1, LA2, NA1, OC1, TR1, RU, JP1 and PBE1
```

The summonerName option is the name of the summoner whose game you want to record.

Additionally, you can specify a secret in `config.server.secret.spectate_secret`, and if `config.server.secret.check_spectate_secret` is enabled, the request will not go through unless you have a `Secret` header which value matches with `config.server.secret.spectate_secret`.

When recording a game that has already started, you may see a lots of chunks unavailables messages on the console. These are not errors, it is just not possible to get the past data of a game, only the data from the moment ou started spectating.

### GET `/admin/statistics`

As with the endpoint above, you can secure this one using `config.server.secret.statistics_secret`

It provides statistics, mainly the list of the games that are currently being recorded, and those which are already saved. One interesting thing about this endpoint is that you can specify custom game data if you enabled the `config.spectator.get_riot_match_details` endpoint. You just need to edit the `getCustomGameStats` function, located in the [`src/utils/getCustomGameStats.ts`](src/utils/getCustomGameStats.ts) file. I set it to output the largest multi kill in a match, and its duration in minutes as an example.

Here is an example response:
```json
{
	"spectators": [ // Spectators client, one for each game currently being recorded
		{
			"gameId": 1234567890,
			"region": "EUW1",
			"targetSummonerName": "Player 1",
			"date": "Mar 6, 2022 2:13:19 PM",
			"liveGameMinutes": 17,
			"interestScore": 1932
		}
	],
	"games": [ // Games stored on the spectator server
		{
			"gameId": 1234567891,
			"region": "EUW1",
			"targetSummonerName": "Player 2",
			"date": "Mar 6, 2022 12:27:03 PM",
			"interestScore": 1097,
			"gameLength": 0,
			"gameMode": "CLASSIC",
			"gameType": "MATCHED_GAME",
			"custom": {
				"largestMultiKill": 3,
                		"gameMinutes": 21
			}
		}
	]
}
```

### GET `/spectate/windows/:gameId`

Download a .bat file that will launch the League of Legends client to spectate the specified game ID on our spectator server. The corresponding game must have been recorded previously using the application.

## Development

Feel free to propose any PR, they are very welcome especially on the fastify error code management (errors getting caught inside the router functions) and on the architecture of the project.

## Inspiration

Special thank to the loldevs team for their work on reversing the League of Legends spectator servers nearly a decade ago (https://github.com/loldevs/leaguespec) and more so to Divi for his past implementation of a spectator server (https://github.com/EloGank/lol-replay-downloader) that inspired me for the getLastChunkInfo endpoint implementation.
