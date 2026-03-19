const { EmbedBuilder } = require('discord.js');
const { Guild, GuildStats } = require('../models');
const logger = require('../utils/logger');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member, client) {
    try {
      const guildData = await Guild.findOne({ guildId: member.guild.id });
      if (!guildData) return;

      // Goodbye message
      if (guildData.goodbye?.enabled && guildData.goodbye.channelId) {
        const channel = member.guild.channels.cache.get(guildData.goodbye.channelId);
        if (channel) {
          const msg = guildData.goodbye.message
            .replace('{user}', member.user.tag)
            .replace('{server}', member.guild.name);
          channel.send(msg).catch(() => {});
        }
      }

      // Logging
      if (guildData.logging?.enabled && guildData.logging.events.memberLeave && guildData.logging.channelId) {
        const logChannel = member.guild.channels.cache.get(guildData.logging.channelId);
        if (logChannel) {
          const embed = new EmbedBuilder()
            .setColor('#f04747')
            .setTitle('📤 Member Left')
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .addFields(
              { name: 'User', value: `${member.user.tag} (${member.user.id})`, inline: true },
              { name: 'Joined', value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true },
              { name: 'Roles', value: member.roles.cache.filter(r => r.id !== member.guild.id).map(r => r.name).join(', ') || 'None' }
            )
            .setTimestamp();
          logChannel.send({ embeds: [embed] }).catch(() => {});
        }
      }

      // Stats
      const today = new Date(); today.setHours(0, 0, 0, 0);
      GuildStats.findOneAndUpdate(
        { guildId: member.guild.id, date: today.toISOString() },
        { $inc: { leftMembers: 1 }, $set: { memberCount: member.guild.memberCount } },
        { upsert: true }
      );

    } catch (err) {
      logger.error('guildMemberRemove error:', err.message);
    }
  },
};
