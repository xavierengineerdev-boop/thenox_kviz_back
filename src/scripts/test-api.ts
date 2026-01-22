import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function testAPI() {
  console.log('🧪 Testing API endpoints...\n');
  console.log(`API URL: ${API_URL}\n`);

  try {
    // 1. Проверка health endpoint
    console.log('1️⃣ Testing /health endpoint...');
    try {
      const healthResponse = await axios.get(`${API_URL}/health`);
      console.log('✅ Health check passed');
      console.log(`   Response:`, healthResponse.data);
      console.log();
    } catch (error: any) {
      console.log('❌ Health check failed:', error.message);
      console.log();
    }

    // 2. Тест сохранения лида
    console.log('2️⃣ Testing POST /api/lead (first time)...');
    const testLead1 = {
      lead: {
        name: 'API Test User 1',
        phone: '+79991111111',
        email: 'apitest1@example.com',
        capital: 'up-to-200',
        motivation: 'extra-income',
        readiness: 'ready-now',
      },
      utmParams: {
        utm_source: 'api-test',
        utm_medium: 'test',
        utm_campaign: 'test-campaign',
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

    try {
      const leadResponse1 = await axios.post(`${API_URL}/api/lead`, testLead1);
      console.log('✅ Lead saved successfully!');
      console.log(`   Response:`, leadResponse1.data);
      console.log();
    } catch (error: any) {
      if (error.response) {
        console.log('❌ Failed to save lead');
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Response:`, error.response.data);
        console.log();
      } else {
        console.log('❌ Network error:', error.message);
        console.log();
      }
    }

    // 3. Тест дубликата
    console.log('3️⃣ Testing POST /api/lead (duplicate)...');
    try {
      const leadResponse2 = await axios.post(`${API_URL}/api/lead`, testLead1);
      console.log('❌ Duplicate was not detected!');
      console.log(`   Response:`, leadResponse2.data);
      console.log();
    } catch (error: any) {
      if (error.response && error.response.status === 409) {
        console.log('✅ Duplicate detection works correctly!');
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Response:`, error.response.data);
        console.log();
      } else {
        console.log('❌ Unexpected error:', error.message);
        if (error.response) {
          console.log(`   Status: ${error.response.status}`);
          console.log(`   Response:`, error.response.data);
        }
        console.log();
      }
    }

    // 4. Тест с другим телефоном
    console.log('4️⃣ Testing POST /api/lead (different phone)...');
    const testLead2 = {
      lead: {
        name: 'API Test User 2',
        phone: '+79992222222',
        email: 'apitest2@example.com',
        capital: '300-1000',
        motivation: 'crypto',
      },
      utmParams: {
        utm_source: 'google',
        utm_medium: 'cpc',
      },
      userData: {
        userAgent: 'Test Agent 2',
        language: 'en',
        platform: 'test',
        screenWidth: 1920,
        screenHeight: 1080,
        timezone: 'UTC',
        timestamp: new Date().toISOString(),
      },
    };

    try {
      const leadResponse3 = await axios.post(`${API_URL}/api/lead`, testLead2);
      console.log('✅ Second lead saved successfully!');
      console.log(`   Response:`, leadResponse3.data);
      console.log();
    } catch (error: any) {
      if (error.response) {
        console.log('❌ Failed to save second lead');
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Response:`, error.response.data);
        console.log();
      } else {
        console.log('❌ Network error:', error.message);
        console.log();
      }
    }

    // 5. Тест с невалидными данными
    console.log('5️⃣ Testing POST /api/lead (invalid data)...');
    const invalidLead = {
      lead: {
        name: 'Invalid User',
        // phone missing
      },
    };

    try {
      await axios.post(`${API_URL}/api/lead`, invalidLead);
      console.log('❌ Validation failed - invalid lead was accepted!');
      console.log();
    } catch (error: any) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Validation works correctly!');
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Response:`, error.response.data);
        console.log();
      } else {
        console.log('❌ Unexpected error:', error.message);
        console.log();
      }
    }

    console.log('✅ API tests completed!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testAPI();

