const { EmbedBuilder } = require('discord.js');
const { Guild } = require('../models');
const logger = require('../utils/logger');

module.exports = {
  name: 'messageUpdate',
  async execute(oldMessage, newMessage, client) {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;
    try {
      const guildData = await Guild.findOne({ guildId: newMessage.guild.id });
      if (!guildData?.logging?.enabled || !guildData.logging.events.messageEdit || !guildData.logging.channelId) return;

      const logChannel = newMessage.guild.channels.cache.get(guildData.logging.channelId);
      if (!logChannel) return;

      const embed = new EmbedBuilder()
        .setColor('#7289da')
        .setTitle('✏️ Message Edited')
        .setURL(newMessage.url)
        .addFields(
          { name: 'Author', value: `${newMessage.author.tag} (${newMessage.author.id})`, inline: true },
          { name: 'Channel', value: `${newMessage.channel}`, inline: true },
          { name: 'Before', value: oldMessage.content?.slice(0, 512) || '*Unknown*', inline: false },
          { name: 'After', value: newMessage.content?.slice(0, 512) || '*Empty*', inline: false }
        )
        .setTimestamp();

      logChannel.send({ embeds: [embed] }).catch(() => {});
    } catch (err) {
      logger.error('messageUpdate log error:', err.message);
    }
  },
};
