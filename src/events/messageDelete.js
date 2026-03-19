const { EmbedBuilder } = require('discord.js');
const { Guild } = require('../models');
const logger = require('../utils/logger');

module.exports = {
  name: 'messageDelete',
  async execute(message, client) {
    if (!message.guild || message.author?.bot) return;
    try {
      const guildData = await Guild.findOne({ guildId: message.guild.id });
      if (!guildData?.logging?.enabled || !guildData.logging.events.messageDelete || !guildData.logging.channelId) return;

      const logChannel = message.guild.channels.cache.get(guildData.logging.channelId);
      if (!logChannel) return;

      const embed = new EmbedBuilder()
        .setColor('#faa61a')
        .setTitle('🗑️ Message Deleted')
        .addFields(
          { name: 'Author', value: message.author ? `${message.author.tag} (${message.author.id})` : 'Unknown', inline: true },
          { name: 'Channel', value: `${message.channel}`, inline: true },
          { name: 'Content', value: message.content?.slice(0, 1024) || '*Empty / attachment*', inline: false }
        )
        .setTimestamp();

      logChannel.send({ embeds: [embed] }).catch(() => {});
    } catch (err) {
      logger.error('messageDelete log error:', err.message);
    }
  },
};
