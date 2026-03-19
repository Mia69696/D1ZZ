const { EmbedBuilder } = require('discord.js');
const { UserLevel, Guild } = require('../models');
const logger = require('../utils/logger');

function getXpForLevel(level) {
  return Math.floor(100 * Math.pow(1.5, level));
}

function getLevelFromXp(totalXp) {
  let level = 0;
  let accumulated = 0;
  while (true) {
    const needed = getXpForLevel(level);
    if (accumulated + needed > totalXp) break;
    accumulated += needed;
    level++;
  }
  return level;
}

function getProgressToNextLevel(totalXp) {
  let level = 0;
  let accumulated = 0;
  while (true) {
    const needed = getXpForLevel(level);
    if (accumulated + needed > totalXp) {
      return {
        currentXp: totalXp - accumulated,
        neededXp: needed,
        percentage: Math.floor(((totalXp - accumulated) / needed) * 100),
      };
    }
    accumulated += needed;
    level++;
  }
}

async function processXp(message, guildData, client) {
  try {
    const { leveling } = guildData;
    if (!leveling?.enabled) return;
    if (leveling.ignoredChannels?.includes(message.channel.id)) return;
    const memberRoles = message.member.roles.cache.map(r => r.id);
    if (leveling.noXpRoles?.some(r => memberRoles.includes(r))) return;

    let userData = UserLevel.findOne({ userId: message.author.id, guildId: message.guild.id });
    if (!userData) {
      userData = UserLevel.create({ userId: message.author.id, guildId: message.guild.id });
    }

    const now = Date.now();
    const cooldown = (leveling.xpCooldown || 60) * 1000;
    if (userData.lastXpGain && (now - new Date(userData.lastXpGain).getTime()) < cooldown) return;

    const xpGain = leveling.xpPerMessage || 15;
    const oldLevel = userData.level;

    userData.xp = (userData.xp || 0) + xpGain;
    userData.totalXp = (userData.totalXp || 0) + xpGain;
    userData.messageCount = (userData.messageCount || 0) + 1;
    userData.lastXpGain = new Date().toISOString();
    userData.level = getLevelFromXp(userData.totalXp);
    userData.updatedAt = new Date().toISOString();

    UserLevel.updateOne(
      { userId: message.author.id, guildId: message.guild.id },
      { $set: userData },
      { upsert: true }
    );

    if (userData.level > oldLevel) {
      await handleLevelUp(message.member, userData, guildData, client);
    }
  } catch (err) {
    logger.error('processXp error:', err.message);
  }
}

async function handleLevelUp(member, userData, guildData, client) {
  const { leveling } = guildData;
  if (leveling.levelUpMessage) {
    const channel = leveling.levelUpChannelId
      ? member.guild.channels.cache.get(leveling.levelUpChannelId)
      : member.guild.systemChannel;
    if (channel) {
      const text = (leveling.levelUpText || 'Congrats {user}, you reached level {level}! 🎉')
        .replace('{user}', member.toString())
        .replace('{level}', userData.level)
        .replace('{tag}', member.user.tag);
      channel.send(text).catch(() => {});
    }
  }

  if (leveling.roleRewards?.length > 0) {
    const rewards = leveling.roleRewards.filter(r => r.level <= userData.level);
    for (const reward of rewards) {
      const role = member.guild.roles.cache.get(reward.roleId);
      if (role && !member.roles.cache.has(reward.roleId)) {
        member.roles.add(role).catch(() => {});
      }
    }
  }
}

const voiceJoinTimes = new Map();

async function handleVoiceState(oldState, newState, guildData) {
  const userId = newState.id || oldState.id;
  const guildId = (newState.guild || oldState.guild).id;
  const key = `${guildId}:${userId}`;

  if (!oldState.channel && newState.channel) {
    voiceJoinTimes.set(key, Date.now());
  } else if (oldState.channel && !newState.channel) {
    const joinTime = voiceJoinTimes.get(key);
    if (!joinTime) return;
    const minutesInVoice = Math.floor((Date.now() - joinTime) / 60000);
    voiceJoinTimes.delete(key);
    if (minutesInVoice < 1) return;
    const xpGain = (guildData.leveling?.voiceXpPerMinute || 5) * minutesInVoice;
    const existing = UserLevel.findOne({ userId, guildId });
    if (existing) {
      const newTotalXp = (existing.totalXp || 0) + xpGain;
      UserLevel.updateOne({ userId, guildId }, { $set: { voiceXp: (existing.voiceXp || 0) + xpGain, totalXp: newTotalXp, level: getLevelFromXp(newTotalXp) } });
    }
  }
}

function startVoiceXpTracker(client) {
  setInterval(async () => {
    for (const [guildId, guild] of client.guilds.cache) {
      try {
        const guildData = Guild.findOne({ guildId });
        if (!guildData?.leveling?.enabled) continue;
        for (const [, channel] of guild.channels.cache) {
          if (channel.type !== 2) continue;
          for (const [memberId, member] of channel.members) {
            if (member.user.bot) continue;
            const key = `${guildId}:${memberId}`;
            if (!voiceJoinTimes.has(key)) voiceJoinTimes.set(key, Date.now());
          }
        }
      } catch {}
    }
  }, 5 * 60 * 1000);
}

async function getUserRank(userId, guildId) {
  const userData = UserLevel.findOne({ userId, guildId });
  if (!userData) return null;
  const allUsers = UserLevel.find({ guildId }, { sort: { totalXp: -1 } });
  const rank = allUsers.findIndex(u => u.userId === userId) + 1;
  const progress = getProgressToNextLevel(userData.totalXp || 0);
  return { ...userData, rank, progress };
}

async function getLeaderboard(guildId, limit = 10) {
  return UserLevel.find({ guildId }, { sort: { totalXp: -1 }, limit });
}

module.exports = {
  processXp, handleVoiceState, startVoiceXpTracker,
  getLeaderboard, getUserRank, getXpForLevel, getLevelFromXp, getProgressToNextLevel,
};
