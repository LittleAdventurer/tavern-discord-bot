import { Router } from 'express';
import passport from 'passport';

const router = Router();

// Discord OAuth2 로그인 시작
router.get('/discord', passport.authenticate('discord'));

// Discord OAuth2 콜백
router.get('/discord/callback',
  passport.authenticate('discord', {
    failureRedirect: '/?error=login_failed'
  }),
  (req, res) => {
    res.redirect('/');
  }
);

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
