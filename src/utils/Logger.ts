import * as config from '../../config.json';

export class Logger {
    private static readonly removeANSIRegExp = /\u001b\[.*?m/g;
    public static info(message: string) {
        if (config.use_ansi_colors)
            console.log(message);
        else
            console.log(message.replace(this.removeANSIRegExp, ''));
    }

    public static error(message: string) {
        if (config.use_ansi_colors)
            console.error(message);
        else
            console.error(message.replace(this.removeANSIRegExp, ''));
    }
}