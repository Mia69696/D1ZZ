const { Guild } = require('../models');
const logger = require('../utils/logger');

async function startStatsUpdater(client) {
  const update = async () => {
    for (const [guildId, guild] of client.guilds.cache) {
      try {
        const guildData = Guild.findOne({ guildId });
        if (!guildData?.statsChannels?.enabled) continue;
        const { statsChannels } = guildData;
        const bots = guild.members.cache.filter(m => m.user.bot).size;
        const humans = guild.memberCount - bots;
        if (statsChannels.memberCountChannelId) {
          const ch = guild.channels.cache.get(statsChannels.memberCountChannelId);
          if (ch) ch.setName(`👥 Members: ${humans}`).catch(() => {});
        }
        if (statsChannels.botCountChannelId) {
          const ch = guild.channels.cache.get(statsChannels.botCountChannelId);
          if (ch) ch.setName(`🤖 Bots: ${bots}`).catch(() => {});
        }
      } catch (err) {
        logger.error(`Stats channel error (${guildId}):`, err.message);
      }
    }
  };
  setInterval(update, 10 * 60 * 1000);
  setTimeout(update, 5000);
}

module.exports = { startStatsUpdater };
