const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { ModAction } = require('../models');
const logger = require('../utils/logger');

// ─── Spam Tracking ───────────────────────────────────────────────────────────
const spamData = new Map(); // userId -> { messages: [], lastCleared: timestamp }
const duplicateData = new Map(); // userId -> { messages: [] }

// ─── Helper: Take Action ─────────────────────────────────────────────────────
async function takeAction(message, guildData, action, reason, duration) {
  const { member, guild } = message;
  const logChannelId = guildData.automod?.logChannelId;

  // Delete the triggering message
  message.delete().catch(() => {});

  // DM the user
  if (guildData.moderation?.dmOnPunish) {
    member.send(`⚠️ **[${guild.name}]** You were automatically ${action}d for: ${reason}`).catch(() => {});
  }

  const me = guild.members.me;

  switch (action) {
    case 'warn':
      // Just log it
      break;
    case 'mute':
      if (me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        const muteDuration = (duration || guildData.automod?.antiSpam?.muteDuration || 10) * 60 * 1000;
        await member.timeout(muteDuration, reason).catch(() => {});
      }
      break;
    case 'kick':
      if (me.permissions.has(PermissionFlagsBits.KickMembers)) {
        await member.kick(reason).catch(() => {});
      }
      break;
    case 'ban':
      if (me.permissions.has(PermissionFlagsBits.BanMembers)) {
        await guild.members.ban(member.id, { reason }).catch(() => {});
      }
      break;
  }

  // Log to automod channel
  if (logChannelId) {
    const logChannel = guild.channels.cache.get(logChannelId);
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setColor('#f04747')
        .setTitle(`🤖 AutoMod — ${action.toUpperCase()}`)
        .addFields(
          { name: 'User', value: `${member.user.tag} (${member.user.id})`, inline: true },
          { name: 'Action', value: action.toUpperCase(), inline: true },
          { name: 'Reason', value: reason, inline: false }
        )
        .setTimestamp();
      logChannel.send({ embeds: [embed] }).catch(() => {});
    }
  }

  return true;
}

// ─── Check bypass ─────────────────────────────────────────────────────────────
function shouldBypass(message, guildData) {
  if (!message.member) return true;
  if (message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return true;
  const { automod } = guildData;
  if (!automod) return false;

  // Check ignored channels
  if (automod.ignoredChannels?.includes(message.channel.id)) return true;

  // Check bypass roles
  const memberRoles = message.member.roles.cache.map(r => r.id);
  if (automod.bypassRoles?.some(r => memberRoles.includes(r))) return true;
  if (automod.ignoredRoles?.some(r => memberRoles.includes(r))) return true;

  return false;
}

// ─── Anti-Spam ────────────────────────────────────────────────────────────────
async function checkSpam(message, guildData) {
  const { antiSpam } = guildData.automod;
  if (!antiSpam?.enabled) return false;

  const key = `${message.guild.id}:${message.author.id}`;
  const now = Date.now();
  const timeWindow = antiSpam.timeWindow || 5000;
  const threshold = antiSpam.threshold || 5;

  if (!spamData.has(key)) {
    spamData.set(key, { timestamps: [] });
  }

  const data = spamData.get(key);
  data.timestamps = data.timestamps.filter(t => now - t < timeWindow);
  data.timestamps.push(now);

  if (data.timestamps.length >= threshold) {
    spamData.delete(key);
    return takeAction(message, guildData, antiSpam.action || 'mute', 'Spam detection', antiSpam.muteDuration);
  }
  return false;
}

// ─── Anti Mass Mention ────────────────────────────────────────────────────────
async function checkMassMention(message, guildData) {
  const { antiMassMention } = guildData.automod;
  if (!antiMassMention?.enabled) return false;

  const mentionCount = message.mentions.users.size + message.mentions.roles.size;
  if (mentionCount >= (antiMassMention.threshold || 5)) {
    return takeAction(message, guildData, antiMassMention.action || 'mute', `Mass mention (${mentionCount} mentions)`);
  }
  return false;
}

// ─── Bad Words ────────────────────────────────────────────────────────────────
async function checkBadWords(message, guildData) {
  const { badWords } = guildData.automod;
  if (!badWords?.enabled || !badWords.words?.length) return false;

  const content = message.content.toLowerCase();
  const found = badWords.words.find(w => content.includes(w.toLowerCase()));

  if (found) {
    return takeAction(message, guildData, badWords.action || 'delete', `Bad word detected`);
  }
  return false;
}

// ─── Anti Links ───────────────────────────────────────────────────────────────
async function checkLinks(message, guildData) {
  const { antiLinks } = guildData.automod;
  if (!antiLinks?.enabled) return false;

  const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi;
  const links = message.content.match(urlRegex);
  if (!links) return false;

  const whitelisted = antiLinks.whitelistedDomains || [];
  const hasBlockedLink = links.some(link => {
    const domain = new URL(link).hostname.replace('www.', '');
    return !whitelisted.includes(domain);
  });

  if (hasBlockedLink) {
    return takeAction(message, guildData, antiLinks.action || 'delete', 'Unauthorized link detected');
  }
  return false;
}

// ─── Anti Invites ─────────────────────────────────────────────────────────────
async function checkInvites(message, guildData) {
  const { antiInvites } = guildData.automod;
  if (!antiInvites?.enabled) return false;

  const inviteRegex = /(discord\.gg|discord\.com\/invite)\/[a-zA-Z0-9-]+/i;
  if (inviteRegex.test(message.content)) {
    return takeAction(message, guildData, antiInvites.action || 'delete', 'Discord invite link detected');
  }
  return false;
}

// ─── Anti Caps ────────────────────────────────────────────────────────────────
async function checkCaps(message, guildData) {
  const { antiCaps } = guildData.automod;
  if (!antiCaps?.enabled) return false;
  if (message.content.length < (antiCaps.minLength || 10)) return false;

  const letters = message.content.replace(/[^a-zA-Z]/g, '');
  if (letters.length === 0) return false;

  const upperCount = letters.replace(/[^A-Z]/g, '').length;
  const capsPercent = (upperCount / letters.length) * 100;

  if (capsPercent >= (antiCaps.threshold || 70)) {
    return takeAction(message, guildData, antiCaps.action || 'delete', `Excessive caps (${Math.floor(capsPercent)}%)`);
  }
  return false;
}

// ─── Anti Duplicate ───────────────────────────────────────────────────────────
async function checkDuplicate(message, guildData) {
  const { antiDuplicate } = guildData.automod;
  if (!antiDuplicate?.enabled) return false;

  const key = `${message.guild.id}:${message.author.id}`;
  const content = message.content.trim().toLowerCase();

  if (!duplicateData.has(key)) {
    duplicateData.set(key, []);
  }

  const msgs = duplicateData.get(key);
  msgs.push(content);
  if (msgs.length > 10) msgs.shift();

  const count = msgs.filter(m => m === content).length;
  if (count >= (antiDuplicate.threshold || 3)) {
    duplicateData.set(key, []);
    return takeAction(message, guildData, antiDuplicate.action || 'mute', 'Duplicate message spam');
  }
  return false;
}

// ─── Main AutoMod Runner ──────────────────────────────────────────────────────
async function runAutomod(message, guildData, client) {
  if (shouldBypass(message, guildData)) return false;

  try {
    // Run all checks in priority order
    if (await checkSpam(message, guildData)) return true;
    if (await checkMassMention(message, guildData)) return true;
    if (await checkInvites(message, guildData)) return true;
    if (await checkLinks(message, guildData)) return true;
    if (await checkBadWords(message, guildData)) return true;
    if (await checkCaps(message, guildData)) return true;
    if (await checkDuplicate(message, guildData)) return true;
  } catch (err) {
    logger.error('Automod error:', err.message);
  }

  return false;
}

module.exports = { runAutomod };
