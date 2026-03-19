const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { UserLevel } = require('../../models');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the server XP leaderboard')
    .addIntegerOption(o => o.setName('page').setDescription('Page number').setMinValue(1)),
  cooldown: 10,
  async execute(interaction) {
    await interaction.deferReply();
    const page = interaction.options.getInteger('page') || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const all = UserLevel.find({ guildId: interaction.guild.id }, { sort: { totalXp: -1 } });
    const total = all.length;
    const entries = all.slice(skip, skip + limit);

    if (!entries.length) return interaction.editReply({ content: '❌ No leaderboard data yet.' });

    const medals = ['🥇', '🥈', '🥉'];
    const lines = entries.map((e, i) => {
      const rankPos = skip + i + 1;
      const medal = rankPos <= 3 ? medals[rankPos - 1] : `**#${rankPos}**`;
      return `${medal} <@${e.userId}> — Level ${e.level} • ${(e.totalXp || 0).toLocaleString()} XP`;
    });

    const embed = new EmbedBuilder()
      .setColor('#ffd700')
      .setTitle(`🏆 ${interaction.guild.name} Leaderboard`)
      .setDescription(lines.join('\n'))
      .setFooter({ text: `Page ${page} • ${total} members ranked` })
      .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
      .setTimestamp();
    interaction.editReply({ embeds: [embed] });
  },
};
