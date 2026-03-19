const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { Guild } = require('../models');
const logger = require('../utils/logger');

// Track recent joins per guild
const joinTracker = new Map(); // guildId -> [{ memberId, timestamp }]

async function checkAntiRaid(member, guildData, client) {
  const { antiRaid } = guildData;
  if (!antiRaid?.enabled) return;

  const guildId = member.guild.id;
  const now = Date.now();
  const timeWindow = antiRaid.joinTimeWindow || 10000;
  const threshold = antiRaid.joinThreshold || 10;

  if (!joinTracker.has(guildId)) joinTracker.set(guildId, []);
  const joins = joinTracker.get(guildId);

  // Add this join
  joins.push({ memberId: member.id, timestamp: now });

  // Clean old entries
  const recent = joins.filter(j => now - j.timestamp < timeWindow);
  joinTracker.set(guildId, recent);

  if (recent.length >= threshold) {
    logger.warn(`🚨 ANTI-RAID triggered in ${member.guild.name} — ${recent.length} joins in ${timeWindow / 1000}s`);
    joinTracker.set(guildId, []); // Reset

    // Alert channel
    if (antiRaid.alertChannelId) {
      const alertChannel = member.guild.channels.cache.get(antiRaid.alertChannelId);
      if (alertChannel) {
        const embed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('🚨 RAID DETECTED')
          .setDescription(`**${recent.length}** accounts joined in the last **${timeWindow / 1000} seconds!**`)
          .addFields({ name: 'Action Taken', value: antiRaid.action?.toUpperCase() || 'LOCKDOWN', inline: true })
          .setTimestamp();
        alertChannel.send({ embeds: [embed] }).catch(() => {});
      }
    }

    // Execute action
    switch (antiRaid.action) {
      case 'lockdown':
        await lockdownServer(member.guild, antiRaid.lockdownChannels);
        break;
      case 'ban':
        for (const join of recent) {
          member.guild.members.ban(join.memberId, { reason: 'Anti-Raid: Mass join detected' }).catch(() => {});
        }
        break;
      case 'kick':
        for (const join of recent) {
          const m = member.guild.members.cache.get(join.memberId);
          if (m) m.kick('Anti-Raid: Mass join detected').catch(() => {});
        }
        break;
    }
  }
}

async function lockdownServer(guild, channelIds) {
  const me = guild.members.me;
  if (!me.permissions.has(PermissionFlagsBits.ManageChannels)) return;

  const channels = channelIds?.length
    ? channelIds.map(id => guild.channels.cache.get(id)).filter(Boolean)
    : guild.channels.cache.filter(c => c.type === 0).first(10);

  for (const channel of (Array.isArray(channels) ? channels : [...channels.values()])) {
    channel.permissionOverwrites.edit(guild.roles.everyone, {
      SendMessages: false,
    }, { reason: 'Anti-Raid Lockdown' }).catch(() => {});
  }
}

module.exports = { checkAntiRaid };
