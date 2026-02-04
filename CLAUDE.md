# CLAUDE.md

This file provides guidance for AI assistants working with the Tavern Discord Bot codebase.

## Project Overview

**Tavern Discord Bot** (꼬마용사 여관 디스코드 봇) is a feature-rich Discord bot for community management and entertainment. It includes an economy system, gambling games, activity tracking, and content storage features.

## TODO

- [x] Implement LoL API and update `/전적` command

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
│   ├── commands/           # Slash commands (15 files)
│   ├── events/             # Discord event handlers
│   ├── database/
│   │   └── db.js           # SQLite abstraction layer
│   ├── services/
│   │   └── lolApi.js       # Riot Games API integration
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

### LoL API Service: `src/services/lolApi.js`
- Integrates with Riot Games API for League of Legends stats
- Uses Account-v1, Summoner-v4, and League-v4 endpoints
- Supports Riot ID format (name#tag)
- Gracefully falls back to link-based response if API key is not configured
## Bot Status (Rotating Status Messages)

The bot displays rotating status messages with a "tavern receptionist" (여관 접수원) concept, changing every 10 minutes to make the bot appear more alive.

### Status Message Configuration

Located in `src/events/ready.js`:

| Mode | ActivityType | Messages |
|------|--------------|----------|
| 기본 업무 (Work) | Playing | "꼬마용사 여관 관리 중", "밀린 숙박비 계산 중", "객실 청소 중" |
| 대기 (Standby) | Watching | "빈 방이 있나 확인 중", "수상한 몬스터 감시 중" |
| 서비스 (Service) | Listening | "용사님들의 주문 듣는 중", "모험 이야기 경청 중" |

### Configuration Constants

```javascript
const STATUS_INTERVAL = 10 * 60 * 1000;  // Rotation interval (10 minutes)
```

### Adding New Status Messages

To add new status messages, edit the `statusMessages` array in `src/events/ready.js`:

```javascript
const statusMessages = [
  { type: ActivityType.Playing, message: '새로운 메시지' },
  { type: ActivityType.Watching, message: '새로운 메시지' },
  { type: ActivityType.Listening, message: '새로운 메시지' },
];
```

Available ActivityTypes: `Playing`, `Watching`, `Listening`, `Competing`

## Command Reference

### Economy Commands

| Command | Description | Options | Example |
|---------|-------------|---------|---------|
| `/지갑` | Check current balance | None | `/지갑` |
| `/출석` | Daily check-in (+5,000 points) | None | `/출석` |
| `/송금` | Transfer points to another user | `대상` (user), `금액` (amount) | `/송금 @user 1000` |

### Gambling Commands

| Command | Description | Options | Example |
|---------|-------------|---------|---------|
| `/도박` | Dice gambling (1-100) | `금액` (amount, 0=all-in) | `/도박 1000` |
| `/가위바위보` | Rock-paper-scissors | `선택` (choice), `금액` (amount) | `/가위바위보 가위 500` |

### Fun Commands

| Command | Description | Options | Example |
|---------|-------------|---------|---------|
| `/메뉴추천` | Random food recommendation | `카테고리` (optional) | `/메뉴추천 한식` |
| `/팀짜기` | Split voice channel into 2 teams | None | `/팀짜기` |
| `/ping` | Check bot latency | None | `/ping` |

### Game Stats Commands

| Command | Description | Options | Example |
|---------|-------------|---------|---------|
| `/전적` | Game stats lookup (LoL: API, others: links) | `게임` (game), `닉네임` (nickname#tag for LoL) | `/전적 lol Hide on bush#KR1` |

Supported games: LoL (with Riot API), Valorant, Overwatch, PUBG, MapleStory

#### LoL Stats (Riot API Integration)
When `RIOT_API_KEY` is configured, the `/전적` command for LoL shows:
- Summoner level and profile icon
- Solo/Duo rank with LP and win rate
- Flex rank with LP and win rate
- Tier-colored embed based on rank

**Riot ID Format**: `닉네임#태그` (e.g., `Hide on bush#KR1`). If no tag is provided, defaults to `#KR1`.

### Ranking Commands

| Command | Description | Options | Example |
|---------|-------------|---------|---------|
| `/랭킹` | View top 10 leaderboard | `종류` (chat/voice) | `/랭킹 채팅` |

### Content Storage Commands (Blackmail System)

| Command | Description | Options | Example |
|---------|-------------|---------|---------|
| `/저장` | Save content with keyword | `키워드`, `내용`, `이름` (optional) | `/저장 실수 "embarrassing moment" 홍길동` |
| `/불러오기` | Search by keyword | `키워드` | `/불러오기 실수` |
| `/나락` | Random content by person name | `이름` | `/나락 홍길동` |
| `/삭제` | Delete saved content (owner only) | `id` | `/삭제 42` |
| `/수정` | Edit saved content (owner only) | `id`, `내용` (optional), `키워드` (optional), `이름` (optional) | `/수정 42 내용:"new content"` |

## Database Function Reference

### User Functions

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `getUser(userId)` | `userId: string` | `User object` | Get or create user |
| `updateBalance(userId, amount)` | `userId: string, amount: number` | `new balance: number` | Add/subtract balance |
| `setBalance(userId, amount)` | `userId: string, amount: number` | `void` | Set exact balance |
| `checkDaily(userId)` | `userId: string` | `{ success, message?, newBalance? }` | Daily attendance |
| `incrementChatCount(userId)` | `userId: string` | `void` | Increment message count |
| `addVoiceTime(userId, seconds)` | `userId: string, seconds: number` | `void` | Add voice duration |
| `getRanking(type, limit)` | `type: 'chat'\|'voice', limit: number` | `Array<{user_id, value}>` | Get leaderboard |

### Meme/Content Functions

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `saveMeme(keyword, content, createdBy, name)` | `keyword, content, createdBy: string, name?: string` | `void` | Save content |
| `getMeme(keyword)` | `keyword: string` | `Array<Meme>` | Search by keyword |
| `getMemesByName(name)` | `name: string` | `Array<Meme>` | Search by person name |
| `getRandomMemeByName(name)` | `name: string` | `Meme \| null` | Random content for person |
| `getMemeById(id)` | `id: number` | `Meme \| undefined` | Get content by ID |
| `deleteMeme(id, userId)` | `id: number, userId: string` | `{ success, message?, meme? }` | Delete content (owner only) |
| `editMeme(id, userId, newContent, newKeyword, newName)` | `id: number, userId: string, ...` | `{ success, message?, oldMeme?, newMeme? }` | Edit content (owner only) |

### User Object Schema
```javascript
{
  user_id: string,      // Discord user ID
  balance: number,      // Point balance (default: 1000)
  chat_count: number,   // Message count
  voice_time: number,   // Voice duration in seconds
  daily_check: string   // Last check date (YYYY-MM-DD)
}
```

### Meme Object Schema
```javascript
{
  id: number,           // Auto-increment ID
  keyword: string,      // Search keyword
  name: string | null,  // Associated person name
  content: string,      // Stored content
  created_by: string,   // Creator's user ID
  created_at: string    // ISO timestamp
}
```

## Gambling Mechanics

### Dice Gambling (`/도박`)

| Roll | Result | Multiplier | Net Gain |
|------|--------|------------|----------|
| 1-50 | Lose | 0x | -bet |
| 51-99 | Win | 2x | +bet |
| 100 | Jackpot | 5x | +4x bet |

- **Win rate**: 50% (rolls 51-100)
- **Expected value**: Slightly negative (house edge)
- **All-in**: Enter `0` as amount to bet entire balance

### Rock-Paper-Scissors (`/가위바위보`)

| Result | Multiplier | Net Change |
|--------|------------|------------|
| Win | 3x | +2x bet |
| Draw | 1x | ±0 (refund) |
| Lose | 0x | -bet |

- **Win rate**: 33.3%
- **Draw rate**: 33.3%
- **Lose rate**: 33.3%
- **Expected value**: Neutral (no house edge)

### Balance Validation
- Cannot bet more than current balance
- Cannot bet with zero balance
- Minimum bet: 1 point (except all-in)

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
| Blackmail | `0xE91E63` (Pink) |
| Team | `0x9B59B6` (Purple) |

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

## Security Considerations

### Input Validation
- All user inputs are validated before database operations
- Integer options use `setMinValue()` to prevent negative amounts
- String inputs are used directly with prepared statements (SQL injection safe)

### Protected Operations
- **Self-transfer blocked**: Users cannot send points to themselves
- **Bot transfer blocked**: Users cannot send points to bots
- **Balance checks**: All transactions verify sufficient balance first

### Database Security
- Uses prepared statements (parameterized queries) - no SQL injection risk
- SQLite file stored in `data/` directory (gitignored)
- No sensitive data stored (only Discord user IDs)

### Rate Limiting
- Message tracking has 3-second cooldown per user
- Prevents spam farming of chat count

### Recommendations for New Features
1. Always validate user input before database operations
2. Use ephemeral messages for error responses (private to user)
3. Check `interaction.user.bot` to prevent bot interactions
4. Use prepared statements for any new database queries
5. Sanitize any content displayed in embeds (truncate long strings)

## Known Limitations

### Voice Tracking
- **Data loss on restart**: Voice join times stored in-memory Map
- If bot restarts while users are in voice channels, their current session is lost
- Only records time when user leaves the channel

**Potential improvement**: Persist join times to database or implement periodic checkpoints.

### Content Storage
- No pagination for large search results (shows max 5)

### Economy System
- No maximum balance cap
- No transaction history/logs
- No anti-cheat for rapid gambling

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

-- Indexes for search performance
CREATE INDEX idx_memes_keyword ON memes(keyword);
CREATE INDEX idx_memes_name ON memes(name);
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
RIOT_API_KEY=            # Optional: Riot Games API key for LoL stats
```

### Getting a Riot API Key
1. Go to [Riot Developer Portal](https://developer.riotgames.com)
2. Sign in with your Riot account
3. Register a new application or use development API key
4. Add the key to your `.env` file

## CI/CD Deployment

Push to `main` branch triggers GitHub Actions:
1. SSH into GCE VM
2. `git pull` latest changes
3. `npm install` dependencies
4. `pm2 restart discord-bot`

Required GitHub Secrets: `GCE_HOST`, `GCE_USERNAME`, `GCE_SSH_KEY`

## Troubleshooting

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `DISCORD_TOKEN is not defined` | Missing .env file | Copy `.env.example` to `.env` and add token |
| `Missing Access` | Bot lacks permissions | Check bot role permissions in Discord server |
| `Unknown interaction` | Command not registered | Run `npm run deploy` |
| `SQLITE_CANTOPEN` | Missing data directory | Create `data/` folder: `mkdir data` |
| `Cannot find module` | Missing dependencies | Run `npm install` |
| `Used disallowed intents` | Intents not enabled | Enable intents in Discord Developer Portal |

### Discord Developer Portal Setup
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application → Bot
3. Enable these Privileged Gateway Intents:
   - Message Content Intent
   - Server Members Intent (if needed)

### Command Not Showing
1. Verify command file exports `data` and `execute`
2. Run `npm run deploy`
3. Wait up to 1 hour for global commands (instant for guild commands)
4. Check console for deployment errors

### Database Issues
```bash
# View database contents
sqlite3 data/bot.db "SELECT * FROM users LIMIT 10;"

# Reset database (caution: deletes all data)
rm data/bot.db
# Restart bot to recreate tables
```

### PM2 Commands (Production)
```bash
pm2 status              # Check bot status
pm2 logs discord-bot    # View logs
pm2 restart discord-bot # Restart bot
pm2 stop discord-bot    # Stop bot
```

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
