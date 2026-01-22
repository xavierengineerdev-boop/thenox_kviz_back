import dotenv from 'dotenv';
import telegramService from '../services/telegram.service';

dotenv.config();

async function testTelegram() {
  console.log('Testing Telegram bot connection...');

  const testData = {
    lead: {
      name: 'Test User',
      phone: '+1234567890',
      email: 'test@example.com',
      capital: 'up-to-200',
      motivation: 'extra-income',
      readiness: 'ready-now',
    },
    utmParams: {
      utm_source: 'test',
      utm_medium: 'test',
    },
    userData: {
      userAgent: 'Test Agent',
      language: 'ru',
      platform: 'test',
      screenWidth: 1920,
      screenHeight: 1080,
      timezone: 'Europe/Moscow',
      timestamp: new Date().toISOString(),
    },
  };

  const result = await telegramService.sendLead(testData);

  if (result) {
    console.log('✅ Test message sent successfully!');
  } else {
    console.log('❌ Failed to send test message. Check logs for details.');
  }

  process.exit(result ? 0 : 1);
}

testTelegram();








