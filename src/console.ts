import * as commands from './commands';

const command = process.argv[2] || null;

if (!command) {
}

//@ts-ignore
const commandKey: string | undefined = Object.keys(commands).find(c => commands[c].command === command);

if (!commandKey) {
}

console.log(commandKey);
