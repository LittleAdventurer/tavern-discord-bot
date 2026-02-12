import { Router } from 'express';
import passport from 'passport';

const router = Router();

// Discord OAuth2 로그인 시작
router.get('/discord', passport.authenticate('discord'));

// Discord OAuth2 콜백
router.get('/discord/callback', (req, res, next) => {
  passport.authenticate('discord', (err, user, info) => {
    if (err) {
      console.error('[Auth] OAuth2 콜백 오류:', err);
      return res.redirect('/?error=server_error');
    }
    if (!user) {
      return res.redirect('/?error=login_failed');
    }
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        console.error('[Auth] 세션 저장 오류:', loginErr);
        return res.redirect('/?error=server_error');
      }
      return res.redirect('/');
    });
  })(req, res, next);
});

// 로그아웃
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('[Auth] 로그아웃 오류:', err);
    }
    res.redirect('/');
  });
});

// 현재 로그인 상태 확인
router.get('/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      authenticated: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        discriminator: req.user.discriminator,
        avatar: req.user.avatar,
        avatarURL: req.user.avatar
          ? `https://cdn.discordapp.com/avatars/${req.user.id}/${req.user.avatar}.png`
          : `https://cdn.discordapp.com/embed/avatars/${parseInt(req.user.discriminator) % 5}.png`
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

export default router;
