import axios, { AxiosError } from 'axios';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';
import type { TelegramMessageData } from './telegram.service';

dotenv.config();

const ASTRACORE_API_URL = process.env.ASTRACORE_API_URL || 'https://api.astracore.dev';
const ASTRACORE_TOKEN = process.env.ASTRACORE_TOKEN || '';
const ASTRACORE_SITE_ID = process.env.ASTRACORE_SITE_ID || '';

/**
 * Сервис для отправки лидов в CRM AstraCore (https://astracore.dev/).
 * Site ID берётся из скрипта виджета: api/sites/{siteId}/widget.js
 * Токен создаётся в ЛК CRM (ASTRACORE_TOKEN).
 */
class AstraCoreService {
  private baseUrl: string;
  private token: string;
  private siteId: string;

  constructor() {
    this.baseUrl = ASTRACORE_API_URL.replace(/\/$/, '');
    this.token = ASTRACORE_TOKEN;
    this.siteId = ASTRACORE_SITE_ID;
  }

  isConfigured(): boolean {
    return !!this.token;
  }

  /**
   * Формирует тело запроса в формате виджета AstraCore:
   * POST /api/leads/from-site — token в body, sourceMeta только разрешённые API поля
   * (как в widget meta(): screen, language, platform, timezone, referrer).
   * UTM и прочее уходят в additionalInfo.
   */
  private buildLeadPayload(data: TelegramMessageData): Record<string, unknown> {
    const { name = '', phone = '', email = '', ...restLead } = data.lead || {};
    const ud: Record<string, unknown> = data.userData || {};
    const utm = data.utmParams || {};
    const screen =
      ud.screenWidth != null && ud.screenHeight != null
        ? `${ud.screenWidth}x${ud.screenHeight}`
        : undefined;
    const sourceMeta: Record<string, unknown> = {};
    if (screen) sourceMeta.screen = screen;
    if (ud.language) sourceMeta.language = ud.language;
    if (ud.platform) sourceMeta.platform = ud.platform;
    if (ud.timezone) sourceMeta.timezone = ud.timezone;
    if (ud.referrer) sourceMeta.referrer = ud.referrer;
    if (ud.deviceMemory != null) sourceMeta.deviceMemory = String(ud.deviceMemory);
    if (ud.hardwareConcurrency != null) sourceMeta.hardwareConcurrency = String(ud.hardwareConcurrency);

    const extra: Record<string, unknown> = { ...restLead };
    if (Object.keys(utm).length) extra.utmParams = utm;
    if (ud.userAgent) extra.userAgent = ud.userAgent;
    if (ud.ip || ud.realIP) extra.ip = ud.ip || ud.realIP;
    const additionalInfoStr = Object.keys(extra).length ? JSON.stringify(extra) : '';

    return {
      token: this.token,
      name: name.trim(),
      phone: String(phone || '').trim(),
      email: String(email || '').trim(),
      additionalInfo: additionalInfoStr,
      sourceMeta,
    };
  }

  /**
   * Отправляет лид в AstraCore CRM в том же формате, что и виджет (from-site).
   * Эндпоинт из widget.js: POST /api/leads/from-site, токен в теле запроса.
   */
  async sendLead(data: TelegramMessageData): Promise<{ success: boolean; error?: string }> {
    if (!this.token) {
      logger.warn('AstraCore: ASTRACORE_TOKEN not set, skipping CRM send');
      return { success: false, error: 'ASTRACORE_TOKEN not configured' };
    }

    const payload = this.buildLeadPayload(data);
    const url = `${this.baseUrl}/api/leads/from-site`;

    try {
      const response = await axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000,
      });

      logger.info('AstraCore: lead sent successfully', {
        status: response.status,
        leadName: data.lead?.name,
      });
      return { success: true };
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string; detail?: string }>;
      const status = axiosError.response?.status;
      const body = axiosError.response?.data;
      const message = body?.message || body?.detail || axiosError.message;

      logger.error('AstraCore: failed to send lead', {
        status,
        message,
        response: body,
      });
      return { success: false, error: String(message) };
    }
  }

  /**
   * Тестовый запрос: проверка подключения (например GET /api/me или /api/health).
   */
  async testConnection(): Promise<{ ok: boolean; message: string }> {
    if (!this.token) {
      return { ok: false, message: 'ASTRACORE_TOKEN not set' };
    }

    const endpointsToTry = [
      `${this.baseUrl}/api/me`,
      `${this.baseUrl}/api/health`,
      `${this.baseUrl}/api/v1/me`,
      `${this.baseUrl}/`,
    ];

    for (const url of endpointsToTry) {
      try {
        const response = await axios.get(url, {
          headers: { Authorization: `Bearer ${this.token}` },
          timeout: 5000,
          validateStatus: () => true,
        });
        if (response.status >= 200 && response.status < 400) {
          return {
            ok: true,
            message: `Connected to ${url}, status: ${response.status}`,
          };
        }
      } catch {
        continue;
      }
    }

    return {
      ok: false,
      message: `Could not reach AstraCore API at ${this.baseUrl}. Check ASTRACORE_API_URL and token. See https://api.astracore.dev/docs`,
    };
  }
}

export default new AstraCoreService();
