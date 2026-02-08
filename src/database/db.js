import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, '../../data/bot.db'));

// 테이블 초기화
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    balance INTEGER DEFAULT 1000,
    chat_count INTEGER DEFAULT 0,
    voice_time INTEGER DEFAULT 0,
    daily_check TEXT DEFAULT NULL
  );

  CREATE TABLE IF NOT EXISTS memes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT NOT NULL,
    name TEXT,
    content TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_memes_keyword ON memes(keyword);
  CREATE INDEX IF NOT EXISTS idx_memes_name ON memes(name);

  CREATE TABLE IF NOT EXISTS shop_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price INTEGER NOT NULL,
    emoji TEXT DEFAULT '📦',
    category TEXT DEFAULT 'general',
    consumable INTEGER DEFAULT 0,
    available INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS user_inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    item_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    acquired_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES shop_items(id)
  );

  CREATE INDEX IF NOT EXISTS idx_inventory_user ON user_inventory(user_id);
  CREATE INDEX IF NOT EXISTS idx_inventory_item ON user_inventory(item_id);

  CREATE TABLE IF NOT EXISTS user_buffs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    buff_type TEXT NOT NULL,
    item_id INTEGER NOT NULL,
    multiplier REAL DEFAULT 1.0,
    expires_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, buff_type)
  );

  CREATE INDEX IF NOT EXISTS idx_buffs_user ON user_buffs(user_id);
`);

// user_buffs 테이블에 새 컬럼 추가 (기존 DB 마이그레이션)
try {
  db.exec(`ALTER TABLE user_buffs ADD COLUMN multiplier REAL DEFAULT 1.0`);
} catch (e) {
  // 이미 컬럼이 존재하면 무시
}
try {
  db.exec(`ALTER TABLE user_buffs ADD COLUMN expires_at TEXT`);
} catch (e) {
  // 이미 컬럼이 존재하면 무시
}

// 상점 아이템 초기화 (없으면 추가)
const itemCount = db.prepare('SELECT COUNT(*) as count FROM shop_items').get().count;
if (itemCount === 0) {
  const insertItem = db.prepare('INSERT INTO shop_items (name, description, price, emoji, category, consumable) VALUES (?, ?, ?, ?, ?, ?)');

  // 칭호 아이템
  insertItem.run('신입 용사', '여관에 처음 온 용사의 칭호입니다.', 5000, '🌱', 'title', 0);
  insertItem.run('숙련된 모험가', '수많은 모험을 경험한 모험가의 칭호입니다.', 25000, '⚔️', 'title', 0);
  insertItem.run('전설의 영웅', '대륙에 이름을 떨친 전설적인 영웅의 칭호입니다.', 100000, '👑', 'title', 0);
  insertItem.run('여관 단골손님', '여관 주인이 인정한 단골손님의 칭호입니다.', 50000, '🏠', 'title', 0);

  // 소비 아이템
  insertItem.run('행운의 맥주', '마시면 다음 도박에서 행운이 찾아옵니다. (승률 +10%)', 3000, '🍺', 'consumable', 1);
  insertItem.run('여관 특제 스튜', '(구버전) 먹으면 다음 출석 보상이 2배가 됩니다.', 8000, '🍲', 'consumable', 1);

  // 수집품
  insertItem.run('여관 VIP 열쇠', '여관의 특별한 방을 열 수 있는 열쇠입니다.', 30000, '🔑', 'collectible', 0);
  insertItem.run('황금 주사위', '전설적인 도박사가 사용했다는 황금 주사위입니다.', 50000, '🎲', 'collectible', 0);

  console.log('[Database] 상점 아이템 초기화 완료');
}

// 기존 스튜 비활성화 및 새로운 스튜 아이템 추가
const oldStew = db.prepare('SELECT * FROM shop_items WHERE id = 6').get();
if (oldStew && oldStew.available === 1) {
  db.prepare('UPDATE shop_items SET available = 0 WHERE id = 6').run();
  console.log('[Database] 기존 스튜 아이템 비활성화');
}

// 새로운 스튜 아이템 추가
const newStewExists = db.prepare("SELECT COUNT(*) as count FROM shop_items WHERE name LIKE '%스튜%' AND id > 8").get().count;
if (newStewExists === 0) {
  const insertItem = db.prepare('INSERT INTO shop_items (name, description, price, emoji, category, consumable) VALUES (?, ?, ?, ?, ?, ?)');

  insertItem.run('여관 특제 스튜', '출석 보상이 1.25배가 됩니다. (1회 사용)', 5000, '🍲', 'consumable', 1);
  insertItem.run('여관 고급 스튜', '출석 보상이 1.5배가 됩니다. (1회 사용)', 12000, '🥘', 'consumable', 1);
  insertItem.run('여관 전설의 스튜', '출석 보상이 2배가 됩니다. (1회 사용)', 25000, '🫕', 'consumable', 1);

  console.log('[Database] 새로운 스튜 아이템 추가 완료');
}

// 스튜 아이템 설명 업데이트 (7일 → 1회 사용)
const stew9Check = db.prepare('SELECT * FROM shop_items WHERE id = 9').get();
if (stew9Check && stew9Check.description.includes('7일간')) {
  db.prepare("UPDATE shop_items SET description = '출석 보상이 1.25배가 됩니다. (1회 사용)', price = 5000 WHERE id = 9").run();
  db.prepare("UPDATE shop_items SET description = '출석 보상이 1.5배가 됩니다. (1회 사용)', price = 12000 WHERE id = 10").run();
  db.prepare("UPDATE shop_items SET description = '출석 보상이 2배가 됩니다. (1회 사용)', price = 25000 WHERE id = 11").run();
  console.log('[Database] 스튜 아이템 설명 업데이트 (1회 사용)');
}

// 유저 조회 또는 생성
export function getUser(userId) {
  let user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
  if (!user) {
    db.prepare('INSERT INTO users (user_id) VALUES (?)').run(userId);
    user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
  }
  return user;
}

// 잔액 업데이트
export function updateBalance(userId, amount) {
  getUser(userId); // 유저가 없으면 생성
  db.prepare('UPDATE users SET balance = balance + ? WHERE user_id = ?').run(amount, userId);
  return getUser(userId).balance;
}

// 잔액 설정
export function setBalance(userId, amount) {
  getUser(userId);
  db.prepare('UPDATE users SET balance = ? WHERE user_id = ?').run(amount, userId);
}

// 출석 체크
export function checkDaily(userId, rewardAmount = 5000) {
  const user = getUser(userId);
  const today = new Date().toISOString().split('T')[0];

  if (user.daily_check === today) {
    return { success: false, message: '오늘 이미 출석체크를 했습니다!' };
  }

  db.prepare('UPDATE users SET daily_check = ?, balance = balance + ? WHERE user_id = ?').run(today, rewardAmount, userId);
  return { success: true, newBalance: getUser(userId).balance, rewardAmount };
}

// 채팅 카운트 증가
export function incrementChatCount(userId) {
  getUser(userId);
  db.prepare('UPDATE users SET chat_count = chat_count + 1 WHERE user_id = ?').run(userId);
}

// 음성 시간 추가
export function addVoiceTime(userId, seconds) {
  getUser(userId);
  db.prepare('UPDATE users SET voice_time = voice_time + ? WHERE user_id = ?').run(seconds, userId);
}

// 랭킹 조회
export function getRanking(type, limit = 10) {
  const column = type === 'voice' ? 'voice_time' : 'chat_count';
  return db.prepare(`SELECT user_id, ${column} as value FROM users ORDER BY ${column} DESC LIMIT ?`).all(limit);
}

// 밈 저장
export function saveMeme(keyword, content, createdBy, name = null) {
  db.prepare('INSERT INTO memes (keyword, name, content, created_by) VALUES (?, ?, ?, ?)').run(keyword, name, content, createdBy);
}

// 밈 조회 (키워드로)
export function getMeme(keyword) {
  return db.prepare('SELECT * FROM memes WHERE keyword = ?').all(keyword);
}

// 밈 조회 (이름으로)
export function getMemesByName(name) {
  return db.prepare('SELECT * FROM memes WHERE name = ?').all(name);
}

// 랜덤 밈 조회 (이름으로)
export function getRandomMemeByName(name) {
  const memes = getMemesByName(name);
  if (memes.length === 0) return null;
  return memes[Math.floor(Math.random() * memes.length)];
}

// 밈 조회 (ID로)
export function getMemeById(id) {
  return db.prepare('SELECT * FROM memes WHERE id = ?').get(id);
}

// 밈 삭제
export function deleteMeme(id, userId) {
  const meme = getMemeById(id);
  if (!meme) {
    return { success: false, message: '해당 ID의 저장된 내용이 없습니다.' };
  }
  if (meme.created_by !== userId) {
    return { success: false, message: '본인이 저장한 내용만 삭제할 수 있습니다.' };
  }
  db.prepare('DELETE FROM memes WHERE id = ?').run(id);
  return { success: true, meme };
}

// 밈 수정
export function editMeme(id, userId, newContent, newKeyword = null, newName = undefined) {
  const meme = getMemeById(id);
  if (!meme) {
    return { success: false, message: '해당 ID의 저장된 내용이 없습니다.' };
  }
  if (meme.created_by !== userId) {
    return { success: false, message: '본인이 저장한 내용만 수정할 수 있습니다.' };
  }

  const updatedContent = newContent || meme.content;
  const updatedKeyword = newKeyword || meme.keyword;
  const updatedName = newName === undefined ? meme.name : newName;

  db.prepare('UPDATE memes SET content = ?, keyword = ?, name = ? WHERE id = ?')
    .run(updatedContent, updatedKeyword, updatedName, id);

  return { success: true, oldMeme: meme, newMeme: getMemeById(id) };
}

// ==================== 상점 시스템 ====================

// 상점 아이템 전체 조회
export function getShopItems(category = null) {
  if (category) {
    return db.prepare('SELECT * FROM shop_items WHERE available = 1 AND category = ? ORDER BY price ASC').all(category);
  }
  return db.prepare('SELECT * FROM shop_items WHERE available = 1 ORDER BY category, price ASC').all();
}

// 상점 아이템 단일 조회
export function getShopItemById(itemId) {
  return db.prepare('SELECT * FROM shop_items WHERE id = ?').get(itemId);
}

// 유저 인벤토리 조회
export function getUserInventory(userId) {
  return db.prepare(`
    SELECT ui.*, si.name, si.description, si.emoji, si.category, si.consumable
    FROM user_inventory ui
    JOIN shop_items si ON ui.item_id = si.id
    WHERE ui.user_id = ?
    ORDER BY si.category, si.name
  `).all(userId);
}

// 유저가 특정 아이템 보유 여부 확인
export function hasItem(userId, itemId) {
  const item = db.prepare('SELECT * FROM user_inventory WHERE user_id = ? AND item_id = ?').get(userId, itemId);
  return item && item.quantity > 0;
}

// 유저의 특정 아이템 수량 조회
export function getItemQuantity(userId, itemId) {
  const item = db.prepare('SELECT quantity FROM user_inventory WHERE user_id = ? AND item_id = ?').get(userId, itemId);
  return item ? item.quantity : 0;
}

// 아이템 구매
export function purchaseItem(userId, itemId) {
  const user = getUser(userId);
  const item = getShopItemById(itemId);

  if (!item) {
    return { success: false, message: '존재하지 않는 아이템입니다.' };
  }

  if (!item.available) {
    return { success: false, message: '현재 구매할 수 없는 아이템입니다.' };
  }

  if (user.balance < item.price) {
    return { success: false, message: `잔액이 부족합니다. (필요: ${item.price.toLocaleString()}원, 보유: ${user.balance.toLocaleString()}원)` };
  }

  // 칭호나 수집품은 중복 구매 불가
  if (!item.consumable && hasItem(userId, itemId)) {
    return { success: false, message: '이미 보유한 아이템입니다.' };
  }

  // 잔액 차감
  updateBalance(userId, -item.price);

  // 인벤토리에 추가 (소비 아이템은 수량 증가, 그 외는 새로 추가)
  const existingItem = db.prepare('SELECT * FROM user_inventory WHERE user_id = ? AND item_id = ?').get(userId, itemId);

  if (existingItem) {
    db.prepare('UPDATE user_inventory SET quantity = quantity + 1 WHERE user_id = ? AND item_id = ?').run(userId, itemId);
  } else {
    db.prepare('INSERT INTO user_inventory (user_id, item_id, quantity) VALUES (?, ?, 1)').run(userId, itemId);
  }

  return {
    success: true,
    item: item,
    newBalance: getUser(userId).balance,
    quantity: getItemQuantity(userId, itemId)
  };
}

// 소비 아이템 사용
export function useItem(userId, itemId) {
  const item = getShopItemById(itemId);

  if (!item) {
    return { success: false, message: '존재하지 않는 아이템입니다.' };
  }

  if (!item.consumable) {
    return { success: false, message: '사용할 수 없는 아이템입니다.' };
  }

  if (!hasItem(userId, itemId)) {
    return { success: false, message: '보유하지 않은 아이템입니다.' };
  }

  // 수량 감소
  db.prepare('UPDATE user_inventory SET quantity = quantity - 1 WHERE user_id = ? AND item_id = ?').run(userId, itemId);

  // 수량이 0이면 삭제
  const remaining = getItemQuantity(userId, itemId);
  if (remaining <= 0) {
    db.prepare('DELETE FROM user_inventory WHERE user_id = ? AND item_id = ?').run(userId, itemId);
  }

  return {
    success: true,
    item: item,
    remainingQuantity: Math.max(0, remaining)
  };
}

// ==================== 버프 시스템 ====================

// 버프 타입 상수
export const BUFF_TYPES = {
  LUCKY_BEER: 'lucky_beer',      // 행운의 맥주 - 도박 승률 +10%
  DAILY_BOOST: 'daily_boost'     // 스튜 시리즈 - 출석 보상 배수 (기간제)
};

// 스튜 아이템 ID와 배수 매핑
export const STEW_MULTIPLIERS = {
  9: 1.25,  // 여관 특제 스튜
  10: 1.5,  // 여관 고급 스튜
  11: 2.0   // 여관 전설의 스튜
};

// 스튜 아이템 ID 배열 (효과가 강한 순서)
export const STEW_ITEM_IDS = [11, 10, 9];

// 유저 인벤토리에서 가장 강한 스튜 찾기
export function getBestStewFromInventory(userId) {
  for (const itemId of STEW_ITEM_IDS) {
    if (hasItem(userId, itemId)) {
      const item = getShopItemById(itemId);
      return {
        itemId,
        multiplier: STEW_MULTIPLIERS[itemId],
        item
      };
    }
  }
  return null;
}

// 버프 활성화 (일회성 버프용)
export function activateBuff(userId, buffType, itemId) {
  db.prepare('INSERT OR REPLACE INTO user_buffs (user_id, buff_type, item_id, multiplier, expires_at) VALUES (?, ?, ?, 1.0, NULL)').run(userId, buffType, itemId);
  return true;
}

// 기간제 버프 활성화 (스튜 등)
export function activateDurationBuff(userId, buffType, itemId, multiplier, durationDays) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + durationDays);
  const expiresAtStr = expiresAt.toISOString();

  // 기존 버프가 있으면 더 높은 배수로 갱신, 기간은 새로 시작
  const existing = db.prepare('SELECT * FROM user_buffs WHERE user_id = ? AND buff_type = ?').get(userId, buffType);

  if (existing && existing.multiplier >= multiplier) {
    // 기존 버프가 같거나 더 높으면 기간만 연장
    db.prepare('UPDATE user_buffs SET expires_at = ?, item_id = ? WHERE user_id = ? AND buff_type = ?')
      .run(expiresAtStr, itemId, userId, buffType);
  } else {
    // 새 버프가 더 높거나 기존 버프가 없으면 새로 설정
    db.prepare('INSERT OR REPLACE INTO user_buffs (user_id, buff_type, item_id, multiplier, expires_at) VALUES (?, ?, ?, ?, ?)')
      .run(userId, buffType, itemId, multiplier, expiresAtStr);
  }

  return { multiplier, expiresAt: expiresAtStr };
}

// 버프 보유 여부 확인 (만료 체크 포함)
export function hasBuff(userId, buffType) {
  const buff = db.prepare('SELECT * FROM user_buffs WHERE user_id = ? AND buff_type = ?').get(userId, buffType);
  if (!buff) return false;

  // 기간제 버프인 경우 만료 확인
  if (buff.expires_at) {
    const now = new Date();
    const expiresAt = new Date(buff.expires_at);
    if (now > expiresAt) {
      // 만료된 버프 삭제
      db.prepare('DELETE FROM user_buffs WHERE user_id = ? AND buff_type = ?').run(userId, buffType);
      return false;
    }
  }

  return true;
}

// 버프 정보 조회 (만료 체크 포함)
export function getBuff(userId, buffType) {
  const buff = db.prepare('SELECT * FROM user_buffs WHERE user_id = ? AND buff_type = ?').get(userId, buffType);
  if (!buff) return null;

  // 기간제 버프인 경우 만료 확인
  if (buff.expires_at) {
    const now = new Date();
    const expiresAt = new Date(buff.expires_at);
    if (now > expiresAt) {
      db.prepare('DELETE FROM user_buffs WHERE user_id = ? AND buff_type = ?').run(userId, buffType);
      return null;
    }

    // 남은 일수 계산
    const remainingDays = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
    return { ...buff, remainingDays };
  }

  return buff;
}

// 출석 보상 배수 조회
export function getDailyBoostMultiplier(userId) {
  const buff = getBuff(userId, BUFF_TYPES.DAILY_BOOST);
  return buff ? buff.multiplier : 1.0;
}

// 버프 소모 (일회성 버프용 - 사용 후 삭제)
export function consumeBuff(userId, buffType) {
  const buff = db.prepare('SELECT * FROM user_buffs WHERE user_id = ? AND buff_type = ?').get(userId, buffType);
  if (!buff) return null;

  // 기간제 버프는 소모하지 않음
  if (buff.expires_at) return buff;

  db.prepare('DELETE FROM user_buffs WHERE user_id = ? AND buff_type = ?').run(userId, buffType);
  return buff;
}

// 유저의 모든 활성 버프 조회 (만료된 것 제외)
export function getUserBuffs(userId) {
  const now = new Date().toISOString();

  // 만료된 버프 정리
  db.prepare('DELETE FROM user_buffs WHERE user_id = ? AND expires_at IS NOT NULL AND expires_at < ?').run(userId, now);

  const buffs = db.prepare(`
    SELECT ub.*, si.name, si.emoji
    FROM user_buffs ub
    JOIN shop_items si ON ub.item_id = si.id
    WHERE ub.user_id = ?
  `).all(userId);

  // 남은 일수 계산
  return buffs.map(buff => {
    if (buff.expires_at) {
      const expiresAt = new Date(buff.expires_at);
      const remainingDays = Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24));
      return { ...buff, remainingDays };
    }
    return buff;
  });
}

export default db;
