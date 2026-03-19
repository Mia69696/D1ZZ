const { ActivityType } = require('discord.js');
const logger = require('../utils/logger');
const { startVoiceXpTracker } = require('../modules/leveling');
const { startPunishmentChecker } = require('../modules/moderation');
const { startReminderChecker } = require('../modules/reminders');
const { startStatsUpdater } = require('../modules/statsChannels');

module.exports = {
  name: 'ready', once: true,
  async execute(client) {
    logger.info(`✅ Logged in as ${client.user.tag}`);
    logger.info(`📊 Serving ${client.guilds.cache.size} guilds`);
    const activities = [
      { name: '/help | d1z', type: ActivityType.Watching },
      { name: `${client.guilds.cache.size} servers`, type: ActivityType.Watching },
      { name: 'your server 🛡️', type: ActivityType.Watching },
    ];
    let i = 0;
    const update = () => { client.user.setPresence({ activities: [activities[i++ % activities.length]], status: 'online' }); };
    update(); setInterval(update, 30000);
    startVoiceXpTracker(client);
    startPunishmentChecker(client);
    startReminderChecker(client);
    startStatsUpdater(client);
  },
};
