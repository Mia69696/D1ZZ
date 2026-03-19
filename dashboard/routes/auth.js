const router = require('express').Router();
const passport = require('passport');

router.get('/login', passport.authenticate('discord'));

router.get('/callback',
  passport.authenticate('discord', { failureRedirect: '/login?error=1' }),
  (req, res) => {
    res.redirect('/dashboard');
  }
);

router.get('/logout', (req, res) => {
  req.logout(() => res.redirect('/'));
});

module.exports = router;
