const { EmbedBuilder } = require('discord.js');
const { Guild } = require('../models');
const { handleVoiceState } = require('../modules/leveling');
const logger = require('../utils/logger');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState, client) {
    try {
      const guildData = await Guild.findOne({ guildId: oldState.guild.id });
      if (!guildData) return;

      // Logging
      if (guildData.logging?.enabled && guildData.logging.channelId) {
        const logChannel = oldState.guild.channels.cache.get(guildData.logging.channelId);
        if (logChannel) {
          let embed = null;
          if (!oldState.channel && newState.channel && guildData.logging.events.voiceJoin) {
            embed = new EmbedBuilder()
              .setColor('#43b581')
              .setTitle('🎙️ Voice Channel Joined')
              .addFields(
                { name: 'Member', value: `${newState.member.user.tag}`, inline: true },
                { name: 'Channel', value: newState.channel.name, inline: true }
              ).setTimestamp();
          } else if (oldState.channel && !newState.channel && guildData.logging.events.voiceLeave) {
            embed = new EmbedBuilder()
              .setColor('#f04747')
              .setTitle('🔇 Voice Channel Left')
              .addFields(
                { name: 'Member', value: `${oldState.member.user.tag}`, inline: true },
                { name: 'Channel', value: oldState.channel.name, inline: true }
              ).setTimestamp();
          }
          if (embed) logChannel.send({ embeds: [embed] }).catch(() => {});
        }
      }

      // Voice XP tracking
      if (guildData.leveling?.enabled) {
        await handleVoiceState(oldState, newState, guildData);
      }

    } catch (err) {
      logger.error('voiceStateUpdate error:', err.message);
    }
  },
};
