const { EmbedBuilder } = require('discord.js');
const { Guild, GuildStats } = require('../models');
const { sendWelcomeImage } = require('../modules/welcome');
const { checkAntiRaid } = require('../modules/antiRaid');
const logger = require('../utils/logger');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    try {
      const guildData = await Guild.findOne({ guildId: member.guild.id }) ||
        await Guild.create({ guildId: member.guild.id });

      // Anti-Raid check
      if (guildData.antiRaid?.enabled) {
        await checkAntiRaid(member, guildData, client);
      }

      // Welcome message
      if (guildData.welcome?.enabled && guildData.welcome.channelId) {
        const channel = member.guild.channels.cache.get(guildData.welcome.channelId);
        if (channel) {
          await sendWelcomeImage(member, channel, guildData.welcome, member.guild.memberCount);
        }
      }

      // Logging
      if (guildData.logging?.enabled && guildData.logging.events.memberJoin && guildData.logging.channelId) {
        const logChannel = member.guild.channels.cache.get(guildData.logging.channelId);
        if (logChannel) {
          const embed = new EmbedBuilder()
            .setColor('#43b581')
            .setTitle('📥 Member Joined')
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .addFields(
              { name: 'User', value: `${member.user.tag} (${member.user.id})`, inline: true },
              { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
              { name: 'Member Count', value: `${member.guild.memberCount}`, inline: true }
            )
            .setTimestamp();
          logChannel.send({ embeds: [embed] }).catch(() => {});
        }
      }

      // Update daily stats
      const today = new Date(); today.setHours(0, 0, 0, 0);
      await GuildStats.findOneAndUpdate(
        { guildId: member.guild.id, date: today },
        { $inc: { newMembers: 1 }, $set: { memberCount: member.guild.memberCount } },
        { upsert: true }
      );

    } catch (err) {
      logger.error('guildMemberAdd error:', err.message);
    }
  },
};
