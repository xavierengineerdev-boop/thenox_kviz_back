import dotenv from 'dotenv';
import mongodbService from '../services/mongodb.service';
import { logger } from '../utils/logger';

dotenv.config();

async function testMongoDB() {
  console.log('🧪 Testing MongoDB connection and lead saving...\n');

  try {
    // 1. Подключение к MongoDB
    console.log('1️⃣ Connecting to MongoDB...');
    await mongodbService.connect();
    console.log('✅ MongoDB connected successfully!\n');

    // 2. Тест сохранения первого лида
    console.log('2️⃣ Testing lead save (first time)...');
    const testLead1 = {
      name: 'Test User 1',
      phone: '+79991234567',
      email: 'test1@example.com',
      capital: 'up-to-200',
      motivation: 'extra-income',
      readiness: 'ready-now',
    };

    const result1 = await mongodbService.saveLead(
      testLead1,
      {
        utm_source: 'test',
        utm_medium: 'test',
        utm_campaign: 'test-campaign',
      },
      {
        userAgent: 'Test Agent',
        language: 'ru',
        platform: 'test',
        screenWidth: 1920,
        screenHeight: 1080,
        timezone: 'Europe/Moscow',
        timestamp: new Date().toISOString(),
        ip: '127.0.0.1',
      },
    );

    if (result1.success && !result1.isDuplicate) {
      console.log('✅ Lead saved successfully!');
      console.log(`   Lead ID: ${result1.lead?._id}`);
      console.log(`   Name: ${testLead1.name}`);
      console.log(`   Phone: ${testLead1.phone}\n`);
    } else {
      console.log('❌ Failed to save lead');
      console.log(`   Error: ${result1.error || 'Unknown error'}\n`);
    }

    // 3. Тест дубликата
    console.log('3️⃣ Testing duplicate detection...');
    const result2 = await mongodbService.saveLead(
      testLead1, // Тот же телефон
      {
        utm_source: 'test2',
      },
      {
        userAgent: 'Test Agent 2',
        language: 'en',
        platform: 'test2',
        screenWidth: 1920,
        screenHeight: 1080,
        timezone: 'UTC',
        timestamp: new Date().toISOString(),
      },
    );

    if (result2.isDuplicate) {
      console.log('✅ Duplicate detection works correctly!');
      console.log(`   Existing lead ID: ${result2.lead?._id}`);
      console.log(`   Created at: ${result2.lead?.createdAt}\n`);
    } else {
      console.log('❌ Duplicate detection failed - lead was saved again!\n');
    }

    // 4. Тест с другим телефоном
    console.log('4️⃣ Testing save with different phone...');
    const testLead2 = {
      name: 'Test User 2',
      phone: '+79997654321',
      email: 'test2@example.com',
      capital: '300-1000',
      motivation: 'crypto',
    };

    const result3 = await mongodbService.saveLead(
      testLead2,
      {
        utm_source: 'google',
        utm_medium: 'cpc',
      },
      {
        userAgent: 'Test Agent 3',
        language: 'ru',
        platform: 'test',
        screenWidth: 1920,
        screenHeight: 1080,
        timezone: 'Europe/Moscow',
        timestamp: new Date().toISOString(),
      },
    );

    if (result3.success && !result3.isDuplicate) {
      console.log('✅ Second lead saved successfully!');
      console.log(`   Lead ID: ${result3.lead?._id}`);
      console.log(`   Name: ${testLead2.name}`);
      console.log(`   Phone: ${testLead2.phone}\n`);
    } else {
      console.log('❌ Failed to save second lead');
      console.log(`   Error: ${result3.error || 'Unknown error'}\n`);
    }

    // 5. Получение статистики
    console.log('5️⃣ Getting leads count...');
    const count = await mongodbService.getLeadsCount();
    console.log(`✅ Total leads in database: ${count}\n`);

    // 6. Получение последних лидов
    console.log('6️⃣ Getting recent leads...');
    const leads = await mongodbService.getAllLeads(5);
    console.log(`✅ Retrieved ${leads.length} leads:`);
    leads.forEach((lead, index) => {
      console.log(`   ${index + 1}. ${lead.lead.name} - ${lead.lead.phone} (${lead.createdAt})`);
    });

    console.log('\n✅ All tests completed successfully!');
    await mongodbService.disconnect();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    await mongodbService.disconnect();
    process.exit(1);
  }
}

testMongoDB();

