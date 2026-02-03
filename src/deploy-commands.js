import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const commands = [];
const commandsPath = join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = join(commandsPath, file);
  const command = await import(pathToFileURL(filePath).href);

  if ('data' in command && 'execute' in command) {
    commands.push(command.data.toJSON());
  }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

async function deployCommands() {
  try {
    console.log(`[Deploy] ${commands.length}개의 커맨드를 등록합니다...`);

    if (process.env.GUILD_ID) {
      // 특정 길드에 등록 (즉시 반영)
      const data = await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );
      console.log(`[Deploy] ${data.length}개의 길드 커맨드가 등록되었습니다.`);
    } else {
      // 글로벌 등록 (반영까지 최대 1시간 소요)
      const data = await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
      );
      console.log(`[Deploy] ${data.length}개의 글로벌 커맨드가 등록되었습니다.`);
    }
  } catch (error) {
    console.error('[Deploy] 커맨드 등록 중 오류:', error);
  }
}

deployCommands();
