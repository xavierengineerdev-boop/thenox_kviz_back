/**
 * Тест: одна тестова заявка відправляється і в Telegram, і в AstraCore CRM.
 * Запуск: npm run test:leads
 */
import dotenv from 'dotenv';
import telegramService from '../services/telegram.service';
import astracoreService from '../services/astracore.service';

dotenv.config();

const testData = {
  lead: {
    name: 'Test User',
    phone: '+380501234567',
    email: 'test@example.com',
    capital: 'up-to-200',
    motivation: 'extra-income',
    readiness: 'ready-now',
  },
  utmParams: {
    utm_source: 'test',
    utm_medium: 'cpc',
    utm_campaign: 'test-campaign',
  },
  userData: {
    userAgent: 'Mozilla/5.0 Test',
    language: 'uk',
    platform: 'Web',
    ip: '127.0.0.1',
    screenWidth: 1920,
    screenHeight: 1080,
    timezone: 'Europe/Kyiv',
    timestamp: new Date().toISOString(),
  },
};

async function main() {
  console.log('Тест відправки лида в Telegram та AstraCore CRM\n');

  let telegramOk = false;
  let crmOk = false;

  console.log('1. Telegram...');
  telegramOk = await telegramService.sendLead(testData);
  console.log(telegramOk ? '   ✅ Відправлено в Telegram' : '   ❌ Помилка Telegram (перевір TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID)');

  console.log('\n2. AstraCore CRM...');
  if (astracoreService.isConfigured()) {
    const result = await astracoreService.sendLead(testData);
    crmOk = result.success;
    console.log(crmOk ? '   ✅ Відправлено в CRM' : `   ❌ Помилка CRM: ${result.error || 'unknown'}`);
  } else {
    console.log('   ⚠️ CRM пропущено (немає ASTRACORE_TOKEN в .env)');
  }

  console.log('\n---');
  console.log(`Telegram: ${telegramOk ? 'OK' : 'FAIL'}`);
  console.log(`AstraCore CRM: ${astracoreService.isConfigured() ? (crmOk ? 'OK' : 'FAIL') : 'SKIP'}`);

  process.exit(telegramOk && (crmOk || !astracoreService.isConfigured()) ? 0 : 1);
}

main();
