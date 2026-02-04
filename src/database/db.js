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
`);

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
export function checkDaily(userId) {
  const user = getUser(userId);
  const today = new Date().toISOString().split('T')[0];

  if (user.daily_check === today) {
    return { success: false, message: '오늘 이미 출석체크를 했습니다!' };
  }

  db.prepare('UPDATE users SET daily_check = ?, balance = balance + 5000 WHERE user_id = ?').run(today, userId);
  return { success: true, newBalance: getUser(userId).balance };
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

export default db;
