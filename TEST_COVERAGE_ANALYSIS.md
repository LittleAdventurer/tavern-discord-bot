# Test Coverage Analysis Report

## Executive Summary

**Current State:** 0% test coverage - no automated tests exist
**Codebase Size:** ~1,090 LOC across 21 files
**Estimated Test Cases Needed:** 150-200+ tests

The codebase has no testing infrastructure. All testing is currently manual. This analysis identifies priority areas for testing and provides specific recommendations for implementation.

---

## Current Testing Infrastructure

| Component | Status |
|-----------|--------|
| Test Framework | None |
| Test Files | None |
| Test Script | None |
| CI Test Integration | None |
| Code Coverage Tool | None |

---

## Priority Areas for Testing

### Priority 1: CRITICAL (Financial Logic)

These areas handle user balances and must be bug-free to maintain trust.

#### 1. Database Layer (`src/database/db.js`)

**Why:** Single point of failure - 12/14 commands and 3/4 events depend on this module.

| Function | Risk Level | Test Cases Needed |
|----------|------------|-------------------|
| `updateBalance(userId, amount)` | Critical | Positive/negative amounts, concurrent updates, overflow handling |
| `setBalance(userId, amount)` | Critical | Valid amounts, zero balance, negative prevention |
| `getUser(userId)` | High | New user creation, existing user retrieval, idempotency |
| `checkDaily(userId)` | High | Same-day rejection, date boundary (midnight), timezone handling |
| `getRanking(type, limit)` | Medium | Empty results, limit boundary, type validation |

**Recommended Tests:**
```javascript
// Example test cases for updateBalance
describe('updateBalance', () => {
  test('should add positive amount to balance');
  test('should subtract negative amount from balance');
  test('should return new balance after update');
  test('should handle zero amount');
  test('should create user if not exists');
  test('should handle concurrent balance updates');
});
```

#### 2. Gambling Commands

**`/도박` (src/commands/도박.js)**

| Scenario | Expected Behavior | Test Priority |
|----------|-------------------|---------------|
| Roll 1-50 | Lose bet amount | Critical |
| Roll 51-99 | Win 2x bet | Critical |
| Roll 100 | Win 5x bet (jackpot) | Critical |
| All-in (amount=0) | Bet entire balance | High |
| Insufficient balance | Reject with error | High |
| Zero balance | Reject betting | High |
| Negative amount | Block (UI prevents, but test) | Medium |

**Testing Challenge:** `Math.random()` must be mocked.

```javascript
// Testing strategy
describe('도박 command', () => {
  beforeEach(() => {
    jest.spyOn(Math, 'random');
  });

  test('roll 50 should lose', () => {
    Math.random.mockReturnValue(0.49); // Returns 50
    // Execute command, verify balance decreased
  });

  test('roll 51 should win 2x', () => {
    Math.random.mockReturnValue(0.50); // Returns 51
    // Execute command, verify balance increased by bet amount
  });

  test('roll 100 should trigger jackpot 5x', () => {
    Math.random.mockReturnValue(0.99); // Returns 100
    // Execute command, verify balance increased by 4x bet
  });
});
```

**`/가위바위보` (src/commands/가위바위보.js)**

| Player Choice | Bot Choice | Result | Multiplier |
|---------------|------------|--------|------------|
| 가위 | 보 | Win | 3x |
| 가위 | 가위 | Draw | 1x (refund) |
| 가위 | 바위 | Lose | 0x |

**Test Matrix:** 9 combinations (3 player choices × 3 bot choices)

```javascript
describe('가위바위보 game logic', () => {
  const testCases = [
    { player: '가위', bot: '보', expected: 'win' },
    { player: '가위', bot: '가위', expected: 'draw' },
    { player: '가위', bot: '바위', expected: 'lose' },
    // ... 6 more combinations
  ];

  testCases.forEach(({ player, bot, expected }) => {
    test(`${player} vs ${bot} should be ${expected}`, () => {
      const result = getResult(player, bot);
      expect(result).toBe(expected);
    });
  });
});
```

#### 3. Fund Transfer (`/송금`)

| Validation | Expected Response |
|------------|-------------------|
| Self-transfer | Block with error message |
| Transfer to bot | Block with error message |
| Insufficient balance | Block with error message |
| Exact balance transfer | Allow (zero remaining) |
| Valid transfer | Deduct from sender, add to receiver |

```javascript
describe('송금 command', () => {
  test('should prevent self-transfer');
  test('should prevent transfer to bot');
  test('should prevent transfer exceeding balance');
  test('should allow transfer of exact balance amount');
  test('should correctly update both user balances');
  test('should handle non-existent receiver (auto-create)');
});
```

---

### Priority 2: HIGH (Data Integrity)

#### 4. Voice Time Tracking (`src/events/voiceStateUpdate.js`)

**Current Issues:**
- In-memory Map loses data on restart
- Time calculation depends on `Date.now()`

| Scenario | Expected Behavior |
|----------|-------------------|
| User joins voice channel | Store join timestamp |
| User leaves voice channel | Calculate duration, update DB |
| User switches channels | Do NOT reset time |
| Bot user joins | Ignore |
| User in channel at restart | Lost session (known limitation) |

```javascript
describe('voiceStateUpdate', () => {
  test('should track join time when user joins voice');
  test('should calculate correct duration on leave');
  test('should not reset time on channel switch');
  test('should ignore bot users');
  test('should handle rapid join/leave cycles');
});
```

#### 5. Message Cooldown (`src/events/messageCreate.js`)

| Scenario | Expected Behavior |
|----------|-------------------|
| First message | Increment count, set cooldown |
| Message within 3 seconds | Skip increment |
| Message after 3 seconds | Increment count |
| Bot message | Ignore |
| DM message | Ignore |

```javascript
describe('messageCreate cooldown', () => {
  test('should increment count on first message');
  test('should not increment within 3 second cooldown');
  test('should increment after cooldown expires');
  test('should track cooldowns per-user independently');
});
```

#### 6. Daily Attendance (`checkDaily`)

| Scenario | Expected Behavior |
|----------|-------------------|
| First check-in ever | Success, +5000 points |
| Second check-in same day | Failure, no points |
| Check-in next day | Success, +5000 points |
| Midnight boundary | Handle correctly |

---

### Priority 3: MEDIUM (User Experience)

#### 7. Command Error Handling (`src/events/interactionCreate.js`)

| Scenario | Expected Behavior |
|----------|-------------------|
| Unknown command | Log error, no crash |
| Command throws error | Ephemeral error message |
| Already replied interaction | Use followUp instead |
| Deferred interaction | Edit reply on error |

#### 8. Team Shuffle (`/팀짜기`)

| Scenario | Expected Behavior |
|----------|-------------------|
| 2 players | 1 per team |
| 4 players | 2 per team |
| 5 players (odd) | 2 vs 2 + 1 spectator |
| 1 player | Error or 1 vs empty |
| 0 players | Error message |

---

## Recommended Testing Stack

### Dependencies to Add

```json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "jest-mock-extended": "^3.0.5",
    "@types/jest": "^29.5.12"
  }
}
```

### Package.json Scripts

```json
{
  "scripts": {
    "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js",
    "test:watch": "npm test -- --watch",
    "test:coverage": "npm test -- --coverage"
  }
}
```

### Jest Configuration

```javascript
// jest.config.js
export default {
  testEnvironment: 'node',
  transform: {},
  moduleFileExtensions: ['js'],
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/deploy-commands.js'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

---

## Proposed Test Directory Structure

```
tests/
├── unit/
│   ├── database/
│   │   ├── db.test.js           # All 13 DB functions
│   │   └── setup.js             # In-memory DB fixture
│   ├── commands/
│   │   ├── 도박.test.js         # Gambling logic
│   │   ├── 가위바위보.test.js   # RPS game logic
│   │   ├── 송금.test.js         # Transfer validation
│   │   ├── 출석.test.js         # Daily check-in
│   │   └── 팀짜기.test.js       # Shuffle algorithm
│   └── events/
│       ├── voiceStateUpdate.test.js
│       └── messageCreate.test.js
├── integration/
│   └── economy-flow.test.js     # Full user lifecycle
├── helpers/
│   ├── mock-interaction.js      # Discord.js mocks
│   └── mock-db.js               # DB test utilities
└── fixtures/
    └── sample-data.js           # Test data constants
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)

1. **Install testing dependencies**
2. **Configure Jest for ES Modules**
3. **Create test helpers:**
   - In-memory SQLite database setup
   - Discord.js interaction mocks
4. **Write database tests** (~40 tests)
   - Highest ROI, core to all features

### Phase 2: Critical Path (Week 2)

5. **Test gambling commands** (~35 tests)
   - 도박.js with Math.random mocking
   - 가위바위보.js game logic
6. **Test fund transfer** (~15 tests)
   - All validation paths
   - Balance mutation correctness

### Phase 3: Data Integrity (Week 3)

7. **Test event handlers** (~30 tests)
   - Voice tracking timing
   - Message cooldown logic
8. **Test daily attendance** (~10 tests)
   - Date boundary conditions

### Phase 4: Polish (Week 4)

9. **Integration tests** (~20 tests)
   - User registration → gambling → transfer flow
10. **CI Integration**
    - Add test step to GitHub Actions
    - Block deployment on test failure
11. **Coverage enforcement**
    - Set minimum coverage thresholds

---

## Quick Wins: Easiest Tests to Write First

### 1. Pure Function Tests (No Mocking Required)

Extract and test these pure functions:

```javascript
// From 가위바위보.js - game result logic
function getResult(playerChoice, botChoice) {
  if (playerChoice === botChoice) return 'draw';
  const wins = { '가위': '보', '바위': '가위', '보': '바위' };
  return wins[playerChoice] === botChoice ? 'win' : 'lose';
}

// From 팀짜기.js - shuffle algorithm
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// From 랭킹.js - time formatting
function formatVoiceTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`;
}
```

### 2. Database Tests with In-Memory SQLite

```javascript
// tests/helpers/setup.js
import Database from 'better-sqlite3';

export function createTestDb() {
  const db = new Database(':memory:');

  db.exec(`
    CREATE TABLE users (
      user_id TEXT PRIMARY KEY,
      balance INTEGER DEFAULT 1000,
      chat_count INTEGER DEFAULT 0,
      voice_time INTEGER DEFAULT 0,
      daily_check TEXT
    )
  `);

  db.exec(`
    CREATE TABLE memes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT NOT NULL,
      name TEXT,
      content TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  return db;
}
```

---

## Metrics & Goals

| Metric | Current | Target (3 months) |
|--------|---------|-------------------|
| Test Files | 0 | 15+ |
| Test Cases | 0 | 150+ |
| Line Coverage | 0% | 80% |
| Branch Coverage | 0% | 70% |
| Critical Path Coverage | 0% | 95% |

---

## Risk Assessment

### High Risk Areas Without Tests

| Area | Risk | Impact if Bug |
|------|------|---------------|
| Balance calculations | Users gain/lose wrong amounts | Loss of user trust |
| Gambling odds | Unfair outcomes | Community complaints |
| Transfer validation | Exploit potential | Economy broken |
| Voice tracking | Lost activity data | Unfair rankings |

### Benefits of Adding Tests

1. **Confidence in changes** - Refactor without fear
2. **Faster debugging** - Tests pinpoint failures
3. **Documentation** - Tests show expected behavior
4. **CI/CD safety** - Block broken deployments
5. **Onboarding** - New contributors understand code faster

---

## Conclusion

The codebase is well-structured and testable but lacks any automated testing. The database layer should be prioritized first as it provides the highest return on investment - a single test file can cover functionality used by 15+ other files.

Estimated total effort: **20-30 hours** for comprehensive coverage

Recommended starting point: `src/database/db.js` unit tests
