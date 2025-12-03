import './config/index.js';
import axios from 'axios';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function testBot() {
  console.log('🤖 Testing Telegram Bot...');
  console.log('Token:', BOT_TOKEN ? 'Present' : 'Missing');
  
  if (!BOT_TOKEN) {
    console.error('❌ Bot token missing!');
    return;
  }

  try {
    // Test 1: Get bot info
    console.log('\n1. Getting bot info...');
    const botInfo = await axios.get(
      `https://api.telegram.org/bot${BOT_TOKEN}/getMe`
    );
    console.log('✅ Bot info:', botInfo.data.result);

    // Test 2: Get updates
    console.log('\n2. Checking for updates...');
    const updates = await axios.get(
      `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`
    );
    console.log(`📨 Updates available: ${updates.data.result.length}`);
    
    if (updates.data.result.length > 0) {
      updates.data.result.forEach((update, index) => {
        console.log(`\nUpdate ${index + 1}:`);
        console.log('  ID:', update.update_id);
        if (update.message) {
          console.log('  From:', update.message.from.username || update.message.from.first_name);
          console.log('  Chat ID:', update.message.chat.id);
          console.log('  Text:', update.message.text);
          console.log('  Date:', new Date(update.message.date * 1000).toISOString());
        }
      });
    }

    // Test 3: Send a test message (if we have a chat ID)
    console.log('\n3. Testing message sending...');
    const chatId = updates.data.result[0]?.message?.chat?.id;
    
    if (chatId) {
      console.log('Sending test message to chat:', chatId);
      const sendResponse = await axios.post(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
        {
          chat_id: chatId,
          text: '🤖 Bot is working! Test message from server.',
          parse_mode: 'Markdown'
        }
      );
      console.log('✅ Test message sent:', sendResponse.data.ok);
    } else {
      console.log('ℹ️  No chat ID found. Start a chat with your bot first.');
      console.log('1. Open Telegram');
      console.log('2. Search for your bot');
      console.log('3. Send /start command');
      console.log('4. Run this test again');
    }

  } catch (error) {
    console.error('❌ API Error:', error.response?.data || error.message);
    
    if (error.response?.data?.error_code === 401) {
      console.error('⚠️  Invalid bot token! Check your TELEGRAM_BOT_TOKEN');
    } else if (error.response?.data?.error_code === 409) {
      console.error('⚠️  Another instance is polling. Stop other bots first.');
    }
  }
}

testBot();