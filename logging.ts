import Anthropic from '@anthropic-ai/sdk';
import { Console } from 'console';
const console_err = new Console(process.stderr);
import * as fs from 'fs';

const instance_timestamp = Date.now();

export function init_logging() {
    fs.mkdirSync(`./souls/${instance_timestamp}`);
}

export function log_debug(message: Anthropic.Messages.Message) {
    const s = JSON.stringify(message, null, 2);
    // console_err.log(s);
    console_err.dir(message, { depth: 4 });
    fs.appendFileSync(`./souls/${instance_timestamp}/debug.json`, s + '\n\n');
}

export function log_thoughts(type: string, text?: string) {
    const s = `## ${type}\n${text}\n\n`
    console.log(s);
    fs.appendFileSync(`./souls/${instance_timestamp}/thoughts.md`, s);
}

export function log_soul_conversation(name: string, type: string, text?: string) {
    const s = `## ${type}\n${text}\n\n`
    fs.appendFileSync(`./souls/${instance_timestamp}/${name}.md`, s);
}
