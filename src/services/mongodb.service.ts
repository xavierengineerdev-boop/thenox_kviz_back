import mongoose from 'mongoose';
import { logger } from '../utils/logger';
import { Lead, ILead } from '../models/Lead.model';
import { LeadData } from '../types/analytics.types';
import crypto from 'crypto';

class MongoDBService {
  private isConnected: boolean = false;

  /**
   * Подключение к MongoDB
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      logger.info('MongoDB already connected');
      return;
    }

    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/kviz';

    try {
      await mongoose.connect(mongoUri);
      this.isConnected = true;
      logger.info('MongoDB connected successfully', { uri: mongoUri.replace(/\/\/.*@/, '//***@') });
    } catch (error: any) {
      logger.error('MongoDB connection error', { error: error.message });
      throw error;
    }

    mongoose.connection.on('error', (error: Error) => {
      logger.error('MongoDB connection error', { error: error.message });
      this.isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      this.isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
      this.isConnected = true;
    });
  }

  /**
   * Отключение от MongoDB
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('MongoDB disconnected');
    } catch (error: any) {
      logger.error('Error disconnecting from MongoDB', { error: error.message });
    }
  }

  /**
   * Нормализация телефона (убираем пробелы, дефисы и т.д.)
   */
  private normalizePhone(phone: string): string {
    return phone.replace(/\s+/g, '').replace(/[-\+()]/g, '');
  }

  /**
   * Создание хеша телефона для проверки дубликатов
   */
  private createPhoneHash(phone: string): string {
    const normalized = this.normalizePhone(phone);
    return crypto.createHash('sha256').update(normalized.toLowerCase()).digest('hex');
  }

  /**
   * Проверка существования лида по телефону
   */
  async findLeadByPhone(phone: string): Promise<ILead | null> {
    try {
      const phoneHash = this.createPhoneHash(phone);
      const lead = await Lead.findOne({ phoneHash });
      return lead;
    } catch (error: any) {
      logger.error('Error finding lead by phone', { error: error.message, phone });
      return null;
    }
  }

  /**
   * Проверка существования заявки с IP за последние 24 часа
   */
  async findLeadByIP(ip: string): Promise<ILead | null> {
    try {
      if (!ip || ip === 'unknown') {
        return null;
      }

      // Вычисляем дату 24 часа назад
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);

      // Ищем заявку с этим IP за последние 24 часа
      const lead = await Lead.findOne({
        $or: [
          { 'userData.ip': ip },
          { 'userData.realIP': ip },
        ],
        createdAt: { $gte: oneDayAgo },
      }).sort({ createdAt: -1 });

      return lead;
    } catch (error: any) {
      logger.error('Error finding lead by IP', { error: error.message, ip });
      return null;
    }
  }

  /**
   * Сохранение лида в базу данных
   */
  async saveLead(
    leadData: LeadData,
    utmParams?: any,
    userData?: any,
  ): Promise<{ success: boolean; isDuplicate: boolean; isIPDuplicate?: boolean; lead?: ILead; error?: string }> {
    try {
      // Проверяем на дубликат по телефону
      const existingLeadByPhone = await this.findLeadByPhone(leadData.phone);

      if (existingLeadByPhone) {
        logger.info('Duplicate lead detected by phone', {
          phone: leadData.phone,
          existingLeadId: existingLeadByPhone._id,
          createdAt: existingLeadByPhone.createdAt,
        });
        return {
          success: false,
          isDuplicate: true,
          isIPDuplicate: false,
          lead: existingLeadByPhone,
        };
      }

      // Проверяем на дубликат по IP (одна заявка в день с одного IP)
      // Проверяем оба IP адреса, если они есть
      const ip = userData?.ip;
      const realIP = userData?.realIP;
      
      // Проверяем основной IP
      if (ip && ip !== 'unknown') {
        const existingLeadByIP = await this.findLeadByIP(ip);
        
        if (existingLeadByIP) {
          logger.info('Duplicate lead detected by IP (one request per day limit)', {
            ip,
            phone: leadData.phone,
            existingLeadId: existingLeadByIP._id,
            createdAt: existingLeadByIP.createdAt,
          });
          return {
            success: false,
            isDuplicate: false,
            isIPDuplicate: true,
            lead: existingLeadByIP,
          };
        }
      }
      
      // Проверяем realIP, если он отличается от основного IP
      if (realIP && realIP !== 'unknown' && realIP !== ip) {
        const existingLeadByRealIP = await this.findLeadByIP(realIP);
        
        if (existingLeadByRealIP) {
          logger.info('Duplicate lead detected by realIP (one request per day limit)', {
            realIP,
            phone: leadData.phone,
            existingLeadId: existingLeadByRealIP._id,
            createdAt: existingLeadByRealIP.createdAt,
          });
          return {
            success: false,
            isDuplicate: false,
            isIPDuplicate: true,
            lead: existingLeadByRealIP,
          };
        }
      }

      // Создаем новый лид
      const phoneHash = this.createPhoneHash(leadData.phone);
      
      // Извлекаем дополнительные поля (все кроме name, phone, email)
      const { name, phone, email, ...additionalFields } = leadData;
      
      const newLead = new Lead({
        lead: {
          name: leadData.name,
          phone: leadData.phone,
          email: leadData.email,
        },
        leadData: Object.keys(additionalFields).length > 0 ? additionalFields : undefined,
        utmParams: utmParams || {},
        userData: userData || {},
        phoneHash,
      });

      const savedLead = await newLead.save();
      logger.info('Lead saved to MongoDB', {
        leadId: savedLead._id,
        phone: leadData.phone,
        name: leadData.name,
      });

      return {
        success: true,
        isDuplicate: false,
        isIPDuplicate: false,
        lead: savedLead,
      };
    } catch (error: any) {
      logger.error('Error saving lead to MongoDB', {
        error: error.message,
        phone: leadData.phone,
        stack: error.stack,
      });

      // Если ошибка из-за дубликата (unique index)
      if (error.code === 11000) {
        const existingLead = await this.findLeadByPhone(leadData.phone);
        return {
          success: false,
          isDuplicate: true,
          isIPDuplicate: false,
          lead: existingLead || undefined,
        };
      }

      return {
        success: false,
        isDuplicate: false,
        isIPDuplicate: false,
        error: error.message,
      };
    }
  }

  /**
   * Получение всех лидов
   */
  async getAllLeads(limit: number = 100, skip: number = 0): Promise<ILead[]> {
    try {
      const leads = await Lead.find().sort({ createdAt: -1 }).limit(limit).skip(skip);
      return leads;
    } catch (error: any) {
      logger.error('Error getting leads from MongoDB', { error: error.message });
      return [];
    }
  }

  /**
   * Получение количества лидов
   */
  async getLeadsCount(): Promise<number> {
    try {
      const count = await Lead.countDocuments();
      return count;
    } catch (error: any) {
      logger.error('Error getting leads count from MongoDB', { error: error.message });
      return 0;
    }
  }

  /**
   * Проверка подключения
   */
  isMongoConnected(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }
}

export default new MongoDBService();

