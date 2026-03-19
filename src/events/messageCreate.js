const { Guild } = require('../models');
const { processXp } = require('../modules/leveling');
const { runAutomod } = require('../modules/automod');
const logger = require('../utils/logger');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot) return;
    if (!message.guild) return;

    try {
      const guildData = await Guild.findOne({ guildId: message.guild.id }) ||
        await Guild.create({ guildId: message.guild.id });

      // ─── Auto-Moderation ──────────────────────────────────────────────
      if (guildData.automod?.enabled) {
        const blocked = await runAutomod(message, guildData, client);
        if (blocked) return; // Message was handled by automod
      }

      // ─── XP / Leveling ────────────────────────────────────────────────
      if (guildData.leveling?.enabled) {
        await processXp(message, guildData, client);
      }

    } catch (err) {
      logger.error('messageCreate error:', err.message);
    }
  },
};
