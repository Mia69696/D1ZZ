const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('View detailed server information'),
  cooldown: 10,
  async execute(interaction) {
    await interaction.deferReply();
    const { guild } = interaction;
    await guild.members.fetch();

    const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
    const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
    const bots = guild.members.cache.filter(m => m.user.bot).size;

    const embed = new EmbedBuilder()
      .setColor('#5865f2')
      .setTitle(guild.name)
      .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: '👑 Owner', value: `<@${guild.ownerId}>`, inline: true },
        { name: '📅 Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
        { name: '🆔 ID', value: guild.id, inline: true },
        { name: '👥 Members', value: `${guild.memberCount} (${bots} bots)`, inline: true },
        { name: '📝 Channels', value: `${textChannels} text, ${voiceChannels} voice`, inline: true },
        { name: '🎭 Roles', value: `${guild.roles.cache.size}`, inline: true },
        { name: '😀 Emojis', value: `${guild.emojis.cache.size}`, inline: true },
        { name: '🔒 Verification', value: guild.verificationLevel.toString(), inline: true },
        { name: '🚀 Boosts', value: `${guild.premiumSubscriptionCount || 0} (Tier ${guild.premiumTier})`, inline: true },
      )
      .setImage(guild.bannerURL({ size: 1024 }) || null)
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp();

    interaction.editReply({ embeds: [embed] });
  },
};
