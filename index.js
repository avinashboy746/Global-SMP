import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { config } from 'dotenv';
import { readdirSync, statSync } from 'fs';
import { join, dirname, extname, relative, sep } from 'path';
import { fileURLToPath } from 'url';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Initialize collections
client.commands = new Collection();
client.config = {
    prefix: process.env.BOT_PREFIX || '!',
    botName: process.env.BOT_NAME || 'Discord Bot',
    ownerId: process.env.BOT_OWNER_ID || '',
    dashboardUrl: process.env.DASHBOARD_URL || 'http://localhost:3000',
    copyright: process.env.COPYRIGHT_MESSAGE || '© 2024 Discord Bot',
    privacyUrl: process.env.PRIVACY_POLICY_URL || '#',
    termsUrl: process.env.TERMS_OF_SERVICE_URL || '#'
};

// Recursive function to get all files from directory and subdirectories
function getAllFiles(dirPath, arrayOfFiles = []) {
    const files = readdirSync(dirPath);

    files.forEach(file => {
        const fullPath = join(dirPath, file);
        if (statSync(fullPath).isDirectory()) {
            arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
        } else {
            arrayOfFiles.push(fullPath);
        }
    });

    return arrayOfFiles;
}

// Get file name without extension for default naming
function getFileName(filePath) {
    return filePath.split(sep).pop().replace(extname(filePath), '');
}

// Load Commands Recursively
async function loadCommands() {
    try {
        const commandsPath = join(__dirname, 'commands');
        const allFiles = getAllFiles(commandsPath).filter(file => file.endsWith('.js'));
        
        console.log(`🔄 Loading ${allFiles.length} commands...`);

        for (const filePath of allFiles) {
            try {
                const command = await import(`file://${filePath}`);
                
                if (command.default) {
                    const cmd = command.default;
                    // Use cmd.name or fallback to filename
                    const cmdName = cmd.name || getFileName(filePath);
                    
                    if (cmdName) {
                        client.commands.set(cmdName, cmd);
                        console.log(`✅ Loaded command: ${cmdName}`);
                    }
                }
            } catch (err) {
                console.error(`❌ Error loading command ${filePath}:`, err.message);
            }
        }
        console.log('✨ All commands loaded successfully!\n');
    } catch (error) {
        console.error('❌ Error loading commands:', error);
    }
}

// Load Events Recursively
async function loadEvents() {
    try {
        const eventsPath = join(__dirname, 'events');
        const allFiles = getAllFiles(eventsPath).filter(file => file.endsWith('.js'));
        
        console.log(`🔄 Loading ${allFiles.length} events...`);

        for (const filePath of allFiles) {
            try {
                const event = await import(`file://${filePath}`);
                
                if (event.default) {
                    const evt = event.default;
                    // Use evt.name or fallback to filename
                    const eventName = evt.name || getFileName(filePath);
                    
                    if (eventName) {
                        if (evt.once) {
                            client.once(eventName, (...args) => evt.execute(...args, client));
                        } else {
                            client.on(eventName, (...args) => evt.execute(...args, client));
                        }
                        console.log(`✅ Loaded event: ${eventName} (${relative(eventsPath, filePath)})`);
                    }
                }
            } catch (err) {
                console.error(`❌ Error loading event ${filePath}:`, err.message);
            }
        }
        console.log('✨ All events loaded successfully!\n');
    } catch (error) {
        console.error('❌ Error loading events:', error);
    }
}

// Initialize bot
async function init() {
    console.log('🚀 Starting bot initialization...\n');
    
    await loadCommands();
    await loadEvents();
    
    console.log(`📂 Total Commands: ${client.commands.size}`);
    console.log(`📂 Events loaded from: events/ (recursive)\n`);
    
    // Start dashboard
    try {
        const startDashboard = (await import('./dashboard/app.js')).default;
        startDashboard(client);
    } catch (err) {
        console.error('❌ Dashboard error:', err.message);
    }
    
    // Login to Discord
    await client.login(process.env.BOT_TOKEN);
}

init();

export default client;
