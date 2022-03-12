import * as fsp from 'fs/promises'
export function fileExists(path: string): Promise<boolean> {
    return fsp.access(path).then(() => true).catch(() => false);
}

// Get date with Riot's format
export function getDate(): string {
    let date = new Date();
    let shortMonth = date.toLocaleString('en-US', { month: 'short' });
    let hour12 = date.toLocaleString('en-US', { hour12: true, hour: 'numeric', minute: 'numeric', second: 'numeric' });
    let result = `${shortMonth} ${date.getDay()}, ${date.getFullYear()} ${hour12}`;
    return result;
}