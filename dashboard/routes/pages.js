const router = require('express').Router();
const path = require('path');

module.exports = (isAuthenticated) => {
  // Landing page
  router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });

  // Login page
  router.get('/login', (req, res) => {
    if (req.isAuthenticated()) return res.redirect('/dashboard');
    res.sendFile(path.join(__dirname, '../public/login.html'));
  });

  // Dashboard home (guild selector)
  router.get('/dashboard', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/dashboard.html'));
  });

  // Guild dashboard pages
  router.get('/dashboard/:guildId', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/guild.html'));
  });

  router.get('/dashboard/:guildId/:module', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/guild.html'));
  });

  return router;
};
