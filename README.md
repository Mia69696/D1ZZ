# d1z — The Ultimate All-in-One Discord Bot

A fully-featured Discord bot with a **clean SaaS-style web dashboard**, built with Node.js, Discord.js v14, and MongoDB.

---

## ✨ Features

| Module | Features |
|--------|---------|
| 🎨 **Welcome** | Custom image cards with avatar, background, live preview |
| 📈 **Leveling** | Text + Voice XP, role rewards, leaderboard |
| 🛡️ **Auto-Mod** | Anti-spam, bad words, invite links, mass mention, caps, duplicates |
| 🚨 **Anti-Raid** | Mass-join detection, auto-lockdown/kick/ban |
| 📋 **Logging** | 16+ loggable events (messages, members, voice, roles) |
| 🎭 **Reaction Roles** | Button-based self-assign roles |
| 🎵 **Music** | YouTube queue player with DJ role |
| 🎉 **Giveaways** | Configurable with role/level requirements |
| 👤 **Profiles** | Global profiles with reputation system |
| 🌐 **Dashboard** | Full web UI, charts, live preview, toggle-everything |

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/d1z-bot.git
cd d1z-bot
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:
- `DISCORD_TOKEN` — your bot token from [Discord Developer Portal](https://discord.com/developers/applications)
- `DISCORD_CLIENT_ID` — your application's client ID
- `DISCORD_CLIENT_SECRET` — OAuth2 client secret
- `MONGODB_URI` — MongoDB connection string (use [MongoDB Atlas](https://mongodb.com/atlas) for free)
- `SESSION_SECRET` — any long random string

### 3. Discord Developer Setup

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. Create a new application named **d1z**
3. Go to **Bot** → Add Bot → copy the token
4. Go to **OAuth2** → General → add redirect: `http://localhost:3000/auth/callback`
5. Enable **Privileged Gateway Intents**: Server Members, Message Content
6. Invite bot with: `https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands`

### 4. Run

```bash
# Development (bot only)
npm run dev

# Dashboard only
npm run dashboard

# Both together
npm run both

# Production single process (Railway)
node start.js
```

---

## 🚂 Deploy to Railway

1. Push your code to GitHub
2. Create a new project on [Railway](https://railway.app)
3. Connect your GitHub repo
4. Add a **MongoDB** plugin in Railway dashboard
5. Set all environment variables from `.env.example`
6. Change `DISCORD_REDIRECT_URI` to your Railway URL + `/auth/callback`
7. Deploy — Railway auto-detects `start.js`

---

## 📁 Project Structure

```
d1z-bot/
├── src/
│   ├── index.js              # Bot entry point
│   ├── models/index.js       # MongoDB schemas
│   ├── events/               # Discord event handlers
│   ├── commands/
│   │   ├── moderation/       # ban, kick, mute, warn, cases, purge
│   │   ├── leveling/         # rank, leaderboard
│   │   ├── social/           # profile, rep
│   │   └── utility/          # help, serverinfo
│   ├── modules/
│   │   ├── leveling.js       # XP engine
│   │   ├── automod.js        # Auto-moderation engine
│   │   ├── welcome.js        # Welcome image generator
│   │   ├── antiRaid.js       # Anti-raid protection
│   │   ├── reactionRoles.js  # Reaction role handler
│   │   ├── moderation.js     # Punishment tracker
│   │   ├── giveaways.js      # Giveaway system
│   │   └── reminders.js      # Reminder system
│   ├── handlers/
│   │   ├── commandHandler.js # Auto-loads and registers slash commands
│   │   └── eventHandler.js   # Auto-loads events
│   └── utils/logger.js       # Winston logger
├── dashboard/
│   ├── server.js             # Express + Passport server
│   ├── routes/
│   │   ├── auth.js           # Discord OAuth2
│   │   ├── api.js            # REST API for dashboard
│   │   └── pages.js          # Page routes
│   └── public/
│       ├── index.html        # Landing page
│       ├── login.html        # Login page
│       ├── dashboard.html    # Server selector
│       └── guild.html        # Main dashboard SPA
├── .env.example
├── package.json
├── railway.toml
└── start.js                  # Combined entry (Railway)
```

---

## 🔧 Environment Variables

| Variable | Description |
|----------|-------------|
| `DISCORD_TOKEN` | Bot token |
| `DISCORD_CLIENT_ID` | Application ID |
| `DISCORD_CLIENT_SECRET` | OAuth2 secret |
| `DISCORD_REDIRECT_URI` | OAuth callback URL |
| `MONGODB_URI` | MongoDB connection string |
| `SESSION_SECRET` | Express session secret (32+ chars) |
| `DASHBOARD_PORT` | Dashboard port (default: 3000) |
| `DASHBOARD_URL` | Dashboard public URL |

---

## 🛠️ Adding Commands

Create a file in `src/commands/<category>/yourcommand.js`:

```js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mycommand')
    .setDescription('Does something cool'),
  cooldown: 5, // seconds
  async execute(interaction, client) {
    interaction.reply('Hello from d1z!');
  },
};
```

The command handler auto-loads all `.js` files and registers them with Discord.

---

## 📝 License

MIT — free to use, modify, and deploy.
