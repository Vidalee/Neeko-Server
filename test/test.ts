import axios from "axios";
import * as config from "../config.json";
import { ANSI } from "../src/utils/ANSI";

const skipServers = ["PBE1"];

const regions = Object.entries(config.spectator_servers).map(([region, ip]) => {
    return { region, ip };
});

interface ServerTestResult {
    region: string;
    ip: string;
    version?: string;
    success: boolean;
    errorMessage?: string;
}

async function testServers() {
    console.log(`${ANSI.FgMagenta}Testing access to spectator servers...${ANSI.Reset}`);

    const testResults = await Promise.all(
        regions.map(async (server: ServerTestResult) => {
            if(skipServers.includes(server.region)) {
                server.success = true;
                return server;
            }
            server.success = false;
            server.errorMessage = "An unexpected error occured";
            try {
                const version = (await axios.get(`http://${server.ip}/observer-mode/rest/consumer/version`)).data;
                server.version = version;
            } catch (e) {
                server.errorMessage = "Server not responding - Could not get server version";
                return server;
            }

            try {
                const featuredGames = (await axios.get(`http://${server.ip}/observer-mode/rest/featured`)).data;
                if (featuredGames.gameList.length == 0) {
                    server.errorMessage =
                        "Featured games list is empty - The spectator consumer is not connected to LoL servers";
                    return server;
                }
                server.success = true;
            } catch (e) {
                server.errorMessage = "Server not responding - Could not get featured games";
            }
            return server;
        })
    );

    console.log(`Test results:\n`);
    testResults.forEach((server: ServerTestResult) => {
        if(skipServers.includes(server.region)) {
            console.log(
                `\t${ANSI.FgYellow}${server.region} SKIPPED${ANSI.Reset}`
            );
        } else if (server.success) {
            console.log(
                `\t${server.region} ${server.version ? `(${server.version})` : ""} - ${
                    ANSI.FgGreen
                }Spectator server is online and working${ANSI.Reset}`
            );
        } else {
            console.log(
                `\t${server.region} ${server.version ? `(${server.version})` : ""} - ${ANSI.FgRed}${
                    server.errorMessage
                }${ANSI.Reset}`
            );
        }
    });
    console.log();

    const anyError = !!testResults.find((server: ServerTestResult) => !server.success);

    if (!anyError) {
        console.log(`${ANSI.FgGreen}All spectator servers are online and working${ANSI.Reset}`);
    } else {
        console.log(`${ANSI.FgRed}At least one spectator server is not working${ANSI.Reset}`);
        process.exit(1);
    }
}

testServers();
