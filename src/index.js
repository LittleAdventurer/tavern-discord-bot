import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { config } from 'dotenv';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';
import { startWebServer } from './web/server.js';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

async function loadCommands() {
  const commandsPath = join(__dirname, 'commands');
  const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = join(commandsPath, file);
    const command = await import(pathToFileURL(filePath).href);

    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      console.log(`[Command] ${command.data.name} 로드됨`);
    } else {
      console.log(`[Warning] ${filePath}에 data 또는 execute가 없습니다.`);
    }
  }
}

async function loadEvents() {
  const eventsPath = join(__dirname, 'events');
  const eventFiles = readdirSync(eventsPath).filter(file => file.endsWith('.js'));

  for (const file of eventFiles) {
    const filePath = join(eventsPath, file);
    const event = await import(pathToFileURL(filePath).href);

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
    console.log(`[Event] ${event.name} 로드됨`);
  }
}

async function main() {
  await loadCommands();
  await loadEvents();
  await client.login(process.env.DISCORD_TOKEN);

  // 웹 대시보드 서버 시작
  if (process.env.CLIENT_SECRET) {
    await startWebServer(client);
  } else {
    console.log('[Web] CLIENT_SECRET이 설정되지 않아 대시보드가 비활성화됩니다.');
  }
}

main().catch(console.error);
