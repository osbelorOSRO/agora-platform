export interface ReportResult {
  format: 'json' | 'csv';
  filename: string;
  rows: Record<string, any>[];
}

export function parseDate(value: any): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function csvEscape(value: any): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return `"${serialized.replace(/"/g, '""')}"`;
}

export function rowsToCsv(rows: Record<string, any>[]): string {
  if (rows.length === 0) return '';
  const headers = [
    ...rows.reduce<Set<string>>((set, row) => {
      Object.keys(row).forEach((k) => set.add(k));
      return set;
    }, new Set<string>()),
  ];
  return [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => csvEscape(row[h])).join(',')),
  ].join('\n');
}

export function formatReportResponse(result: ReportResult): {
  headers?: Record<string, string>;
  body: any;
} {
  if (result.format === 'csv') {
    return {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${result.filename}.csv"`,
      },
      body: rowsToCsv(result.rows),
    };
  }
  return { body: { report: result.filename, total: result.rows.length, rows: result.rows } };
}
