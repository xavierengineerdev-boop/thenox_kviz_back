import { createObjectCsvWriter } from 'csv-writer';
import fs from 'fs';
import path from 'path';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  event?: string;
  lead?: any;
  utmParams?: any;
  userData?: any;
  [key: string]: any;
}

class LogExporter {
  private logsDir: string;

  constructor(logsDir: string = 'logs') {
    this.logsDir = logsDir;
  }

  private readLogs(filename: string): LogEntry[] {
    const filepath = path.join(this.logsDir, filename);

    if (!fs.existsSync(filepath)) {
      return [];
    }

    const content = fs.readFileSync(filepath, 'utf-8');
    const lines = content.split('\n').filter((line) => line.trim());

    return lines
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter((entry) => entry !== null) as LogEntry[];
  }

  private getAnalyticsLogFiles(): string[] {
    if (!fs.existsSync(this.logsDir)) {
      return [];
    }

    return fs
      .readdirSync(this.logsDir)
      .filter((file) => file.includes('analytics.log') && !file.endsWith('.gz'))
      .sort()
      .reverse();
  }

  async exportLeadsToCSV(outputFile: string = 'leads.csv'): Promise<void> {
    const logFiles = this.getAnalyticsLogFiles();
    const leads: any[] = [];

    for (const file of logFiles) {
      const logs = this.readLogs(file);
      const leadLogs = logs.filter((log) => log.event === 'lead_created');

      leadLogs.forEach((log) => {
        leads.push({
          timestamp: log.timestamp,
          name: log.lead?.name || '',
          phone: log.lead?.phone || '',
          email: log.lead?.email || '',
          utm_source: log.utmParams?.utm_source || '',
          utm_medium: log.utmParams?.utm_medium || '',
          utm_campaign: log.utmParams?.utm_campaign || '',
          ip: log.userData?.ip || '',
          platform: log.userData?.platform || '',
          language: log.userData?.language || '',
          ...log.lead,
        });
      });
    }

    if (leads.length === 0) {
      console.log('No leads found');
      return;
    }

    const headers = Object.keys(leads[0]).map((key) => ({
      id: key,
      title: key.toUpperCase(),
    }));

    const csvWriter = createObjectCsvWriter({
      path: outputFile,
      header: headers,
    });

    await csvWriter.writeRecords(leads);
    console.log(`Exported ${leads.length} leads to ${outputFile}`);
  }

  getEventStats(): { [event: string]: number } {
    const logFiles = this.getAnalyticsLogFiles();
    const stats: { [event: string]: number } = {};

    for (const file of logFiles) {
      const logs = this.readLogs(file);

      logs.forEach((log) => {
        if (log.event) {
          stats[log.event] = (stats[log.event] || 0) + 1;
        }
      });
    }

    return stats;
  }

  getUTMStats(): any {
    const logFiles = this.getAnalyticsLogFiles();
    const stats = {
      sources: {} as { [key: string]: number },
      mediums: {} as { [key: string]: number },
      campaigns: {} as { [key: string]: number },
    };

    for (const file of logFiles) {
      const logs = this.readLogs(file);

      logs.forEach((log) => {
        if (log.utmParams) {
          if (log.utmParams.utm_source) {
            stats.sources[log.utmParams.utm_source] =
              (stats.sources[log.utmParams.utm_source] || 0) + 1;
          }
          if (log.utmParams.utm_medium) {
            stats.mediums[log.utmParams.utm_medium] =
              (stats.mediums[log.utmParams.utm_medium] || 0) + 1;
          }
          if (log.utmParams.utm_campaign) {
            stats.campaigns[log.utmParams.utm_campaign] =
              (stats.campaigns[log.utmParams.utm_campaign] || 0) + 1;
          }
        }
      });
    }

    return stats;
  }

  exportStats(outputFile: string = 'stats.json'): void {
    const stats = {
      events: this.getEventStats(),
      utm: this.getUTMStats(),
      exportedAt: new Date().toISOString(),
    };

    fs.writeFileSync(outputFile, JSON.stringify(stats, null, 2));
    console.log(`Exported statistics to ${outputFile}`);
  }
}

if (require.main === module) {
  const exporter = new LogExporter();
  const command = process.argv[2];

  switch (command) {
    case 'leads':
      exporter.exportLeadsToCSV().catch(console.error);
      break;

    case 'stats':
      exporter.exportStats();
      console.log('\nEvent Statistics:');
      console.table(exporter.getEventStats());
      console.log('\nUTM Statistics:');
      console.log(exporter.getUTMStats());
      break;

    default:
      console.log(`
Usage:
  ts-node src/scripts/export-logs.ts leads  - Export leads to CSV
  ts-node src/scripts/export-logs.ts stats  - Show statistics
      `);
  }
}

export default LogExporter;
