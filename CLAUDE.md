# CLAUDE.md

This file provides guidance for AI assistants working with the Tavern Discord Bot codebase.

## Project Overview

**Tavern Discord Bot** (꼬마용사 여관 디스코드 봇) is a feature-rich Discord bot for community management and entertainment. It includes an economy system, gambling games, activity tracking, and content storage features.

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js 18+ (ES Modules) |
| Discord Library | discord.js v14 |
| Database | SQLite (better-sqlite3) |
| Environment | dotenv |
| CI/CD | GitHub Actions → GCE with PM2 |

## Directory Structure

```
tavern-discord-bot/
├── src/
│   ├── commands/           # Slash commands (13 files)
│   ├── events/             # Discord event handlers
│   ├── database/
│   │   └── db.js           # SQLite abstraction layer
│   ├── index.js            # Bot entry point
│   └── deploy-commands.js  # Command registration script
├── data/
│   └── bot.db              # SQLite database (gitignored)
├── .github/workflows/
│   └── deploy.yml          # Auto-deployment workflow
├── .env.example            # Environment template
└── package.json
```

## Key Files

### Entry Point: `src/index.js`
- Initializes Discord client with required intents (Guilds, GuildMessages, GuildVoiceStates, MessageContent)
- Dynamically loads commands from `src/commands/` and events from `src/events/`
- Uses ES Module dynamic imports with `pathToFileURL`

### Database: `src/database/db.js`
- Synchronous SQLite operations (no async needed)
- Auto-creates users on first access via `getUser(userId)`
- Two tables: `users` (economy/stats) and `memes` (content storage)
- All database functions are exported individually

### Commands: `src/commands/*.js`
Each command exports:
- `data`: SlashCommandBuilder instance
- `execute(interaction)`: Async handler function

### Events: `src/events/*.js`
Each event exports:
- `name`: Event name from discord.js Events enum
- `once`: Optional boolean for one-time events
- `execute(...args)`: Handler function

## Code Conventions

### Command Structure Template
```javascript
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { /* functions */ } from '../database/db.js';

export const data = new SlashCommandBuilder()
  .setName('command-name')
  .setDescription('Description');

export async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0x2ECC71)
    .setTitle('Title')
    .setDescription('Content');

  await interaction.reply({ embeds: [embed] });
}
```

### Event Structure Template
```javascript
import { Events } from 'discord.js';

export const name = Events.EventName;
export const once = false; // optional

export async function execute(arg1, arg2) {
  // Handler logic
}
```

### Embed Color Palette
| Purpose | Hex Code |
|---------|----------|
| Success | `0x2ECC71` (Green) |
| Error | `0xE74C3C` (Red) |
| Info | `0x3498DB` (Blue) |
| Warning | `0x95A5A6` (Gray) |
| Gold/Money | `0xF1C40F` (Yellow) |
| Special | `0xE67E22` (Orange) |

### Naming Conventions
- **Command names**: Korean (e.g., `지갑`, `송금`, `출석`)
- **File names**: Korean for commands, English for infrastructure files
- **Functions**: camelCase (e.g., `getUser`, `updateBalance`)
- **Console logs**: Korean with prefixes like `[Command]`, `[Event]`, `[Error]`

### Error Handling
- Wrap command execution in try-catch (handled by `interactionCreate.js`)
- Use ephemeral messages for errors: `{ content: 'error', ephemeral: true }`
- Validate user input before database operations
- Check for edge cases (self-transfer, bot users, insufficient balance)

## Database Schema

### users table
```sql
user_id TEXT PRIMARY KEY     -- Discord user ID
balance INTEGER DEFAULT 1000 -- Point balance
chat_count INTEGER DEFAULT 0 -- Message count for ranking
voice_time INTEGER DEFAULT 0 -- Voice duration in seconds
daily_check TEXT             -- Last attendance date (YYYY-MM-DD)
```

### memes table
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
keyword TEXT NOT NULL        -- Search keyword
name TEXT                    -- Associated person name
content TEXT NOT NULL        -- Stored content
created_by TEXT NOT NULL     -- Creator's user ID
created_at TEXT              -- Timestamp
```

## Development Workflow

### Running Locally
```bash
npm install              # Install dependencies
cp .env.example .env     # Create .env and add tokens
mkdir data               # Create data directory for SQLite
npm run deploy           # Register slash commands with Discord
npm start                # Run the bot
```

### Development Mode
```bash
npm run dev              # Auto-restart on file changes
```

### Adding a New Command
1. Create `src/commands/commandname.js`
2. Export `data` (SlashCommandBuilder) and `execute` function
3. Run `npm run deploy` to register with Discord
4. Restart the bot

### Adding a New Event
1. Create `src/events/eventname.js`
2. Export `name`, optionally `once`, and `execute` function
3. Restart the bot (events auto-load)

## Environment Variables

```env
DISCORD_TOKEN=           # Bot token from Discord Developer Portal
CLIENT_ID=               # Application ID
GUILD_ID=                # Optional: for guild-only command deployment
```

## CI/CD Deployment

Push to `main` branch triggers GitHub Actions:
1. SSH into GCE VM
2. `git pull` latest changes
3. `npm install` dependencies
4. `pm2 restart discord-bot`

Required GitHub Secrets: `GCE_HOST`, `GCE_USERNAME`, `GCE_SSH_KEY`

## Important Implementation Details

### Rate Limiting
- Message tracking: 3-second cooldown per user (in-memory Map)
- Voice tracking: Join times stored in-memory (lost on restart)

### Gambling System
- Dice (`/도박`): Roll 1-100, 51+ wins 2x, 100 = 5x jackpot
- RPS (`/가위바위보`): Win = 3x, Draw = refund, Lose = forfeit
- Amount 0 = all-in bet

### Rankings
- Chat: Incremented per message (with cooldown)
- Voice: Tracked in seconds, displayed as hours:minutes
- Top 10 with medal emojis (🥇🥈🥉)

## Common Tasks

### Fix a command bug
1. Read the command file in `src/commands/`
2. Check database functions in `src/database/db.js`
3. Test locally with `npm run dev`

### Add database functionality
1. Add function in `src/database/db.js`
2. Export the function
3. Import in commands that need it

### Modify bot permissions/intents
1. Update intents array in `src/index.js`
2. Update bot permissions in Discord Developer Portal

## Testing

No automated tests. Manual testing workflow:
1. Run bot locally with `npm run dev`
2. Test commands in a Discord server
3. Check console for errors
4. Verify database changes in `data/bot.db`
