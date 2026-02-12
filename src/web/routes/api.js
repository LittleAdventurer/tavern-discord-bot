import { Router } from 'express';
import db, { getUser, getRanking, getMemesByName, getMeme } from '../../database/db.js';

const router = Router();

// 인증 미들웨어
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: '로그인이 필요합니다.' });
}

// 내 정보 조회
router.get('/me/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = getUser(userId);

    // Discord에서 사용자 정보 가져오기
    let discordUser = null;
    try {
      discordUser = await req.discordClient.users.fetch(userId);
    } catch (e) {
      // Discord에서 사용자를 찾지 못해도 계속 진행
    }

    res.json({
      user_id: user.user_id,
      balance: user.balance,
      chat_count: user.chat_count,
      voice_time: user.voice_time,
      daily_check: user.daily_check,
      discord: discordUser ? {
        username: discordUser.username,
        displayName: discordUser.displayName,
        avatar: discordUser.displayAvatarURL()
      } : null
    });
  } catch (error) {
    console.error('[API] 내 정보 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 채팅 랭킹 조회
router.get('/ranking/chat', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const ranking = getRanking('chat', limit);

    // Discord 사용자 정보 추가
    const enrichedRanking = await Promise.all(
      ranking.map(async (entry, index) => {
        let discordUser = null;
        try {
          discordUser = await req.discordClient.users.fetch(entry.user_id);
        } catch (e) {
          // 사용자를 찾지 못하면 null 유지
        }
        return {
          rank: index + 1,
          user_id: entry.user_id,
          value: entry.value,
          discord: discordUser ? {
            username: discordUser.username,
            displayName: discordUser.displayName,
            avatar: discordUser.displayAvatarURL({ size: 64 })
          } : null
        };
      })
    );

    res.json(enrichedRanking);
  } catch (error) {
    console.error('[API] 채팅 랭킹 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 음성 랭킹 조회
router.get('/ranking/voice', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const ranking = getRanking('voice', limit);

    // Discord 사용자 정보 추가
    const enrichedRanking = await Promise.all(
      ranking.map(async (entry, index) => {
        let discordUser = null;
        try {
          discordUser = await req.discordClient.users.fetch(entry.user_id);
        } catch (e) {
          // 사용자를 찾지 못하면 null 유지
        }
        return {
          rank: index + 1,
          user_id: entry.user_id,
          value: entry.value,
          discord: discordUser ? {
            username: discordUser.username,
            displayName: discordUser.displayName,
            avatar: discordUser.displayAvatarURL({ size: 64 })
          } : null
        };
      })
    );

    res.json(enrichedRanking);
  } catch (error) {
    console.error('[API] 음성 랭킹 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 봇 상태 조회
router.get('/bot/status', (req, res) => {
  try {
    const client = req.discordClient;
    res.json({
      status: 'online',
      ping: client.ws.ping,
      guilds: client.guilds.cache.size,
      users: client.users.cache.size,
      uptime: client.uptime
    });
  } catch (error) {
    console.error('[API] 봇 상태 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 내가 저장한 콘텐츠 조회
router.get('/me/memes', requireAuth, (req, res) => {
  try {
    const userId = req.user.id;
    const memes = db.prepare('SELECT * FROM memes WHERE created_by = ? ORDER BY created_at DESC LIMIT 50').all(userId);
    res.json(memes);
  } catch (error) {
    console.error('[API] 내 콘텐츠 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 서버 통계 (관리자용 - 선택적)
router.get('/stats/overview', (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const totalMemes = db.prepare('SELECT COUNT(*) as count FROM memes').get().count;
    const totalBalance = db.prepare('SELECT SUM(balance) as sum FROM users').get().sum || 0;
    const totalChatCount = db.prepare('SELECT SUM(chat_count) as sum FROM users').get().sum || 0;
    const totalVoiceTime = db.prepare('SELECT SUM(voice_time) as sum FROM users').get().sum || 0;

    res.json({
      totalUsers,
      totalMemes,
      totalBalance,
      totalChatCount,
      totalVoiceTime
    });
  } catch (error) {
    console.error('[API] 통계 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

export default router;
