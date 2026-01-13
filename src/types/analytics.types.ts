export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

export interface UserData {
  userAgent: string;
  language: string;
  platform: string;
  screenWidth?: number;
  screenHeight?: number;
  timezone: string;
  timestamp: string;
  ip?: string;
}

export interface AnalyticsEvent {
  event: string;
  userData: UserData;
  utmParams: UTMParams;
  pageUrl: string;
  referrer: string;
  data?: Record<string, any>;
}

export interface LeadData {
  name: string;
  phone: string;
  email?: string;
  [key: string]: any;
}
