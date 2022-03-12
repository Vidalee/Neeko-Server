import { Logger } from './src/utils/Logger';
import { ANSI } from './src/utils/ANSI';
import { WebServer } from './src/WebServer';

Logger.info(`${ANSI.FgMagenta}Running Neeko-Server version ${process.env.npm_package_version}${ANSI.Reset}`);

new WebServer().start();

