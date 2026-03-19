const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { UserProfile, UserLevel } = require('../../models');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription("View your or someone's global profile")
    .addUserOption(o => o.setName('user').setDescription('User to view')),
  cooldown: 5,
  async execute(interaction) {
    await interaction.deferReply();
    const target = interaction.options.getUser('user') || interaction.user;
    let profile = UserProfile.findOne({ userId: target.id });
    if (!profile) profile = UserProfile.create({ userId: target.id });
    const levelData = UserLevel.findOne({ userId: target.id, guildId: interaction.guild.id });
    const embed = new EmbedBuilder()
      .setColor(profile.favoriteColor || '#5865f2')
      .setAuthor({ name: target.tag, iconURL: target.displayAvatarURL({ dynamic: true }) })
      .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
      .setTitle('👤 Global Profile')
      .addFields(
        { name: '📝 Bio', value: profile.bio || '*No bio set*' },
        { name: '⭐ Reputation', value: `${profile.reputation || 0}`, inline: true },
        { name: '📊 Server Level', value: levelData ? `Level ${levelData.level} (${levelData.totalXp?.toLocaleString()} XP)` : '*Not ranked*' },
      )
      .setFooter({ text: `Account created: ${new Date(target.createdTimestamp).toDateString()}` })
      .setTimestamp();
    interaction.editReply({ embeds: [embed] });
  },
};
