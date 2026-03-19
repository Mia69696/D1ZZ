const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { ModAction } = require('../../models');
const { getNextCaseNumber } = require('../../modules/moderation');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .addUserOption(o => o.setName('user').setDescription('User to ban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason'))
    .addIntegerOption(o => o.setName('days').setDescription('Days of messages to delete (0-7)').setMinValue(0).setMaxValue(7))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  cooldown: 3,
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const days = interaction.options.getInteger('days') || 0;
    const member = interaction.guild.members.cache.get(target.id);

    if (target.id === interaction.user.id) return interaction.reply({ content: '❌ You cannot ban yourself.', ephemeral: true });
    if (member && member.roles.highest.position >= interaction.member.roles.highest.position) return interaction.reply({ content: '❌ You cannot ban someone with equal or higher roles.', ephemeral: true });

    await interaction.deferReply();
    try {
      await target.send(`🔨 You have been **banned** from **${interaction.guild.name}**.\n**Reason:** ${reason}`).catch(() => {});
      await interaction.guild.members.ban(target.id, { reason, deleteMessageDays: days });
      const caseNum = getNextCaseNumber(interaction.guild.id);
      ModAction.create({ guildId: interaction.guild.id, caseNumber: caseNum, type: 'ban', targetId: target.id, targetTag: target.tag, moderatorId: interaction.user.id, moderatorTag: interaction.user.tag, reason });

      const embed = new EmbedBuilder().setColor('#f04747').setTitle(`🔨 Banned — Case #${caseNum}`)
        .addFields({ name: 'User', value: `${target.tag} (${target.id})`, inline: true }, { name: 'Moderator', value: interaction.user.tag, inline: true }, { name: 'Reason', value: reason })
        .setThumbnail(target.displayAvatarURL({ dynamic: true })).setTimestamp();
      interaction.editReply({ embeds: [embed] });
    } catch (err) { interaction.editReply({ content: `❌ Failed: ${err.message}` }); }
  },
};
