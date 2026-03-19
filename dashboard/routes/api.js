const router = require('express').Router();
const { Guild, UserLevel, ModAction, GuildStats } = require('../../src/models');
const axios = require('axios');

const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Unauthorized' });
};

// Get user guilds where they are admin
router.get('/guilds', isAuthenticated, async (req, res) => {
  try {
    const response = await axios.get('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${req.user.accessToken}` }
    });
    const guilds = response.data.filter(g => (parseInt(g.permissions) & 0x20) === 0x20 || (parseInt(g.permissions) & 0x8) === 0x8);
    res.json(guilds);
  } catch {
    // Return empty if token expired
    res.json([]);
  }
});

// Get guild settings
router.get('/guild/:guildId', isAuthenticated, async (req, res) => {
  try {
    let guild = await Guild.findOne({ guildId: req.params.guildId });
    if (!guild) guild = await Guild.create({ guildId: req.params.guildId });
    res.json(guild);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update guild settings (full or partial)
router.patch('/guild/:guildId', isAuthenticated, async (req, res) => {
  try {
    const guild = await Guild.findOneAndUpdate(
      { guildId: req.params.guildId },
      { $set: { ...req.body, updatedAt: new Date() } },
      { new: true, upsert: true }
    );
    if (global.io) global.io.to(`guild-${req.params.guildId}`).emit('settings-updated', req.body);
    res.json({ success: true, guild });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get leaderboard for a guild
router.get('/guild/:guildId/leaderboard', isAuthenticated, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const data = await UserLevel.find({ guildId: req.params.guildId })
      .sort({ totalXp: -1 }).skip((page - 1) * limit).limit(limit).lean();
    const total = await UserLevel.countDocuments({ guildId: req.params.guildId });
    res.json({ data, total, page });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get mod actions for a guild
router.get('/guild/:guildId/modactions', isAuthenticated, async (req, res) => {
  try {
    const actions = await ModAction.find({ guildId: req.params.guildId })
      .sort({ createdAt: -1 }).limit(50).lean();
    res.json(actions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get guild statistics (last 30 days)
router.get('/guild/:guildId/stats', isAuthenticated, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const stats = await GuildStats.find({
      guildId: req.params.guildId,
      date: { $gte: thirtyDaysAgo }
    }).sort({ date: 1 }).lean();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add reaction role
router.post('/guild/:guildId/reactionroles', isAuthenticated, async (req, res) => {
  try {
    const guild = await Guild.findOneAndUpdate(
      { guildId: req.params.guildId },
      { $push: { reactionRoles: req.body } },
      { new: true, upsert: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete reaction role
router.delete('/guild/:guildId/reactionroles/:index', isAuthenticated, async (req, res) => {
  try {
    const guild = await Guild.findOne({ guildId: req.params.guildId });
    if (!guild) return res.status(404).json({ error: 'Guild not found' });
    guild.reactionRoles.splice(parseInt(req.params.index), 1);
    await guild.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user info
router.get('/me', isAuthenticated, (req, res) => res.json(req.user));

module.exports = router;
