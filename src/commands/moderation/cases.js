const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { ModAction } = require('../../models');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cases')
    .setDescription('View moderation history for a user')
    .addUserOption(o => o.setName('user').setDescription('User to check').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 5,
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    await interaction.deferReply();
    const cases = ModAction.find({ guildId: interaction.guild.id, targetId: target.id }, { sort: { caseNumber: -1 }, limit: 15 });
    if (!cases.length) return interaction.editReply({ content: `✅ No moderation history for **${target.tag}**.` });
    const embed = new EmbedBuilder().setColor('#7289da').setTitle(`📋 Mod History — ${target.tag}`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .setDescription(cases.map(c => `**Case #${c.caseNumber}** • \`${c.type.toUpperCase()}\`\n👮 ${c.moderatorTag} • 📝 ${c.reason}`).join('\n\n'))
      .setFooter({ text: `${cases.length} case(s)` }).setTimestamp();
    interaction.editReply({ embeds: [embed] });
  },
};
