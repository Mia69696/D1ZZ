const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');

async function sendWelcomeImage(member, channel, welcomeConfig, memberCount) {
  try {
    // Try canvas-based welcome image
    let attachment = null;
    try {
      const { createCanvas, loadImage, registerFont } = require('canvas');
      const canvas = createCanvas(800, 300);
      const ctx = canvas.getContext('2d');

      // Background
      if (welcomeConfig.backgroundUrl) {
        try {
          const bg = await loadImage(welcomeConfig.backgroundUrl);
          ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
        } catch {
          ctx.fillStyle = welcomeConfig.backgroundColor || '#2c2f33';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      } else {
        // Gradient background
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, '#1a1a2e');
        grad.addColorStop(1, '#16213e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Overlay for text readability
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Avatar border circle
      const avatarX = 130, avatarY = 150, avatarRadius = 80;
      ctx.beginPath();
      ctx.arc(avatarX, avatarY, avatarRadius + 6, 0, Math.PI * 2);
      ctx.fillStyle = welcomeConfig.avatarBorderColor || '#5865f2';
      ctx.fill();

      // Avatar circle clip
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
      try {
        const avatar = await loadImage(avatarUrl);
        ctx.drawImage(avatar, avatarX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
      } catch {
        ctx.fillStyle = '#5865f2';
        ctx.fillRect(avatarX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
      }
      ctx.restore();

      // "WELCOME" text
      ctx.font = 'bold 22px Arial';
      ctx.fillStyle = welcomeConfig.avatarBorderColor || '#5865f2';
      ctx.textAlign = 'left';
      ctx.fillText('WELCOME', 265, 100);

      // Username
      ctx.font = 'bold 38px Arial';
      ctx.fillStyle = welcomeConfig.textColor || '#ffffff';
      const username = member.user.username.length > 18 ? member.user.username.slice(0, 18) + '...' : member.user.username;
      ctx.fillText(username, 265, 158);

      // Separator line
      ctx.beginPath();
      ctx.moveTo(265, 175);
      ctx.lineTo(750, 175);
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Subtitle
      const subtitle = (welcomeConfig.subtitleText || 'You are member #{count}')
        .replace('{count}', memberCount)
        .replace('{server}', member.guild.name);
      ctx.font = '20px Arial';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText(subtitle, 265, 210);

      // Server name
      ctx.font = '16px Arial';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText(member.guild.name, 265, 245);

      attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'welcome.png' });
    } catch (canvasErr) {
      logger.warn('Canvas not available, sending text welcome:', canvasErr.message);
    }

    // Message text
    const welcomeText = (welcomeConfig.message || 'Welcome {user} to {server}!')
      .replace('{user}', member.toString())
      .replace('{server}', member.guild.name)
      .replace('{tag}', member.user.tag)
      .replace('{count}', memberCount);

    if (attachment) {
      await channel.send({ content: welcomeText, files: [attachment] });
    } else {
      const embed = new EmbedBuilder()
        .setColor(welcomeConfig.avatarBorderColor || '#5865f2')
        .setTitle(`Welcome to ${member.guild.name}!`)
        .setDescription(welcomeText)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .addFields({ name: 'Member Count', value: `#${memberCount}`, inline: true })
        .setTimestamp();
      await channel.send({ embeds: [embed] });
    }
  } catch (err) {
    logger.error('sendWelcomeImage error:', err.message);
  }
}

module.exports = { sendWelcomeImage };
