import { Injectable, Logger } from '@nestjs/common';
import { CreateKnowledgeItemDto } from '../dto/knowledge-item.dto';

interface ParsedRow {
  [key: string]: string;
}

/** Maps common source column names to KnowledgeItem fields */
const FIELD_MAP: Record<string, string> = {
  // → title
  title: 'title', name: 'title', subject: 'title', headline: 'title',
  heading: 'title', label: 'title', term: 'title', question: 'title',
  product_name: 'title', item_name: 'title', nom: 'title',

  // → content
  content: 'content', description: 'content', body: 'content',
  text: 'content', details: 'content', answer: 'content',
  information: 'content', info: 'content', data: 'content',
  full_description: 'content', long_description: 'content',

  // → summary
  summary: 'summary', excerpt: 'summary', abstract: 'summary',
  short_description: 'summary', brief: 'summary', overview: 'summary',
  tagline: 'summary', subtitle: 'summary',

  // → category
  category: 'category', type: 'category', kind: 'category',
  group: 'category', department: 'category', section: 'category',
  genre: 'category', topic: 'category', classification: 'category',

  // → tags
  tags: 'tags', keywords: 'keywords', labels: 'tags',
  tag: 'tags', keyword: 'tags',
};

@Injectable()
export class DataParserService {
  private readonly logger = new Logger(DataParserService.name);

  parse(
    raw: string,
    format: 'csv' | 'sql' | 'json' | 'auto' = 'auto',
    columnMap: Record<string, string> = {},
  ): { items: CreateKnowledgeItemDto[]; source: string; detected: string } {
    const detected = format === 'auto' ? this.detect(raw.trim()) : format;
    let rows: ParsedRow[] = [];

    if (detected === 'sql') rows = this.parseSQL(raw);
    else if (detected === 'json') rows = this.parseJSON(raw);
    else rows = this.parseCSV(raw);

    const merged = { ...FIELD_MAP, ...this.lowerKeys(columnMap) };
    const items = rows.map(r => this.mapRow(r, merged)).filter(i => i.title && i.content) as CreateKnowledgeItemDto[];

    return { items, source: detected, detected };
  }

  // ─── Format detection ─────────────────────────────────────────────────────

  private detect(raw: string): 'csv' | 'sql' | 'json' {
    if (/^\s*[\[{]/.test(raw)) return 'json';
    if (/INSERT\s+INTO\s+/i.test(raw)) return 'sql';
    return 'csv';
  }

  // ─── CSV parser ───────────────────────────────────────────────────────────

  parseCSV(raw: string): ParsedRow[] {
    const lines = raw.trim().split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = this.splitCSVLine(lines[0]).map(h => h.trim().toLowerCase());
    return lines.slice(1).map(line => {
      const cells = this.splitCSVLine(line);
      const row: ParsedRow = {};
      headers.forEach((h, i) => { row[h] = (cells[i] ?? '').trim(); });
      return row;
    }).filter(r => Object.values(r).some(v => v));
  }

  private splitCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current); current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }

  // ─── SQL INSERT parser ────────────────────────────────────────────────────

  parseSQL(raw: string): ParsedRow[] {
    const rows: ParsedRow[] = [];
    // Match: INSERT INTO `table` (col1, col2) VALUES (val1, val2), (val3, val4);
    const insertRe = /INSERT\s+INTO\s+(?:`[^`]+`|"[^"]+"|'[^']+'|\w+)\s*\(([^)]+)\)\s*VALUES\s*([\s\S]+?)(?:;|$)/gi;
    let match: RegExpExecArray | null;

    while ((match = insertRe.exec(raw)) !== null) {
      const rawCols = match[1];
      const rawVals = match[2];

      const columns = rawCols.split(',').map(c =>
        c.trim().replace(/^[`"']|[`"']$/g, '').toLowerCase()
      );

      // Extract all value tuples (handles multi-row inserts and multi-statement)
      const tupleRe = /\(([^)]*(?:'[^']*'[^)]*)*)\)/g;
      let tupleMatch: RegExpExecArray | null;
      while ((tupleMatch = tupleRe.exec(rawVals)) !== null) {
        const vals = this.splitSQLValues(tupleMatch[1]);
        if (vals.length === columns.length) {
          const row: ParsedRow = {};
          columns.forEach((col, i) => { row[col] = this.unquoteSQLValue(vals[i]); });
          rows.push(row);
        }
      }
    }

    return rows;
  }

  private splitSQLValues(valStr: string): string[] {
    const result: string[] = [];
    let current = '';
    let inStr = false;
    let strChar = '';
    for (let i = 0; i < valStr.length; i++) {
      const ch = valStr[i];
      if (!inStr && (ch === "'" || ch === '"')) { inStr = true; strChar = ch; current += ch; }
      else if (inStr && ch === strChar && valStr[i - 1] !== '\\') { inStr = false; current += ch; }
      else if (!inStr && ch === ',') { result.push(current.trim()); current = ''; }
      else { current += ch; }
    }
    result.push(current.trim());
    return result;
  }

  private unquoteSQLValue(val: string): string {
    const v = val.trim();
    if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) {
      return v.slice(1, -1).replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    if (v.toUpperCase() === 'NULL') return '';
    return v;
  }

  // ─── JSON parser ──────────────────────────────────────────────────────────

  parseJSON(raw: string): ParsedRow[] {
    try {
      const parsed = JSON.parse(raw.trim());
      let arr: Record<string, unknown>[];

      if (Array.isArray(parsed)) arr = parsed;
      else if (parsed.data && Array.isArray(parsed.data)) arr = parsed.data;
      else if (parsed.items && Array.isArray(parsed.items)) arr = parsed.items;
      else if (parsed.records && Array.isArray(parsed.records)) arr = parsed.records;
      else if (parsed.results && Array.isArray(parsed.results)) arr = parsed.results;
      else arr = [parsed];

      return arr.map(obj => {
        const row: ParsedRow = {};
        for (const [k, v] of Object.entries(obj)) {
          row[k.toLowerCase()] = typeof v === 'string' ? v : (v == null ? '' : JSON.stringify(v));
        }
        return row;
      });
    } catch (err) {
      this.logger.warn('JSON parse failed:', (err as Error).message);
      return [];
    }
  }

  // ─── Row → KnowledgeItem mapping ─────────────────────────────────────────

  private mapRow(row: ParsedRow, fieldMap: Record<string, string>): Partial<CreateKnowledgeItemDto> {
    const item: Partial<CreateKnowledgeItemDto> & { metadata: Record<string, unknown> } = {
      title: '', content: '', summary: '', category: 'general', tags: [], metadata: {},
    };
    const unmapped: Record<string, unknown> = {};

    for (const [col, val] of Object.entries(row)) {
      if (!val) continue;
      const target = fieldMap[col];
      if (target === 'title') item.title = val;
      else if (target === 'content') item.content = val;
      else if (target === 'summary') item.summary = val;
      else if (target === 'category') item.category = val;
      else if (target === 'tags') {
        item.tags = val.split(/[,;|]/).map(t => t.trim()).filter(Boolean);
      }
      else { unmapped[col] = val; }
    }

    // Fallback: if no title found, use first non-empty value
    if (!item.title) {
      const first = Object.values(row).find(v => v);
      item.title = first ?? '';
    }
    // Fallback: if no content, concatenate all remaining values
    if (!item.content) {
      item.content = Object.entries(row)
        .filter(([, v]) => v && v !== item.title)
        .map(([, v]) => v)
        .join(' | ');
    }

    if (Object.keys(unmapped).length) item.metadata = unmapped;
    return item;
  }

  private lowerKeys(obj: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj)) out[k.toLowerCase()] = v.toLowerCase();
    return out;
  }
}
