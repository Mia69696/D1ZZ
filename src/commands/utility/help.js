const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const COMMANDS = {
  '🛡️ Moderation': [
    { name: '/ban', desc: 'Ban a member' },
    { name: '/kick', desc: 'Kick a member' },
    { name: '/mute', desc: 'Timeout a member' },
    { name: '/warn', desc: 'Warn a member' },
    { name: '/cases', desc: 'View mod history' },
    { name: '/purge', desc: 'Bulk delete messages' },
  ],
  '📊 Leveling': [
    { name: '/rank', desc: 'View your rank card' },
    { name: '/leaderboard', desc: 'Server XP leaderboard' },
  ],
  '👤 Social': [
    { name: '/profile', desc: 'View global profile' },
    { name: '/rep', desc: 'Give reputation' },
  ],
  '🎫 Utility': [
    { name: '/serverinfo', desc: 'Server information' },
    { name: '/userinfo', desc: 'User information' },
    { name: '/avatar', desc: 'Get user avatar' },
    { name: '/remind', desc: 'Set a reminder' },
    { name: '/giveaway', desc: 'Start a giveaway' },
    { name: '/poll', desc: 'Create a poll' },
  ],
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('View all d1z bot commands'),
  cooldown: 5,
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor('#5865f2')
      .setTitle('📖 d1z Bot — Commands')
      .setDescription('Here are all available commands. Configure everything on the **[Web Dashboard](http://localhost:3000)**.')
      .setThumbnail(interaction.client.user.displayAvatarURL({ dynamic: true }));

    for (const [category, cmds] of Object.entries(COMMANDS)) {
      embed.addFields({
        name: category,
        value: cmds.map(c => `\`${c.name}\` — ${c.desc}`).join('\n'),
        inline: false,
      });
    }

    embed.setFooter({ text: `d1z Bot • ${interaction.guild.name}` }).setTimestamp();
    interaction.reply({ embeds: [embed] });
  },
};
