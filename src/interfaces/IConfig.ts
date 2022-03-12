export interface IConfig {
    riot_api_key: string;
    spectator_servers: { [region: string]: string };
    paths: {
        games: string;
    },
    server: {
        address: string;
        port: number;
        logger: boolean;
        secrets: {
            spectate_secret: string;
            check_spectate_secret: boolean
            statistics_secret: string;
            check_statistics_secret: boolean
        }
    },
    spectator: {
        logger: boolean;
        get_riot_match_details: boolean;
    },
    spectator_manager: {
        logger: boolean;
    },
    replay_manager: {
        logger: boolean;
    },
    use_ansi_colors: boolean
};