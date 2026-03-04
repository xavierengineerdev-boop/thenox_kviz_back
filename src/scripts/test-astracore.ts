/**
 * Тест підключення до AstraCore CRM та відправки тестового лида.
 * Запуск: npm run test:astracore
 * Перед запуском в .env задай ASTRACORE_TOKEN (токен з ЛК https://astracore.dev/)
 */
import dotenv from 'dotenv';
import astracoreService from '../services/astracore.service';

dotenv.config();

async function main() {
  console.log('AstraCore CRM — тест підключення та відправки лида\n');

  const connection = await astracoreService.testConnection();
  console.log('1. Перевірка підключення:', connection.ok ? '✅' : '❌', connection.message);

  if (!astracoreService.isConfigured()) {
    console.log('\nДодай ASTRACORE_SITE_ID та ASTRACORE_TOKEN в .env (Site ID з виджету: api/sites/{siteId}/widget.js).');
    process.exit(1);
  }

  const testLead = {
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
      gclid: 'test-gclid',
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

  console.log('\n2. Відправка тестового лида...');
  const result = await astracoreService.sendLead(testLead);
  console.log(result.success ? '✅ Лид відправлено в CRM' : '❌ Помилка:', result.error || 'unknown');

  process.exit(result.success ? 0 : 1);
}

main();
