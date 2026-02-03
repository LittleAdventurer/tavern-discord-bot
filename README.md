# Tavern Discord Bot

꼬마용사 여관 디스코드 봇 - 커뮤니티 관리 및 엔터테인먼트를 위한 다기능 디스코드 봇

## 기능

### 경제 시스템
| 명령어 | 설명 |
|--------|------|
| `/지갑` | 현재 보유 포인트 확인 |
| `/출석` | 매일 출석체크로 5,000 포인트 획득 |
| `/송금 <유저> <금액>` | 다른 유저에게 포인트 전송 |

### 도박
| 명령어 | 설명 |
|--------|------|
| `/가위바위보 <금액>` | 봇과 가위바위보 (승리 시 3배) |
| `/도박 <금액>` | 주사위 도박 (51+ 2배, 100 잭팟 5배) |

### 재미 기능
| 명령어 | 설명 |
|--------|------|
| `/메뉴추천` | 랜덤 음식 추천 (한식, 중식, 일식, 양식 등) |
| `/팀짜기` | 음성 채널 멤버를 2팀으로 랜덤 분배 |
| `/ping` | 봇 응답 속도 확인 |

### 게임 전적 검색
| 명령어 | 설명 |
|--------|------|
| `/전적 <게임> <닉네임>` | 게임 전적 사이트 바로가기 |

지원 게임: 롤, 발로란트, 오버워치, 배그, 메이플스토리

### 랭킹
| 명령어 | 설명 |
|--------|------|
| `/랭킹 <타입>` | 서버 내 채팅/음성 활동 랭킹 조회 |

### 나락 시스템 (흑역사 저장)
| 명령어 | 설명 |
|--------|------|
| `/저장 <키워드> <내용> [이름]` | 흑역사 저장 |
| `/불러오기 <키워드>` | 저장된 내용 검색 |
| `/나락 <이름>` | 특정 인물의 랜덤 흑역사 호출 |

## 기술 스택

- **Runtime**: Node.js (ES Modules)
- **Discord Library**: discord.js v14
- **Database**: SQLite (better-sqlite3)
- **Environment**: dotenv
- **CI/CD**: GitHub Actions

## 설치

### 요구사항
- Node.js 18+
- npm

### 로컬 설치

```bash
# 저장소 클론
git clone https://github.com/LittleAdventurer/tavern-discord-bot.git
cd tavern-discord-bot

# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env
# .env 파일을 편집하여 토큰 입력

# data 디렉토리 생성
mkdir data

# 슬래시 커맨드 등록
npm run deploy

# 봇 실행
npm start
```

### 환경변수

```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_here  # 선택사항 (길드 커맨드용)
```

## GCE 배포

### VM 설정

```bash
# Node.js 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential

# 저장소 클론
git clone https://github.com/LittleAdventurer/tavern-discord-bot.git
cd tavern-discord-bot

# 의존성 설치
npm install

# 환경변수 설정
cat > .env << 'EOF'
DISCORD_TOKEN=your_token
CLIENT_ID=your_client_id
GUILD_ID=your_guild_id
EOF

# data 디렉토리 생성
mkdir data

# PM2로 봇 실행
sudo npm install -g pm2
pm2 start src/index.js --name discord-bot
pm2 save
pm2 startup
```

### CI/CD (GitHub Actions)

main 브랜치에 push하면 자동으로 GCE VM에 배포됩니다.

**필요한 GitHub Secrets:**
| Name | Description |
|------|-------------|
| `GCE_HOST` | VM 외부 IP |
| `GCE_USERNAME` | SSH 사용자명 |
| `GCE_SSH_KEY` | SSH 개인키 |

## 프로젝트 구조

```
tavern-discord-bot/
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions 자동 배포
├── src/
│   ├── commands/           # 슬래시 커맨드 (13개)
│   │   ├── ping.js
│   │   ├── 가위바위보.js
│   │   ├── 나락.js
│   │   ├── 도박.js
│   │   ├── 랭킹.js
│   │   ├── 메뉴추천.js
│   │   ├── 불러오기.js
│   │   ├── 송금.js
│   │   ├── 저장.js
│   │   ├── 전적.js
│   │   ├── 지갑.js
│   │   ├── 출석.js
│   │   └── 팀짜기.js
│   ├── events/             # 이벤트 핸들러
│   │   ├── interactionCreate.js
│   │   ├── messageCreate.js
│   │   ├── ready.js
│   │   └── voiceStateUpdate.js
│   ├── database/
│   │   └── db.js           # SQLite 데이터베이스
│   ├── index.js            # 봇 엔트리포인트
│   └── deploy-commands.js  # 커맨드 등록 스크립트
├── data/
│   └── bot.db              # SQLite DB 파일
├── .env.example
├── package.json
└── README.md
```

## 데이터베이스 스키마

### users 테이블
| Column | Type | Description |
|--------|------|-------------|
| user_id | TEXT | Discord 유저 ID (PK) |
| balance | INTEGER | 보유 포인트 (기본값: 1000) |
| chat_count | INTEGER | 채팅 횟수 |
| voice_time | INTEGER | 음성채널 시간 (초) |
| daily_check | TEXT | 마지막 출석 날짜 |

### memes 테이블
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | 자동 증가 PK |
| keyword | TEXT | 검색 키워드 |
| name | TEXT | 인물 이름 |
| content | TEXT | 저장된 내용 |
| created_by | TEXT | 저장한 유저 ID |
| created_at | TEXT | 저장 시간 |

## 스크립트

```bash
npm start     # 봇 실행
npm run dev   # 개발 모드 (자동 재시작)
npm run deploy # 슬래시 커맨드 등록
```

## Discord Developer Portal 설정

1. [Discord Developer Portal](https://discord.com/developers/applications)에서 앱 생성
2. Bot 섹션에서 토큰 발급
3. **Privileged Gateway Intents** 활성화:
   - MESSAGE CONTENT INTENT
4. OAuth2 → URL Generator에서 봇 초대 링크 생성
   - Scopes: `bot`, `applications.commands`
   - Permissions: 필요한 권한 선택

## 라이선스

ISC
