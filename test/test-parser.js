// Parser & config test for Plant Sim IDE.
// Runs the same constant-extraction logic the browser IDE uses, against
// every bundled preset, and prints what the simulator would do with each.
//
//   node test/test-parser.js

const fs = require('fs');
const path = require('path');

// ===== Load the IDE's bundled examples by evaluating default-files.js =====
// default-files.js assumes a browser - we stub `window` so it loads in Node.
const stubFile = path.join(__dirname, '..', 'plant-sim-ide', 'default-files.js');
const src = fs.readFileSync(stubFile, 'utf8');
const window = {};
new Function('window', src)(window);

// ===== Parser (verbatim copy from app.js) =====
function parseExpr(s) {
  const t = s.trim();
  if (/^".*"$/.test(t)) return t.slice(1, -1);
  if (t === 'true')  return true;
  if (t === 'false') return false;
  if (t === 'LOW')   return 0;
  if (t === 'HIGH')  return 1;
  const cleaned = t
    .replace(/\bD\d+\b/g, '')
    .replace(/\bA0\b/g, '0')
    .replace(/\([^)]*\)\s*/g, '')
    .replace(/[ULul]+(?=[\s\*\/\+\-\)]|$)/g, '');
  try { return Function('"use strict"; return (' + cleaned + ');')(); }
  catch (e) { return null; }
}

function extractConstants(code) {
  const stripped = code.replace(/\/\/.*$/gm, '');
  const re = /\bconst\s+[\w\s\*]+?\s+(\w+)\s*=\s*([^;]+);/g;
  const out = {};
  let m;
  while ((m = re.exec(stripped)) !== null) {
    const name = m[1];
    const val = parseExpr(m[2]);
    if (val !== null && val !== undefined) out[name] = val;
  }
  return out;
}

// ===== Formatters =====
const REQUIRED = ['DRY_THRESHOLD','WET_FLOOR','PUMP_BURST_MS','SOAK_WAIT_MS',
                  'PUMP_COOLDOWN_MS','SAMPLE_INTERVAL_MS','MAX_PUMPS_PER_DAY',
                  'PUMP_ACTIVE_LOW'];

function fmtMs(ms) {
  if (ms >= 3600000) return (ms / 3600000).toFixed(ms % 3600000 ? 1 : 0) + 'h';
  if (ms >= 60000)   return (ms / 60000).toFixed(ms % 60000 ? 1 : 0) + 'm';
  return (ms / 1000).toFixed(ms % 1000 ? 1 : 0) + 's';
}

// ===== Simulation behaviour prediction =====
function predictBehaviour(c) {
  const adcMax = (c.DRY_THRESHOLD > 1200 || c.WET_FLOOR > 1100) ? 4095 : 1023;
  const adcChip = adcMax === 4095 ? 'ESP32 (12-bit)' : 'ESP8266 (10-bit)';
  const moistureBand = c.DRY_THRESHOLD - c.WET_FLOOR;
  const maxWaterPerDay = c.MAX_PUMPS_PER_DAY * c.PUMP_BURST_MS;
  return {
    adcChip,
    moistureBand,
    burstStr: fmtMs(c.PUMP_BURST_MS),
    soakStr:  fmtMs(c.SOAK_WAIT_MS),
    coolStr:  fmtMs(c.PUMP_COOLDOWN_MS),
    sampleStr: fmtMs(c.SAMPLE_INTERVAL_MS),
    maxWaterPerDayStr: fmtMs(maxWaterPerDay) + ' total/day (across ' +
                      c.MAX_PUMPS_PER_DAY + ' bursts)',
    aggressiveness: c.PUMP_COOLDOWN_MS < 10 * 60 * 1000
      ? 'aggressive (cooldown < 10 min)'
      : c.PUMP_COOLDOWN_MS < 2 * 60 * 60 * 1000
        ? 'moderate'
        : 'conservative (cooldown >= 2 h)'
  };
}

// ===== Run =====
const presets = window.EXAMPLES;
console.log('='.repeat(72));
console.log('  Plant Sim IDE - parser & simulation prediction test');
console.log('='.repeat(72));

let pass = 0, fail = 0;

Object.entries(presets).forEach(([key, ex]) => {
  console.log('\n[1m' + key.toUpperCase().padEnd(13) + '[0m ' + ex.name);
  console.log('-'.repeat(72));
  const consts = extractConstants(ex.sketch);
  const missing = REQUIRED.filter(k => !(k in consts));

  REQUIRED.forEach(k => {
    const v = consts[k];
    if (v === undefined) {
      console.log('  [31m✗[0m ' + k.padEnd(20) + ' MISSING');
    } else {
      const isMs = k.endsWith('_MS');
      const display = isMs ? fmtMs(v) + '  (' + v + ' ms)' : String(v);
      console.log('  [32m✓[0m ' + k.padEnd(20) + ' ' + display);
    }
  });

  if (missing.length === 0) {
    pass++;
    const p = predictBehaviour(consts);
    console.log('  [36mPredicted behaviour:[0m');
    console.log('    ADC range          ' + p.adcChip);
    console.log('    Moisture band      ' + p.moistureBand + ' raw points (dry-wet)');
    console.log('    Per-burst water    ' + p.burstStr);
    console.log('    Sample cadence     every ' + p.sampleStr);
    console.log('    Burst cooldown     ' + p.coolStr);
    console.log('    Daily max water    ' + p.maxWaterPerDayStr);
    console.log('    Style              ' + p.aggressiveness);
  } else {
    fail++;
    console.log('  [31mFAIL - ' + missing.length + ' required constants missing[0m');
  }
});

console.log('\n' + '='.repeat(72));
console.log('  Result: [32m' + pass + ' passed[0m, [31m' +
            fail + ' failed[0m out of ' + (pass + fail));
console.log('='.repeat(72));

// ===== Bonus: stress-test the parser on edge-case inputs =====
console.log('\nEdge-case parser tests:');
const edgeCases = [
  { name: 'expression with multiplication', code: 'const int X = 5UL * 1000UL;',   want: 5000 },
  { name: 'hex literal',                    code: 'const int X = 0x400;',           want: 1024 },
  { name: 'with comment',                   code: 'const int X = 800; // dry',      want: 800 },
  { name: 'boolean true',                   code: 'const bool Y = true;',           want: true },
  { name: 'boolean false',                  code: 'const bool Y = false;',          want: false },
  { name: 'cast prefix',                    code: 'const uint8_t Z = (uint8_t)6;',  want: 6 },
  { name: 'pin macro D1 (silently excluded)', code: 'const uint8_t Z = D1;',        want: undefined },  // pin macros are correctly filtered out of output
  { name: 'compound time',                  code: 'const unsigned long T = 4UL * 60UL * 60UL * 1000UL;', want: 14400000 }
];

let edgePass = 0, edgeFail = 0;
edgeCases.forEach(t => {
  const out = extractConstants(t.code);
  const got = Object.values(out)[0];
  const ok = got === t.want || (Number.isNaN(got) && Number.isNaN(t.want));
  if (ok) {
    console.log('  [32m✓[0m ' + t.name.padEnd(40) + ' = ' + JSON.stringify(got));
    edgePass++;
  } else {
    console.log('  [31m✗[0m ' + t.name.padEnd(40) + ' got=' +
                JSON.stringify(got) + '  want=' + JSON.stringify(t.want));
    edgeFail++;
  }
});

console.log('\nEdge-case result: ' + edgePass + '/' + (edgePass + edgeFail) + ' passed');
process.exit(fail + edgeFail > 0 ? 1 : 0);
