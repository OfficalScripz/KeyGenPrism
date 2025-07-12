import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, ChatInputCommandInteraction } from 'discord.js';
import { storage } from './storage';

const DISCORD_TOKEN = process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN || '';
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';
const GUILD_ID = process.env.DISCORD_GUILD_ID || ''; // Specific server ID
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID || ''; // Specific channel ID
const WHITELIST_USERS = process.env.DISCORD_WHITELIST_USERS ? process.env.DISCORD_WHITELIST_USERS.split(',') : []; // Comma-separated user IDs
const MONTH_KEY_USERS = process.env.DISCORD_MONTH_KEY_USERS ? process.env.DISCORD_MONTH_KEY_USERS.split(',') : []; // Only these 3 users can generate month keys

// Store the logs channel ID
let LOGS_CHANNEL_ID = process.env.DISCORD_LOGS_CHANNEL_ID || '';

// Check if required environment variables are set
console.log('Checking Discord configuration...');
if (!DISCORD_TOKEN || DISCORD_TOKEN.trim() === '') {
  console.log('⚠️  DISCORD_TOKEN is not set or empty - Bot will not start');
  console.log('   Please set the DISCORD_TOKEN environment variable');
} else {
  console.log('✅ DISCORD_TOKEN is configured');
}
if (!CLIENT_ID || CLIENT_ID.trim() === '') {
  console.log('⚠️  DISCORD_CLIENT_ID is not set or empty - Bot will not start');
  console.log('   Please set the DISCORD_CLIENT_ID environment variable');
} else {
  console.log('✅ DISCORD_CLIENT_ID is configured');
}

class DiscordBot {
  private client: Client;
  private isReady: boolean = false;
  private canStart: boolean = false;

  constructor() {
    this.canStart = !!(DISCORD_TOKEN && DISCORD_TOKEN.trim() !== '' && CLIENT_ID && CLIENT_ID.trim() !== '');
    
    if (!this.canStart) {
      console.log('⚠️  Discord bot cannot start - missing required configuration');
      return;
    }

    this.client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
    });
    
    this.setupEventHandlers();
    this.registerCommands().catch(console.error);
  }

  private setupEventHandlers() {
    this.client.once('ready', () => {
      console.log(`Discord bot logged in as ${this.client.user?.tag}`);
      this.isReady = true;
      this.logMessage('INFO', 'Bot started successfully. Slash commands registered.');
    });

    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      try {
        // Check if command is from the allowed guild (if specified)
        if (GUILD_ID && interaction.guildId !== GUILD_ID) {
          const embed = new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('❌ Server Restricted')
            .setDescription('This bot only works in the authorized server.');
          
          await interaction.reply({ embeds: [embed], ephemeral: true });
          return;
        }

        // Check if command is from the allowed channel (only for generate24key)
        if (interaction.commandName === 'generate24key' && CHANNEL_ID && interaction.channelId !== CHANNEL_ID) {
          const embed = new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('❌ Channel Restricted')
            .setDescription('This command can only be used in the designated channel.');
          
          await interaction.reply({ embeds: [embed], ephemeral: true });
          return;
        }

        if (interaction.commandName === 'generate24key') {
          await this.handleGenerateKeyCommand(interaction);
        } else if (interaction.commandName === 'generate1mkey') {
          await this.handleGenerate1MKeyCommand(interaction);
        } else if (interaction.commandName === 'generateyearkey') {
          await this.handleGenerateYearKeyCommand(interaction);
        } else if (interaction.commandName === 'generatelifetime') {
          await this.handleGenerateLifetimeKeyCommand(interaction);
        } else if (interaction.commandName === 'setup-logs') {
          await this.handleSetupLogsCommand(interaction);
        }
      } catch (error) {
        console.error('Error handling interaction:', error);
        
        // Only try to respond if we haven't already
        if (!interaction.replied && !interaction.deferred) {
          try {
            await interaction.reply({ 
              content: 'An error occurred while processing your command. Please try again later.',
              ephemeral: true 
            });
          } catch (replyError) {
            console.error('Failed to send error response:', replyError);
          }
        }
      }
    });
  }

  private async registerCommands() {
    if (!this.canStart) {
      console.log('⚠️  Skipping command registration - Discord bot configuration missing');
      return;
    }

    const commands = [
      new SlashCommandBuilder()
        .setName('generate24key')
        .setDescription('Generate a 24-hour key for Roblox executor access'),
      new SlashCommandBuilder()
        .setName('generate1mkey')
        .setDescription('Generate a 1-month transferable key (VIP only)'),
      new SlashCommandBuilder()
        .setName('generateyearkey')
        .setDescription('Generate a 1-year transferable key (VIP only)'),
      new SlashCommandBuilder()
        .setName('generatelifetime')
        .setDescription('Generate a lifetime transferable key (VIP only)'),
      new SlashCommandBuilder()
        .setName('setup-logs')
        .setDescription('Set this channel as the bot logs channel (admin only)')
    ];

    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

    try {
      if (GUILD_ID) {
        // Register commands for specific guild only
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
          body: commands
        });
        console.log(`Discord slash commands registered for guild: ${GUILD_ID}`);
      } else {
        // Fallback to global commands if no guild specified
        await rest.put(Routes.applicationCommands(CLIENT_ID), {
          body: commands
        });
        console.log('Discord slash commands registered globally');
      }
    } catch (error) {
      console.error('Error registering Discord commands:', error);
    }
  }

  private async handleGenerateKeyCommand(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;
    const username = `${interaction.user.username}#${interaction.user.discriminator}`;
    const isWhitelisted = WHITELIST_USERS.includes(userId);
    const now = new Date();

    try {
      // Check if user has an existing active key
      const allKeys = await storage.getAllKeys();
      const existingActiveKey = allKeys.find(key => 
        key.discordUserId === userId && 
        key.isActive && 
        key.expiresAt > now
      );

      let keyCode: string;
      let createdAt: Date;
      let expiresAt: Date;

      if (existingActiveKey) {
        // Return existing active key
        keyCode = existingActiveKey.keyCode;
        createdAt = existingActiveKey.createdAt;
        expiresAt = existingActiveKey.expiresAt;
        
        await this.logMessage('INFO', `Existing key returned for ${username}: ${keyCode}`, userId);
        await this.sendLogToChannel('INFO', `🔑 **Key Reused** - ${username} received their existing key (${this.formatTimeLeft(expiresAt)} remaining)`, userId);
      } else {
        // Generate new key
        keyCode = this.generateKeyCode();
        createdAt = now;
        expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

        // Create key in storage
        await storage.createKey({
          keyCode,
          discordUserId: userId,
          discordUsername: username,
          createdAt,
          expiresAt,
          isActive: true
        });
        
        await this.logMessage('INFO', `New key generated for ${username}: ${keyCode}`, userId);
        const isVip = WHITELIST_USERS.includes(userId);
        await this.sendLogToChannel('INFO', `🆕 **New Key Generated** - ${username}${isVip ? ' 👑' : ''} received a new 24-hour key`, userId);
      }

      const isNewKey = !existingActiveKey;
      
      const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setTitle(isNewKey ? '✅ Key Generated Successfully!' : '🔑 Your Active Key')
        .setDescription(isNewKey ? 'Your 24-hour executor key has been generated.' : 'Here is your current active key.')
        .addFields(
          { name: '🔑 Your Key', value: `\`\`\`${keyCode}\`\`\``, inline: false },
          { name: '⏰ Expires', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:F>`, inline: true },
          { name: '🔄 Status', value: isNewKey ? 'New Key' : 'Existing Key', inline: true }
        )
        .setFooter({ text: isNewKey ? 'New key created! You will receive the same key until it expires.' : 'This is your current active key. You will get a new one when this expires.' });

      await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
      console.error('Error generating key:', error);
      await this.logMessage('ERROR', `Failed to generate key for ${username}: ${error}`, userId);

      const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('❌ Error')
        .setDescription('An error occurred while generating your key. Please try again later.');

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }

  private async handleGenerate1MKeyCommand(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;
    const username = `${interaction.user.username}#${interaction.user.discriminator}`;
    
    // Check if user is authorized to generate month keys
    if (!MONTH_KEY_USERS.includes(userId)) {
      const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('❌ Access Denied')
        .setDescription('You do not have permission to generate month keys. Only VIP users can use this command.');
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      await this.logMessage('WARN', `Unauthorized month key attempt by ${username}`, userId);
      await this.sendLogToChannel('WARN', `⚠️ **Unauthorized Access** - ${username} tried to generate a month key without permission`, userId);
      return;
    }

    try {
      // Always generate a new unique month key (no reuse like 24h keys)
      const keyCode = this.generateMonthKeyCode();
      const createdAt = new Date();
      const expiresAt = new Date(createdAt.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days

      // Create the transferable month key (no specific Discord user tied to it)
      await storage.createKey({
        keyCode,
        discordUserId: userId, // Track who generated it
        discordUsername: username,
        createdAt,
        expiresAt,
        isActive: true
      });

      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('👑 Month Key Generated!')
        .setDescription('Your 1-month transferable executor key has been generated.')
        .addFields(
          { name: '🔑 Your Transferable Key', value: `\`\`\`${keyCode}\`\`\``, inline: false },
          { name: '⏰ Expires', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:F>`, inline: true },
          { name: '🔄 Duration', value: '30 Days', inline: true },
          { name: '📤 Transferable', value: 'Yes - Can be shared with anyone', inline: true }
        )
        .setFooter({ text: '🎁 This key can be used by anyone you share it with!' });

      await interaction.reply({ embeds: [embed], ephemeral: true });
      await this.logMessage('INFO', `Month key generated by VIP ${username}: ${keyCode}`, userId);
      await this.sendLogToChannel('INFO', `👑 **Month Key Generated** - VIP ${username} created a new 30-day transferable key`, userId);

    } catch (error) {
      console.error('Error generating month key:', error);
      await this.logMessage('ERROR', `Failed to generate month key for ${username}: ${error}`, userId);
      await this.sendLogToChannel('ERROR', `❌ **Error** - Failed to generate month key for ${username}`, userId);

      const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('❌ Error')
        .setDescription('An error occurred while generating your month key. Please try again later.');

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
  }

  private async handleGenerateYearKeyCommand(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;
    const username = `${interaction.user.username}#${interaction.user.discriminator}`;
    
    // Check if user is authorized to generate year keys
    if (!MONTH_KEY_USERS.includes(userId)) {
      const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('❌ Access Denied')
        .setDescription('You do not have permission to generate year keys. Only VIP users can use this command.');
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      await this.logMessage('WARN', `Unauthorized year key attempt by ${username}`, userId);
      await this.sendLogToChannel('WARN', `⚠️ **Unauthorized Access** - ${username} tried to generate a year key without permission`, userId);
      return;
    }

    try {
      // Always generate a new unique year key
      const keyCode = this.generateYearKeyCode();
      const createdAt = new Date();
      const expiresAt = new Date(createdAt.getTime() + (365 * 24 * 60 * 60 * 1000)); // 365 days

      await storage.createKey({
        keyCode,
        discordUserId: userId,
        discordUsername: username,
        createdAt,
        expiresAt,
        isActive: true
      });

      const embed = new EmbedBuilder()
        .setColor('#FF6B35')
        .setTitle('🚀 Year Key Generated!')
        .setDescription('Your 1-year transferable executor key has been generated.')
        .addFields(
          { name: '🔑 Your Transferable Key', value: `\`\`\`${keyCode}\`\`\``, inline: false },
          { name: '⏰ Expires', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:F>`, inline: true },
          { name: '🔄 Duration', value: '365 Days', inline: true },
          { name: '📤 Transferable', value: 'Yes - Can be shared with anyone', inline: true }
        )
        .setFooter({ text: '🎯 This key can be used by anyone you share it with!' });

      await interaction.reply({ embeds: [embed], ephemeral: true });
      await this.logMessage('INFO', `Year key generated by VIP ${username}: ${keyCode}`, userId);
      await this.sendLogToChannel('INFO', `🚀 **Year Key Generated** - VIP ${username} created a new 365-day transferable key`, userId);

    } catch (error) {
      console.error('Error generating year key:', error);
      await this.logMessage('ERROR', `Failed to generate year key for ${username}: ${error}`, userId);
      await this.sendLogToChannel('ERROR', `❌ **Error** - Failed to generate year key for ${username}`, userId);

      const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('❌ Error')
        .setDescription('An error occurred while generating your year key. Please try again later.');

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
  }

  private async handleGenerateLifetimeKeyCommand(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;
    const username = `${interaction.user.username}#${interaction.user.discriminator}`;
    
    // Check if user is authorized to generate lifetime keys
    if (!MONTH_KEY_USERS.includes(userId)) {
      const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('❌ Access Denied')
        .setDescription('You do not have permission to generate lifetime keys. Only VIP users can use this command.');
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      await this.logMessage('WARN', `Unauthorized lifetime key attempt by ${username}`, userId);
      await this.sendLogToChannel('WARN', `⚠️ **Unauthorized Access** - ${username} tried to generate a lifetime key without permission`, userId);
      return;
    }

    try {
      // Always generate a new unique lifetime key
      const keyCode = this.generateLifetimeKeyCode();
      const createdAt = new Date();
      const expiresAt = new Date(createdAt.getTime() + (50 * 365 * 24 * 60 * 60 * 1000)); // 50 years (effectively lifetime)

      await storage.createKey({
        keyCode,
        discordUserId: userId,
        discordUsername: username,
        createdAt,
        expiresAt,
        isActive: true
      });

      const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle('♾️ Lifetime Key Generated!')
        .setDescription('Your lifetime transferable executor key has been generated.')
        .addFields(
          { name: '🔑 Your Transferable Key', value: `\`\`\`${keyCode}\`\`\``, inline: false },
          { name: '⏰ Expires', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:F>`, inline: true },
          { name: '🔄 Duration', value: 'Lifetime (50 Years)', inline: true },
          { name: '📤 Transferable', value: 'Yes - Can be shared with anyone', inline: true }
        )
        .setFooter({ text: '♾️ This key will last a lifetime and can be shared with anyone!' });

      await interaction.reply({ embeds: [embed], ephemeral: true });
      await this.logMessage('INFO', `Lifetime key generated by VIP ${username}: ${keyCode}`, userId);
      await this.sendLogToChannel('INFO', `♾️ **Lifetime Key Generated** - VIP ${username} created a new lifetime transferable key`, userId);

    } catch (error) {
      console.error('Error generating lifetime key:', error);
      await this.logMessage('ERROR', `Failed to generate lifetime key for ${username}: ${error}`, userId);
      await this.sendLogToChannel('ERROR', `❌ **Error** - Failed to generate lifetime key for ${username}`, userId);

      const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('❌ Error')
        .setDescription('An error occurred while generating your lifetime key. Please try again later.');

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
  }

  private async handleSetupLogsCommand(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;
    const username = `${interaction.user.username}#${interaction.user.discriminator}`;
    const isWhitelisted = WHITELIST_USERS.includes(userId);
    
    // Check if user has admin permissions
    const member = interaction.guild?.members.cache.get(userId);
    if (!member?.permissions.has('Administrator') && !isWhitelisted) {
      const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('❌ Access Denied')
        .setDescription('You need Administrator permissions to use this command.');
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    try {
      // Set this channel as the logs channel
      LOGS_CHANNEL_ID = interaction.channelId;
      
      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('✅ Logs Channel Set')
        .setDescription(`This channel (<#${interaction.channelId}>) has been set as the bot logs channel.`)
        .addFields({
          name: '📝 What will be logged:',
          value: '• Key generation events\n• User cooldown status\n• VIP user activities\n• Bot errors and warnings',
          inline: false
        })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
      await this.logMessage('INFO', `Logs channel set to ${interaction.channelId} by admin: ${username}`, userId);

      // Send a test log message to the channel
      await this.sendLogToChannel('INFO', `🔧 Logs channel configured by ${username}. All bot activities will now be logged here.`);

    } catch (error) {
      console.error('Error in setup-logs command:', error);
      await this.logMessage('ERROR', `Setup logs command failed for ${username}: ${error}`, userId);

      const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('❌ Error')
        .setDescription('An error occurred while setting up the logs channel. Please try again later.');

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
  }

  private generateKeyCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const segments = [];
    
    for (let i = 0; i < 4; i++) {
      let segment = '';
      for (let j = 0; j < 4; j++) {
        segment += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      segments.push(segment);
    }
    
    return `PrismKey - ${segments.join(' - ')}`;
  }

  private generateMonthKeyCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const segments = [];
    
    // Generate 5 segments of 4 characters each for month keys to make them unique
    for (let i = 0; i < 5; i++) {
      let segment = '';
      for (let j = 0; j < 4; j++) {
        segment += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      segments.push(segment);
    }
    
    // Add timestamp-based uniqueness to ensure different keys each time
    const timestamp = Date.now().toString(36).toUpperCase().slice(-3);
    
    return `PrismVIP - ${segments.join(' - ')} - ${timestamp}`;
  }

  private generateYearKeyCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const segments = [];
    
    // Generate 6 segments of 4 characters each for year keys
    for (let i = 0; i < 6; i++) {
      let segment = '';
      for (let j = 0; j < 4; j++) {
        segment += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      segments.push(segment);
    }
    
    // Add timestamp-based uniqueness
    const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
    
    return `PrismYEAR - ${segments.join(' - ')} - ${timestamp}`;
  }

  private generateLifetimeKeyCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const segments = [];
    
    // Generate 7 segments of 4 characters each for lifetime keys
    for (let i = 0; i < 7; i++) {
      let segment = '';
      for (let j = 0; j < 4; j++) {
        segment += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      segments.push(segment);
    }
    
    // Add timestamp and random suffix for maximum uniqueness
    const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
    const randomSuffix = Math.random().toString(36).toUpperCase().slice(-3);
    
    return `PrismLIFE - ${segments.join(' - ')} - ${timestamp}${randomSuffix}`;
  }

  private formatTimeLeft(endTime: Date): string {
    const now = new Date();
    const diff = endTime.getTime() - now.getTime();
    
    if (diff <= 0) return '0m';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  private async logMessage(level: string, message: string, discordUserId?: string) {
    await storage.addLog({
      timestamp: new Date(),
      level,
      message,
      discordUserId: discordUserId || null
    });
  }

  private async sendLogToChannel(level: string, message: string, discordUserId?: string) {
    if (!LOGS_CHANNEL_ID || !this.canStart || !this.isReady) {
      return;
    }

    try {
      const channel = await this.client.channels.fetch(LOGS_CHANNEL_ID);
      if (!channel || !channel.isTextBased()) {
        console.error('Logs channel not found or is not a text channel');
        return;
      }

      const embed = new EmbedBuilder()
        .setTimestamp()
        .setDescription(message);

      // Set color based on log level
      switch (level) {
        case 'INFO':
          embed.setColor('#5865F2');
          break;
        case 'WARN':
          embed.setColor('#FEE75C');
          break;
        case 'ERROR':
          embed.setColor('#ED4245');
          break;
        default:
          embed.setColor('#99AAB5');
      }

      await channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Failed to send log to channel:', error);
    }
  }

  public async start() {
    if (!this.canStart) {
      console.log('⚠️  Cannot start Discord bot - configuration missing');
      return;
    }

    try {
      await this.client.login(DISCORD_TOKEN);
    } catch (error) {
      console.error('Failed to start Discord bot:', error);
      await this.logMessage('ERROR', `Failed to connect to Discord API: ${error}`);
    }
  }

  public isOnline(): boolean {
    return this.canStart && this.isReady;
  }

  public getUptime(): string {
    if (!this.canStart || !this.client || !this.client.uptime) return '0s';
    
    const uptime = this.client.uptime;
    const days = Math.floor(uptime / (24 * 60 * 60 * 1000));
    const hours = Math.floor((uptime % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((uptime % (60 * 60 * 1000)) / (60 * 1000));
    
    return `${days}d ${hours}h ${minutes}m`;
  }
}

export const discordBot = new DiscordBot();

// Auto-expire keys
setInterval(async () => {
  const allKeys = await storage.getAllKeys();
  const now = new Date();
  
  for (const key of allKeys) {
    if (key.isActive && key.expiresAt <= now) {
      await storage.expireKey(key.keyCode);
      await storage.addLog({
        timestamp: now,
        level: 'INFO',
        message: `Key ${key.keyCode} expired for ${key.discordUsername}`,
        discordUserId: key.discordUserId
      });
    }
  }
}, 60000); // Check every minute
