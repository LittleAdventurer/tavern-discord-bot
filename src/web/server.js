import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function createWebServer(discordClient) {
  const app = express();

  // 프록시 신뢰 설정 (Cloudflare Tunnel 사용 시 필요)
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  // Session 설정
  app.use(session({
    secret: process.env.SESSION_SECRET || 'tavern-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 7 // 7일
    }
  }));

  // Passport 초기화
  app.use(passport.initialize());
  app.use(passport.session());

  // Discord OAuth2 Strategy
  passport.use(new DiscordStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.DASHBOARD_URL + '/auth/discord/callback',
    scope: ['identify']
  }, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
  }));

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((obj, done) => {
    done(null, obj);
  });

  // 정적 파일 제공
  app.use(express.static(join(__dirname, 'public')));
  app.use(express.json());

  // Discord 클라이언트를 req에 추가
  app.use((req, res, next) => {
    req.discordClient = discordClient;
    next();
  });

  // 라우트 임포트
  const authRoutes = await import('./routes/auth.js');
  const apiRoutes = await import('./routes/api.js');

  app.use('/auth', authRoutes.default);
  app.use('/api', apiRoutes.default);

  // 메인 페이지
  app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
  });

  // 글로벌 에러 핸들러
  app.use((err, req, res, next) => {
    console.error('[Web] 서버 오류:', err);
    res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  });

  return app;
}

export async function startWebServer(discordClient) {
  const app = await createWebServer(discordClient);
  const PORT = process.env.DASHBOARD_PORT || 3000;

  app.listen(PORT, () => {
    console.log(`[Web] 대시보드 서버 시작: http://localhost:${PORT}`);
  });

  return app;
}
