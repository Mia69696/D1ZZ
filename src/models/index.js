// Simple JSON file-based database — no MongoDB needed
const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

function getPath(col) { return path.join(DB_DIR, `${col}.json`); }
function readCol(col) { const p = getPath(col); if (!fs.existsSync(p)) return []; try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return []; } }
function writeCol(col, data) { fs.writeFileSync(getPath(col), JSON.stringify(data, null, 2)); }

function findOne(col, q) { return readCol(col).find(i => Object.keys(q).every(k => i[k] === q[k])) || null; }
function findMany(col, q = {}, opts = {}) {
  let data = readCol(col);
  if (Object.keys(q).length) data = data.filter(i => Object.keys(q).every(k => i[k] === q[k]));
  if (opts.sort) { const [k, d] = Object.entries(opts.sort)[0]; data.sort((a, b) => d === -1 ? (b[k]||0)-(a[k]||0) : (a[k]||0)-(b[k]||0)); }
  if (opts.skip) data = data.slice(opts.skip);
  if (opts.limit) data = data.slice(0, opts.limit);
  return data;
}
function insertOne(col, doc) { const data = readCol(col); const d = { _id: Date.now()+Math.random().toString(36).slice(2), ...doc }; data.push(d); writeCol(col, data); return d; }
function applyUpdate(doc, u) {
  if (u.$set) Object.assign(doc, u.$set);
  if (u.$inc) Object.keys(u.$inc).forEach(k => doc[k] = (doc[k]||0) + u.$inc[k]);
  if (u.$push) Object.keys(u.$push).forEach(k => { if (!doc[k]) doc[k] = []; doc[k].push(u.$push[k]); });
  return doc;
}
function updateOne(col, q, u, opts = {}) {
  const data = readCol(col);
  const idx = data.findIndex(i => Object.keys(q).every(k => i[k] === q[k]));
  if (idx === -1) {
    if (opts.upsert) { const d = insertOne(col, applyUpdate({ ...q }, u)); return d; }
    return null;
  }
  applyUpdate(data[idx], u);
  writeCol(col, data);
  return data[idx];
}
function deleteOne(col, q) { const data = readCol(col); const idx = data.findIndex(i => Object.keys(q).every(k => i[k] === q[k])); if (idx !== -1) { data.splice(idx, 1); writeCol(col, data); } }
function countDocs(col, q = {}) { return findMany(col, q).length; }

const defaultGuild = (guildId) => ({
  guildId, prefix: '!', language: 'en',
  welcome: { enabled: false, channelId: '', message: 'Welcome {user} to {server}!', imageEnabled: true, backgroundUrl: '', backgroundColor: '#1a1a2e', textColor: '#ffffff', avatarBorderColor: '#5865f2', subtitleText: 'You are member #{count}' },
  goodbye: { enabled: false, channelId: '', message: "Goodbye {user}, we'll miss you!" },
  leveling: { enabled: true, xpPerMessage: 15, xpCooldown: 60, voiceXpPerMinute: 5, levelUpMessage: true, levelUpChannelId: '', levelUpText: 'Congrats {user}, you reached level {level}! 🎉', roleRewards: [], ignoredChannels: [], noXpRoles: [] },
  automod: { enabled: false, logChannelId: '', antiSpam: { enabled: false, threshold: 5, timeWindow: 5000, action: 'mute', muteDuration: 10 }, antiMassMention: { enabled: false, threshold: 5, action: 'mute' }, badWords: { enabled: false, words: [], action: 'delete' }, antiLinks: { enabled: false, whitelistedDomains: [], action: 'delete' }, antiInvites: { enabled: false, action: 'delete' }, antiCaps: { enabled: false, threshold: 70, minLength: 10, action: 'delete' }, antiDuplicate: { enabled: false, threshold: 3, action: 'mute' }, ignoredChannels: [], bypassRoles: [] },
  antiRaid: { enabled: false, joinThreshold: 10, joinTimeWindow: 10000, action: 'lockdown', alertChannelId: '' },
  logging: { enabled: false, channelId: '', events: { messageDelete: true, messageEdit: true, memberJoin: true, memberLeave: true, memberBan: true, memberUnban: true, voiceJoin: true, voiceLeave: true, voiceMove: false, nicknameChange: false, memberRoleUpdate: true } },
  reactionRoles: [], music: { enabled: true, djRoleId: '', maxQueueLength: 100, defaultVolume: 50 },
  moderation: { muteRoleId: '', modLogChannelId: '', dmOnPunish: true },
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
});

const Guild = {
  findOne: q => { const d = findOne('guilds', q); return d; },
  create: doc => { const d = { ...defaultGuild(doc.guildId), ...doc }; return insertOne('guilds', d); },
  findOneAndUpdate: (q, u, opts) => {
    let doc = findOne('guilds', q);
    if (!doc && opts && opts.upsert) { doc = defaultGuild(q.guildId); insertOne('guilds', doc); }
    if (!doc) return null;
    const data = readCol('guilds');
    const idx = data.findIndex(i => i.guildId === doc.guildId);
    if (idx !== -1) { if (u.$set) Object.assign(data[idx], u.$set); if (u.$inc) Object.keys(u.$inc).forEach(k => data[idx][k] = (data[idx][k]||0)+u.$inc[k]); writeCol('guilds', data); return data[idx]; }
    return null;
  },
  updateOne: (q, u, opts) => updateOne('guilds', q, u, opts),
};

const UserLevel = {
  findOne: q => findOne('userlevels', q),
  find: (q, opts) => findMany('userlevels', q, opts || {}),
  findOneAndUpdate: (q, u, opts) => updateOne('userlevels', q, u, opts),
  updateOne: (q, u, opts) => updateOne('userlevels', q, u, opts),
  countDocuments: q => countDocs('userlevels', q || {}),
  create: doc => insertOne('userlevels', { xp: 0, level: 0, totalXp: 0, voiceXp: 0, messageCount: 0, updatedAt: new Date().toISOString(), ...doc }),
};

const ModAction = {
  findOne: q => findOne('modactions', q),
  find: (q, opts) => findMany('modactions', q, opts || {}),
  create: doc => insertOne('modactions', { active: true, createdAt: new Date().toISOString(), ...doc }),
  countDocuments: q => countDocs('modactions', q || {}),
  updateOne: (q, u) => updateOne('modactions', q, u),
};

const GuildStats = {
  find: (q, opts) => findMany('guildstats', {}, opts || {}),
  findOneAndUpdate: (q, u, opts) => updateOne('guildstats', q, u, opts),
};

const UserProfile = {
  findOne: q => findOne('userprofiles', q),
  create: doc => insertOne('userprofiles', { bio: '', reputation: 0, commandsUsed: 0, favoriteColor: '#5865f2', createdAt: new Date().toISOString(), ...doc }),
  findOneAndUpdate: (q, u, opts) => updateOne('userprofiles', q, u, opts),
};

const Reminder = {
  find: () => readCol('reminders'),
  create: doc => insertOne('reminders', doc),
  deleteOne: q => deleteOne('reminders', q),
};

const Giveaway = {
  findOne: q => findOne('giveaways', q),
  find: q => findMany('giveaways', q || {}),
  create: doc => insertOne('giveaways', { entries: [], winners: [], ended: false, createdAt: new Date().toISOString(), ...doc }),
  updateOne: (q, u) => updateOne('giveaways', q, u),
};

module.exports = { Guild, UserLevel, ModAction, GuildStats, UserProfile, Reminder, Giveaway };
