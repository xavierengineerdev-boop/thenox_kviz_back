import axios from 'axios';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

export interface TelegramMessageData {
  lead?: {
    name: string;
    phone: string;
    email?: string;
    [key: string]: any;
  };
  utmParams?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_term?: string;
    utm_content?: string;
    utm_id?: string;
    utm_source_platform?: string;
    gclid?: string;
    fbclid?: string;
    msclkid?: string;
    ttclid?: string;
    yclid?: string;
    gbraid?: string;
    wbraid?: string;
    _ga?: string;
    mc_eid?: string;
    [key: string]: any;
  };
  userData?: {
    userAgent: string;
    language: string;
    platform: string;
    ip?: string;
    realIP?: string;
    referrer?: string;
    screenWidth?: number;
    screenHeight?: number;
    timezone?: string;
    timestamp?: string;
    [key: string]: any;
  };
}

class TelegramService {
  private botToken: string;
  private chatId: string;

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    this.chatId = process.env.TELEGRAM_CHAT_ID || '';
  }

  private escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private getReadableValue(key: string, value: string): string {
    const mappings: { [key: string]: { [value: string]: string } } = {
      capital: {
        'up-to-200': 'До $200',
        '300-1000': 'От $300 до $1000',
        'over-1000': 'От $1000 и больше',
      },
      motivation: {
        'extra-income': 'Хочу дополнительный доход',
        'change-job': 'Хочу сменить основную работу',
        crypto: 'Хочу увеличить капитал и войти в крипторынок',
        scale: 'Уже зарабатываю, хочу масштабировать',
      },
      readiness: {
        'ready-now': 'Готов(а) сразу после общения',
        'ready-week': 'Готов стартовать на неделе',
        'need-details': 'Сначала хочу разобраться подробнее',
        'not-sure': 'Не уверен(а), просто интересно',
      },
    };

    const fieldNames: { [key: string]: string } = {
      capital: 'Капитал для начала',
      motivation: 'Мотивация',
      readiness: 'Готовность к старту',
    };

    return mappings[key]?.[value] || value;
  }

  private getFieldName(key: string): string {
    const fieldNames: { [key: string]: string } = {
      capital: 'Капитал для начала',
      motivation: 'Мотивация',
      readiness: 'Готовность к старту',
    };
    return fieldNames[key] || key;
  }

  private formatMessage(data: TelegramMessageData): string {
    let message = '🎯 Новый лид из квиза!\n\n';

    if (data.lead) {
      message += '👤 Контактные данные:\n';
      message += `• Имя: ${this.escapeHtml(data.lead.name)}\n`;
      // Форматируем телефон для лучшей читаемости
      const phone = data.lead.phone || '';
      let formattedPhone = phone;
      
      // Убираем все пробелы и форматируем заново
      const cleanPhone = phone.replace(/\s/g, '');
      
      // Пытаемся красиво отформатировать телефон в зависимости от длины
      if (cleanPhone.length >= 10) {
        // Формат для большинства стран: +41 12 345 67 89
        const match = cleanPhone.match(/^(\+\d{1,4})(\d{2,3})(\d{3})(\d{2})(\d{2})$/);
        if (match) {
          formattedPhone = `${match[1]} ${match[2]} ${match[3]} ${match[4]} ${match[5]}`;
        } else {
          // Альтернативный формат: +7 912 345 67 89
          const altMatch = cleanPhone.match(/^(\+\d{1,4})(\d{3})(\d{3})(\d{2})(\d{2})$/);
          if (altMatch) {
            formattedPhone = `${altMatch[1]} ${altMatch[2]} ${altMatch[3]} ${altMatch[4]} ${altMatch[5]}`;
          } else {
            // Если не подходит под стандартные форматы, просто добавляем пробелы каждые 3 цифры после кода
            const codeMatch = cleanPhone.match(/^(\+\d{1,4})(.+)$/);
            if (codeMatch) {
              const number = codeMatch[2];
              const formattedNumber = number.match(/.{1,3}/g)?.join(' ') || number;
              formattedPhone = `${codeMatch[1]} ${formattedNumber}`;
            }
          }
        }
      }
      
      message += `• Телефон: ${formattedPhone}\n`;
      if (data.lead.email) {
        message += `• Email: ${this.escapeHtml(data.lead.email)}\n`;
      }

      const excludeFields = ['name', 'phone', 'email'];
      const additionalFields = Object.keys(data.lead).filter((key) => !excludeFields.includes(key));

      if (additionalFields.length > 0) {
        message += '\n📋 Ответы на вопросы:\n';
        additionalFields.forEach((key) => {
          const fieldName = this.getFieldName(key);
          const readableValue = this.getReadableValue(key, String(data.lead![key]));
          message += `• ${fieldName}: ${readableValue}\n`;
        });
      }
    }

    if (
      data.utmParams &&
      Object.keys(data.utmParams).some((key) => data.utmParams![key as keyof typeof data.utmParams])
    ) {
      message += '\n📊 UTM-метки:\n';
      if (data.utmParams.utm_source) message += `• Source: ${data.utmParams.utm_source}\n`;
      if (data.utmParams.utm_medium) message += `• Medium: ${data.utmParams.utm_medium}\n`;
      if (data.utmParams.utm_campaign) message += `• Campaign: ${data.utmParams.utm_campaign}\n`;
      if (data.utmParams.utm_term) message += `• Term: ${data.utmParams.utm_term}\n`;
      if (data.utmParams.utm_content) message += `• Content: ${data.utmParams.utm_content}\n`;
      if (data.utmParams.utm_id) message += `• UTM ID: ${data.utmParams.utm_id}\n`;
      if (data.utmParams.utm_source_platform)
        message += `• Source Platform: ${data.utmParams.utm_source_platform}\n`;
      if (data.utmParams.gclid) message += `• Google Click ID: ${data.utmParams.gclid}\n`;
      if (data.utmParams.fbclid) message += `• Facebook Click ID: ${data.utmParams.fbclid}\n`;
      if (data.utmParams.msclkid) message += `• Microsoft Click ID: ${data.utmParams.msclkid}\n`;
      if (data.utmParams.ttclid) message += `• TikTok Click ID: ${data.utmParams.ttclid}\n`;
      if (data.utmParams.yclid) message += `• Yandex Click ID: ${data.utmParams.yclid}\n`;
      if (data.utmParams.gbraid) message += `• Google Brand ID: ${data.utmParams.gbraid}\n`;
      if (data.utmParams.wbraid) message += `• Web Brand ID: ${data.utmParams.wbraid}\n`;
      if (data.utmParams._ga) message += `• Google Analytics: ${data.utmParams._ga}\n`;
      if (data.utmParams.mc_eid) message += `• Mailchimp ID: ${data.utmParams.mc_eid}\n`;
    }

    if (data.userData) {
      message += '\n💻 Информация о пользователе:\n';
      if (data.userData.realIP) message += `• Реальный IP: ${data.userData.realIP}\n`;
      if (data.userData.ip && data.userData.ip !== data.userData.realIP)
        message += `• Локальный IP: ${data.userData.ip}\n`;
      if (data.userData.language) message += `• Язык: ${data.userData.language}\n`;
      if (data.userData.platform) message += `• Платформа: ${data.userData.platform}\n`;
      if (data.userData.screenWidth && data.userData.screenHeight)
        message += `• Разрешение: ${data.userData.screenWidth}x${data.userData.screenHeight}\n`;
      if (data.userData.timezone) message += `• Часовой пояс: ${data.userData.timezone}\n`;
      if (data.userData.userAgent) message += `• User Agent: ${data.userData.userAgent}\n`;
      if (data.userData.referrer) message += `• Referrer: ${data.userData.referrer}\n`;
      if (data.userData.timestamp) message += `• Время: ${data.userData.timestamp}\n`;
    }

    return message;
  }

  async sendLead(data: TelegramMessageData): Promise<boolean> {
    if (!this.botToken || !this.chatId) {
      logger.warn('Telegram bot token or chat ID not configured', {
        hasToken: !!this.botToken,
        hasChatId: !!this.chatId,
      });
      return false;
    }

    try {
      const message = this.formatMessage(data);
      logger.info('Attempting to send lead to Telegram', {
        chatId: this.chatId,
        messageLength: message.length,
        hasLead: !!data.lead,
      });

      const response = await axios.post(
        `https://api.telegram.org/bot${this.botToken}/sendMessage`,
        {
          chat_id: this.chatId,
          text: message,
        },
      );

      if (response.data.ok) {
        logger.info('Lead sent to Telegram successfully', {
          messageId: response.data.result?.message_id,
        });
        return true;
      } else {
        logger.error('Failed to send lead to Telegram', {
          response: response.data,
          errorCode: response.data.error_code,
          description: response.data.description,
        });
        return false;
      }
    } catch (error: any) {
      logger.error('Error sending message to Telegram', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack,
      });
      return false;
    }
  }

  async sendCustomMessage(message: string): Promise<boolean> {
    if (!this.botToken || !this.chatId) {
      logger.warn('Telegram bot token or chat ID not configured');
      return false;
    }

    try {
      const response = await axios.post(
        `https://api.telegram.org/bot${this.botToken}/sendMessage`,
        {
          chat_id: this.chatId,
          text: message,
          parse_mode: 'HTML',
        },
      );

      return response.data.ok;
    } catch (error) {
      logger.error('Error sending custom message to Telegram', { error });
      return false;
    }
  }
}

export default new TelegramService();
