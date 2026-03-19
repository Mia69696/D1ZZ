const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserRank } = require('../../modules/leveling');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription("Check your or someone's rank and level")
    .addUserOption(o => o.setName('user').setDescription('User to check')),
  cooldown: 5,
  async execute(interaction, client) {
    await interaction.deferReply();
    const target = interaction.options.getUser('user') || interaction.user;
    const data = await getUserRank(target.id, interaction.guild.id);

    if (!data) {
      return interaction.editReply({ content: `❌ **${target.username}** hasn't earned any XP yet!` });
    }

    const bars = 20;
    const fill = Math.floor((data.progress.currentXp / data.progress.neededXp) * bars);
    const progressBar = '█'.repeat(fill) + '░'.repeat(bars - fill);

    const embed = new EmbedBuilder()
      .setColor('#5865f2')
      .setAuthor({ name: target.tag, iconURL: target.displayAvatarURL({ dynamic: true }) })
      .setTitle('📊 Rank Card')
      .addFields(
        { name: '🏆 Rank', value: `#${data.rank}`, inline: true },
        { name: '⭐ Level', value: `${data.level}`, inline: true },
        { name: '✉️ Messages', value: `${data.messageCount.toLocaleString()}`, inline: true },
        { name: '📈 Progress', value: `\`${progressBar}\` ${data.progress.percentage}%`, inline: false },
        { name: '🔢 XP', value: `${data.progress.currentXp.toLocaleString()} / ${data.progress.neededXp.toLocaleString()}`, inline: true },
        { name: '📦 Total XP', value: `${data.totalXp.toLocaleString()}`, inline: true },
      )
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: interaction.guild.name })
      .setTimestamp();

    interaction.editReply({ embeds: [embed] });
  },
};
