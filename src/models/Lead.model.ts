import mongoose, { Schema, Document } from 'mongoose';
import { UTMParams, UserData, LeadData } from '../types/analytics.types';

export interface ILead extends Document {
  lead: {
    name: string;
    phone: string;
    email?: string;
  };
  leadData?: Record<string, any>; // Дополнительные поля из lead
  utmParams?: UTMParams;
  userData?: UserData;
  phoneHash: string; // Хеш телефона для проверки дубликатов
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema: Schema = new Schema(
  {
    lead: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String },
    },
    utmParams: {
      utm_source: { type: String },
      utm_medium: { type: String },
      utm_campaign: { type: String },
      utm_term: { type: String },
      utm_content: { type: String },
      utm_id: { type: String },
      utm_source_platform: { type: String },
      gclid: { type: String },
      fbclid: { type: String },
      msclkid: { type: String },
      ttclid: { type: String },
      yclid: { type: String },
      gbraid: { type: String },
      wbraid: { type: String },
      _ga: { type: String },
      mc_eid: { type: String },
    },
    userData: {
      userAgent: { type: String },
      language: { type: String },
      platform: { type: String },
      screenWidth: { type: Number },
      screenHeight: { type: Number },
      timezone: { type: String },
      timestamp: { type: String },
      ip: { type: String },
      realIP: { type: String },
    },
    phoneHash: { type: String, required: true, unique: true },
    // Дополнительные поля из lead сохраняются в leadData
    leadData: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  },
);

// Создаем индексы для быстрого поиска дубликатов
LeadSchema.index({ phoneHash: 1 });
LeadSchema.index({ 'lead.phone': 1 });
// Индекс для проверки IP с учетом даты создания (для проверки одной заявки в день)
LeadSchema.index({ 'userData.ip': 1, createdAt: -1 });
LeadSchema.index({ 'userData.realIP': 1, createdAt: -1 });

export const Lead = mongoose.model<ILead>('Lead', LeadSchema);

