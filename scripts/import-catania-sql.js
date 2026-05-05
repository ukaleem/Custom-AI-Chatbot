#!/usr/bin/env node
/**
 * Catania City Pass SQL Import Script
 * Parses attrazioni + attivita_commerciali tables and imports into Knowledge Base.
 *
 * Usage:  node scripts/import-catania-sql.js [file.sql]
 *         cat file.sql | node scripts/import-catania-sql.js
 */

const http  = require('http');
const fs    = require('fs');
const rl    = require('readline');

const API   = process.env.API_URL      || 'http://localhost:3000/api/v1';
const SLUG  = process.env.TENANT_SLUG  || 'catania-city-pass';
const PASS  = process.env.ADMIN_PASS   || '12345678';

// ─── Encoding fix ─────────────────────────────────────────────────────────────
function fixEncoding(s) {
  if (!s) return '';
  // Buffer trick: interpret string as latin1 bytes, then decode as utf8
  try {
    return Buffer.from(s, 'latin1').toString('utf8');
  } catch {
    return s;
  }
}

// ─── Strip HTML ───────────────────────────────────────────────────────────────
function stripHtml(h) {
  return (h || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

// ─── Category codes → English ─────────────────────────────────────────────────
const CATS = {
  '001':'culture','002':'culture','003':'culture','004':'city-tour',
  '005':'entertainment','006':'shopping','007':'food','008':'transport',
  '009':'nature','010':'healthcare','011':'safety','012':'children',
  '044':'children','045':'culture','051':'culture','052':'entertainment',
  '053':'food','054':'culture','055':'shopping',
};
function cat(codes) {
  if (!codes) return 'culture';
  for (const c of codes.split('|')) { const v = CATS[c.trim()]; if (v) return v; }
  return 'culture';
}

// ─── Parse a VALUES block into row arrays ─────────────────────────────────────
function parseRows(valStr) {
  const rows = []; let buf = '', depth = 0, inStr = false, q = '';
  for (let i = 0; i < valStr.length; i++) {
    const ch = valStr[i];
    if (!inStr) {
      if (ch === "'" || ch === '"') { inStr = true; q = ch; }
      else if (ch === '(') { if (depth++ === 0) buf = ''; else buf += ch; }
      else if (ch === ')') { if (--depth === 0) { rows.push(splitRow(buf)); buf = ''; } else buf += ch; }
      else if (depth > 0) buf += ch;
    } else {
      if (ch === q && valStr[i-1] !== '\\') inStr = false;
      else if (ch === '\\' && (valStr[i+1] === q || valStr[i+1] === '\\')) { buf += valStr[++i]; }
      else buf += ch;
    }
  }
  return rows;
}

function splitRow(row) {
  const vals = []; let cur = '', inStr = false, q = '';
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (!inStr) {
      if (ch === "'" || ch === '"') { inStr = true; q = ch; }
      else if (ch === ',') { vals.push(cur.trim()); cur = ''; }
      else cur += ch;
    } else {
      if (ch === q && row[i-1] !== '\\') inStr = false;
      else if (ch === '\\' && (row[i+1] === q || row[i+1] === '\\')) { cur += row[++i]; }
      else cur += ch;
    }
  }
  vals.push(cur.trim());
  return vals;
}

// ─── Parse SQL dump ────────────────────────────────────────────────────────────
function parseSql(sql) {
  const attrazioni = [], businesses = [];

  // Parse attrazioni table
  const attBlocks = [...sql.matchAll(/INSERT INTO [`"]?attrazioni[`"]?\s+\(([^)]+)\)\s+VALUES([\s\S]+?);(?=\s*\n|$)/gim)];
  for (const m of attBlocks) {
    const cols = m[1].split(',').map(c => c.trim().replace(/[`"]/g, ''));
    for (const row of parseRows(m[2])) {
      const o = {}; cols.forEach((c, i) => o[c] = row[i] || '');
      if (o.flag_cancellato === '1') continue;
      const title   = fixEncoding(o.titolo || '').trim();
      const content = stripHtml(fixEncoding(o.descrizione || ''));
      if (!title || content.length < 10) continue;

      attrazioni.push({
        title,
        content,
        summary: content.split('\n')[0].slice(0, 200).trim(),
        category: cat(o.categorie),
        tags: [
          'catania', 'sicily', 'city-pass',
          ...(o.flag_glutenfree === '1' ? ['gluten-free'] : []),
          ...(o.flag_vegana === '1' ? ['vegan'] : []),
          ...(o.flag_vegetariana === '1' ? ['vegetarian'] : []),
        ],
        metadata: {
          address:   fixEncoding(o.indirizzo || ''),
          lat:       parseFloat(o.latitudine)  || null,
          lng:       parseFloat(o.longitudine) || null,
          phone:     o.cellulare || '',
          website:   o.url || '',
          code:      o.codice_attrazione || '',
          actCode:   o.codice_attivita || '',
        },
        source: 'sql',
        isActive: true,
      });
    }
  }

  // Parse attivita_commerciali table
  const bizBlocks = [...sql.matchAll(/INSERT INTO [`"]?attivita_commerciali[`"]?\s+\(([^)]+)\)\s+VALUES([\s\S]+?);(?=\s*\n|$)/gim)];
  for (const m of bizBlocks) {
    const cols = m[1].split(',').map(c => c.trim().replace(/[`"]/g, ''));
    for (const row of parseRows(m[2])) {
      const o = {}; cols.forEach((c, i) => o[c] = row[i] || '');
      if (o.flag_cancellato === '1') continue;
      const name = fixEncoding(o.ragione_sociale || '').trim();
      if (!name) continue;

      const parts = [
        o.indirizzo ? `Address: ${fixEncoding(o.indirizzo)}, Catania` : 'Location: Catania, Sicily',
        o.cellulare ? `Phone: ${o.cellulare}` : '',
        o.email     ? `Email: ${o.email}` : '',
        o.url       ? `Website: ${o.url}` : '',
        o.note      ? fixEncoding(o.note) : '',
      ].filter(Boolean);

      businesses.push({
        title: name,
        content: parts.join('\n') || `${name} — Catania City Pass partner business`,
        summary: `${name} — official Catania City Pass partner`,
        category: o.flag_farmacia === '1' ? 'healthcare' :
                  o.flag_cinema  === '1' ? 'entertainment' :
                  o.flag_teatro  === '1' ? 'entertainment' :
                  o.flag_sport   === '1' ? 'entertainment' : 'shopping',
        tags: ['catania', 'city-pass', 'partner'],
        metadata: {
          address: fixEncoding(o.indirizzo || ''),
          phone: o.cellulare || '',
          email: o.email || '',
          website: o.url || '',
          code: o.codice_attivita || '',
        },
        source: 'sql',
        isActive: true,
      });
    }
  }

  return { attrazioni, businesses };
}

// ─── HTTP ─────────────────────────────────────────────────────────────────────
function apiPost(path, body, token) {
  return new Promise((res, rej) => {
    const d = JSON.stringify(body);
    const u = new URL(API + path);
    const opts = {
      hostname: u.hostname, port: parseInt(u.port) || 80,
      path: u.pathname, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(d),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
    const req = http.request(opts, r => {
      let b = '';
      r.on('data', c => b += c);
      r.on('end', () => {
        try { res({ status: r.statusCode, data: JSON.parse(b) }); }
        catch { res({ status: r.statusCode, data: b }); }
      });
    });
    req.on('error', rej);
    req.write(d);
    req.end();
  });
}

async function login() {
  const r = await apiPost('/admin/login', { slug: SLUG, password: PASS }, null);
  if (!r.data.accessToken)
    throw new Error(`Login failed ${r.status}: ${JSON.stringify(r.data)}`);
  return r.data.accessToken;
}

async function importBatch(items, token, label) {
  if (!items.length) return 0;
  const BATCH = 20;
  let total = 0;
  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH);
    const r = await apiPost('/knowledge/import', { data: JSON.stringify(batch), format: 'json' }, token);
    if (r.status === 200 || r.status === 201) {
      total += r.data.created ?? batch.length;
      process.stdout.write(`\r  ${label}: ${total}/${items.length} imported`);
    } else {
      console.error(`\n  Batch error: ${r.status}`, r.data?.message);
    }
  }
  if (items.length) console.log();
  return total;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  let sql = '';
  const file = process.argv[2];
  if (file && fs.existsSync(file)) {
    sql = fs.readFileSync(file, 'utf8');
    console.log(`Reading: ${file}`);
  } else if (!process.stdin.isTTY) {
    for await (const line of rl.createInterface({ input: process.stdin })) sql += line + '\n';
    console.log('Reading from stdin...');
  } else {
    console.error('Usage: node scripts/import-catania-sql.js <file.sql>');
    process.exit(1);
  }

  console.log(`SQL: ${(sql.length/1024).toFixed(0)} KB`);
  console.log('Parsing...');

  const { attrazioni, businesses } = parseSql(sql);
  console.log(`\nFound:`);
  console.log(`  Attractions (attrazioni):     ${attrazioni.length}`);
  console.log(`  Businesses (attivita):        ${businesses.length}`);

  if (!attrazioni.length && !businesses.length) {
    console.error('No data found. Verify the SQL contains INSERT statements.');
    process.exit(1);
  }

  console.log('\nSample attractions:');
  attrazioni.slice(0, 3).forEach(a =>
    console.log(`  • ${a.title} [${a.category}]\n    ${a.content.slice(0,80)}...`)
  );

  let token;
  try { token = await login(); console.log('✅ Logged in\n'); }
  catch (e) { console.error('❌ API error:', e.message); process.exit(1); }

  console.log('Importing...');
  const a = await importBatch(attrazioni, token, 'Attractions');
  const b = await importBatch(businesses, token, 'Businesses');

  console.log(`\n🎉 Done! Imported ${a} attractions + ${b} businesses`);
  console.log('   Bot is now trained with real Catania City Pass data.');
  console.log('   View: http://localhost:4200/knowledge');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
