import './bootstrap';
import * as commands from './commands';
import {default as chalk} from 'chalk';

const command = process.argv[2] || null;

if (!command) {
  showAvailable();
}

//@ts-ignore
const commandKey: string | undefined = Object.keys(commands).find(c => commands[c].command === command);

if (!commandKey) {
  showAvailable();
}

//@ts-ignore
const commandInstance = new commands[commandKey];

commandInstance
  .run()
  //.catch((error: any) => console.dir(error, {depth: 5}));
  .catch(console.error);

function showAvailable() {
  console.log(chalk.green('Loopback console'));
  console.log('');
  console.log(chalk.green('Available commands'));
  console.log('');
  for(const c of Object.keys(commands)) {
    //@ts-ignore
    console.log(`- ${chalk.green(commands[c].command)} - ${commands[c].description}`);
  }
  console.log('');
  process.exit();
}
