// ====================================================================
// Plant Sim IDE - main app logic
// Parses constants from the user's sketch.ino and drives a visual
// simulation that mirrors the Arduino state machine.
// ====================================================================

(() => {
'use strict';

const $ = id => document.getElementById(id);

// ===================== STATE =====================
const cfg = {
  // populated from sketch each time Run is pressed
  DRY_THRESHOLD: 800,
  WET_FLOOR: 400,
  PUMP_BURST_MS: 5000,
  SOAK_WAIT_MS: 30000,
  PUMP_COOLDOWN_MS: 60 * 60 * 1000,
  SAMPLE_INTERVAL_MS: 60 * 1000,
  MAX_PUMPS_PER_DAY: 6,
  PUMP_ACTIVE_LOW: true,
  ADC_MAX: 1023,
  // sim-only
  EVAP_RAW_PER_SEC: 8,        // soil raw value increases (drier) over time
  SOIL_DROP_PER_BURST: 600,   // how much raw drops per full burst (gets wetter)
  TANK_DROP_PER_BURST: 14
};

const sim = {
  running: false,
  paused: false,
  fsm: 'IDLE',
  soilRaw: 500,
  tankLevel: 80,
  pumpsToday: 0,
  lastPumpAt: 0,
  lastSampleAt: 0,
  lastTankAlertAt: 0,
  pumpStartedAt: 0,
  soakStartedAt: 0,
  startedAt: 0,
  lastTick: 0,
  manualSoil: false,
  manualTank: false,
  rafId: 0
};

// ===================== EDITOR =====================
const sketchEd  = $('sketchEditor');
const diagramEd = $('diagramEditor');
const sketchGutter  = $('sketchGutter');
const diagramGutter = $('diagramGutter');

function updateGutter(textarea, gutter) {
  const lines = textarea.value.split('\n').length;
  let s = '';
  for (let i = 1; i <= lines; i++) s += i + '\n';
  gutter.textContent = s;
  gutter.scrollTop = textarea.scrollTop;
}

function setupEditor(textarea, gutter) {
  textarea.addEventListener('input',  () => { updateGutter(textarea, gutter); markDirty(); });
  textarea.addEventListener('scroll', () => { gutter.scrollTop = textarea.scrollTop; });
  textarea.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = textarea.selectionStart, en = textarea.selectionEnd;
      textarea.value = textarea.value.slice(0, s) + '  ' + textarea.value.slice(en);
      textarea.selectionStart = textarea.selectionEnd = s + 2;
      updateGutter(textarea, gutter);
      markDirty();
    }
  });
  textarea.addEventListener('click',   () => updateLineCol(textarea));
  textarea.addEventListener('keyup',   () => updateLineCol(textarea));
}

function updateLineCol(textarea) {
  const pos = textarea.selectionStart;
  const before = textarea.value.slice(0, pos);
  const line = before.split('\n').length;
  const col = pos - before.lastIndexOf('\n');
  $('lineCol').textContent = `Ln ${line}, Col ${col}`;
}

function markDirty()  { $('dirtyDot').classList.add('dirty'); }
function clearDirty() { $('dirtyDot').classList.remove('dirty'); }

// ===================== TABS =====================
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const name = tab.dataset.tab;
    document.querySelectorAll('[data-tab-pane]').forEach(p => {
      p.classList.toggle('hidden', p.dataset.tabPane !== name);
    });
  });
});

// ===================== STATUS BAR =====================
function setStatus(msg, kind) {
  const bar = document.querySelector('.status-bar');
  bar.classList.remove('error', 'warning');
  if (kind === 'error')   bar.classList.add('error');
  if (kind === 'warning') bar.classList.add('warning');
  $('parseStatus').textContent = msg;
}

// ===================== CONSTANTS PARSER =====================
function parseExpr(s) {
  const t = s.trim();
  if (/^".*"$/.test(t)) return t.slice(1, -1);
  if (t === 'true')  return true;
  if (t === 'false') return false;
  if (t === 'LOW')   return 0;
  if (t === 'HIGH')  return 1;
  // numeric: strip C++ integer suffixes (UL, U, L, LL, ULL) and casts.
  const cleaned = t
    .replace(/\bD\d+\b/g, '')          // ignore NodeMCU pin macros
    .replace(/\bA0\b/g, '0')
    .replace(/\([^)]*\)\s*/g, '')      // strip simple type casts
    .replace(/[ULul]+(?=[\s\*\/\+\-\)]|$)/g, '');
  try { return Function('"use strict"; return (' + cleaned + ');')(); }
  catch (e) { return null; }
}

function extractConstants(code) {
  // Remove single-line comments to avoid confusing the regex
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

function applyConstants(consts) {
  const map = ['DRY_THRESHOLD','WET_FLOOR','PUMP_BURST_MS','SOAK_WAIT_MS',
               'PUMP_COOLDOWN_MS','SAMPLE_INTERVAL_MS','MAX_PUMPS_PER_DAY',
               'PUMP_ACTIVE_LOW'];
  const found = [];
  const missing = [];
  map.forEach(k => {
    if (typeof consts[k] === 'number' || typeof consts[k] === 'boolean') {
      cfg[k] = consts[k];
      found.push(k);
    } else missing.push(k);
  });
  // ADC range: if DRY_THRESHOLD > 2000, assume ESP32 (12-bit, 0-4095)
  cfg.ADC_MAX = (cfg.DRY_THRESHOLD > 1200 || cfg.WET_FLOOR > 1100) ? 4095 : 1023;
  renderConfig();
  return { found, missing };
}

function renderConfig() {
  $('cfgDry').textContent    = cfg.DRY_THRESHOLD;
  $('cfgWet').textContent    = cfg.WET_FLOOR;
  $('cfgBurst').textContent  = fmtMs(cfg.PUMP_BURST_MS);
  $('cfgSoak').textContent   = fmtMs(cfg.SOAK_WAIT_MS);
  $('cfgCool').textContent   = fmtMs(cfg.PUMP_COOLDOWN_MS);
  $('cfgSample').textContent = fmtMs(cfg.SAMPLE_INTERVAL_MS);
  $('cfgMax').textContent    = cfg.MAX_PUMPS_PER_DAY;
}

function fmtMs(ms) {
  if (ms >= 3600000) return (ms / 3600000).toFixed(ms % 3600000 ? 1 : 0) + 'h';
  if (ms >= 60000)   return (ms / 60000).toFixed(ms % 60000 ? 1 : 0) + 'm';
  return (ms / 1000).toFixed(ms % 1000 ? 1 : 0) + 's';
}

// ===================== SIM TIMINGS (scaled for watchability) =====================
// Real Arduino timings can be minutes/hours. We scale them down so the demo
// is observable, but the RELATIVE ratios are preserved.
function getScaledTimings() {
  // Reference: real PUMP_BURST_MS is 5s. We'll show that as 3s in the sim.
  // Everything else scales by the same ratio.
  const scale = 3000 / Math.max(cfg.PUMP_BURST_MS, 1);
  return {
    burst:    cfg.PUMP_BURST_MS    * scale,
    soak:     cfg.SOAK_WAIT_MS     * scale,
    cooldown: cfg.PUMP_COOLDOWN_MS * scale,
    sample:   Math.max(cfg.SAMPLE_INTERVAL_MS * scale, 800)
  };
}

// ===================== SIMULATION LOOP =====================
function rawToPercent(raw) {
  if (raw <= cfg.WET_FLOOR) return 100;
  if (raw >= cfg.DRY_THRESHOLD) return 0;
  return Math.round(((cfg.DRY_THRESHOLD - raw) / (cfg.DRY_THRESHOLD - cfg.WET_FLOOR)) * 100);
}
function percentToRaw(pct) {
  return Math.round(cfg.DRY_THRESHOLD - (pct / 100) * (cfg.DRY_THRESHOLD - cfg.WET_FLOOR));
}

function setFsm(next) {
  sim.fsm = next;
  $('bannerFsm').textContent = next;
  $('bannerFsm').setAttribute('fill',
    next === 'PUMPING' ? '#5aa9ff' :
    next === 'SOAKING' ? '#ffb454' : '#7cd992');
  const scene = $('scene');
  if (next === 'PUMPING') scene.classList.add('pumping');
  else scene.classList.remove('pumping');
  log(`[FSM] -> ${next}`, next === 'PUMPING' ? 'info' : '');
}

function log(text, cls) {
  const out = $('serialOutput');
  const span = document.createElement('span');
  const ts = ((performance.now() - sim.startedAt) / 1000).toFixed(2);
  span.className = cls || '';
  span.innerHTML = `<span class="ts">[${ts}s]</span>${escapeHtml(text)}\n`;
  out.appendChild(span);
  out.scrollTop = out.scrollHeight;
}
function escapeHtml(s) { return s.replace(/[&<>]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[c])); }

function pushMsg(text, kind) {
  const feed = $('telegramFeed');
  const div = document.createElement('div');
  div.className = 'msg ' + (kind || '');
  const ts = ((performance.now() - sim.startedAt) / 1000).toFixed(1);
  div.innerHTML = `<span class="when">+${ts}s</span>${escapeHtml(text)}`;
  feed.appendChild(div);
  feed.scrollTop = feed.scrollHeight;
}

function sample(now, t) {
  sim.lastSampleAt = now;
  const raw = Math.round(sim.soilRaw);
  const pct = rawToPercent(raw);
  const tankEmpty = sim.tankLevel < 5;
  log(`soil raw=${raw} pct=${pct}% tank=${tankEmpty ? 'EMPTY' : 'ok'}`);

  const isDry = raw >= cfg.DRY_THRESHOLD;
  const cooldownOver = sim.lastPumpAt === 0 || (now - sim.lastPumpAt) >= t.cooldown;
  const quotaLeft = sim.pumpsToday < cfg.MAX_PUMPS_PER_DAY;

  if (isDry && tankEmpty) {
    if (sim.lastTankAlertAt === 0 || (now - sim.lastTankAlertAt) >= t.cooldown) {
      pushMsg(`⚠️ Soil is dry (${pct}%) but the water tank is EMPTY. Please refill!`, 'warn');
      sim.lastTankAlertAt = now;
    }
  } else if (isDry && cooldownOver && quotaLeft) {
    sim.pumpStartedAt = now;
    setFsm('PUMPING');
  } else if (isDry && !quotaLeft && cooldownOver) {
    pushMsg(`Soil still dry but daily pump quota reached. Possible blockage. (${pct}%)`, 'warn');
    sim.lastPumpAt = now;
  }
}

function finishCycle(now) {
  sim.lastPumpAt = now;
  sim.pumpsToday++;
  const raw = Math.round(sim.soilRaw);
  const pct = rawToPercent(raw);
  if (raw >= cfg.DRY_THRESHOLD) {
    if (sim.tankLevel < 5)
      pushMsg(`⚠️ Tried to water but soil still dry (${pct}%). Tank is empty - refill!`, 'warn');
    else
      pushMsg(`⚠️ Tried to water but soil still dry (${pct}%). Check the tube or pump.`, 'warn');
  } else {
    pushMsg(`✅ I was thirsty so I watered myself. Moisture now ${pct}%. 🪴💧`, 'ok');
  }
  log(`post-soak raw=${raw} pct=${pct}%`);
}

function tick() {
  if (!sim.running) return;
  const now = performance.now();
  const dt  = (now - sim.lastTick) / 1000;
  sim.lastTick = now;
  if (sim.paused) { sim.rafId = requestAnimationFrame(tick); render(now, getScaledTimings()); return; }

  const t = getScaledTimings();

  // natural drying: raw value rises toward DRY_THRESHOLD
  if (!sim.manualSoil && sim.fsm !== 'PUMPING') {
    sim.soilRaw = Math.min(cfg.ADC_MAX, sim.soilRaw + cfg.EVAP_RAW_PER_SEC * dt);
  }

  if (sim.fsm === 'IDLE') {
    if (sim.lastSampleAt === 0 || (now - sim.lastSampleAt) >= t.sample) sample(now, t);
  } else if (sim.fsm === 'PUMPING') {
    const elapsed = now - sim.pumpStartedAt;
    const frac = Math.min(1, elapsed / t.burst) - Math.min(1, (elapsed - dt * 1000) / t.burst);
    // soil gets wetter: raw drops toward WET_FLOOR
    sim.soilRaw  = Math.max(cfg.WET_FLOOR, sim.soilRaw - cfg.SOIL_DROP_PER_BURST * frac);
    sim.tankLevel = Math.max(0, sim.tankLevel - cfg.TANK_DROP_PER_BURST * frac);
    if (elapsed >= t.burst) {
      sim.soakStartedAt = now;
      setFsm('SOAKING');
    }
  } else if (sim.fsm === 'SOAKING') {
    if (now - sim.soakStartedAt >= t.soak) {
      finishCycle(now);
      setFsm('IDLE');
      sim.lastSampleAt = now;
    }
  }

  render(now, t);
  sim.rafId = requestAnimationFrame(tick);
}

function render(now, t) {
  // Tank water rect: y between 30 and 230, height proportional
  const tankH = (sim.tankLevel / 100) * 200;
  const water = document.querySelector('.tank-water');
  water.setAttribute('height', tankH);
  water.setAttribute('y', 30 + (200 - tankH));

  // Soil color interpolation
  const pct = rawToPercent(sim.soilRaw) / 100;
  const dry = [160, 118, 84], wet = [77, 50, 32];
  const c = dry.map((d, i) => Math.round(d + (wet[i] - d) * pct));
  document.querySelector('.soil-fill').setAttribute('fill', `rgb(${c.join(',')})`);

  // Leaves color
  const leaves = document.querySelectorAll('.leaf');
  const droopy = pct < 0.25;
  const meh    = pct < 0.45;
  leaves.forEach(l => l.setAttribute('fill', droopy ? '#a8b96a' : (meh ? '#7eb86b' : '#3eb371')));

  // Banner + status numbers
  const pctRound = Math.round(pct * 100);
  $('bannerMoist').textContent = pctRound + '%';
  $('soilVal').textContent = pctRound;
  $('tankVal').textContent = Math.round(sim.tankLevel);
  $('pumpsToday').textContent = sim.pumpsToday;

  // Sync sliders unless user is dragging
  if (!sim.manualSoil) $('soilSlider').value = pctRound;
  if (!sim.manualTank) $('tankSlider').value = Math.round(sim.tankLevel);
}

// ===================== RUN/PAUSE/RESET =====================
function doRun() {
  const code = sketchEd.value;
  const consts = extractConstants(code);
  const { found, missing } = applyConstants(consts);

  if (found.length === 0) {
    setStatus('Could not parse any constants — using defaults', 'warning');
  } else if (missing.length === 0) {
    setStatus(`Parsed ${found.length} constants ✓`, '');
  } else {
    setStatus(`Parsed ${found.length} constants (${missing.length} missing — using defaults)`, 'warning');
  }

  // reset state but keep sliders at user-set values
  sim.fsm = 'IDLE';
  sim.pumpsToday = 0;
  sim.lastPumpAt = 0;
  sim.lastSampleAt = 0;
  sim.lastTankAlertAt = 0;
  sim.pumpStartedAt = 0;
  sim.soakStartedAt = 0;
  sim.startedAt = performance.now();
  sim.lastTick = performance.now();
  sim.running = true;
  sim.paused = false;
  $('scene').classList.remove('pumping');
  $('bannerFsm').textContent = 'IDLE';
  $('bannerFsm').setAttribute('fill', '#7cd992');

  $('serialOutput').innerHTML = '';
  $('telegramFeed').innerHTML = '';
  log('Plant agent online.', 'ok');
  log(`ADC range: 0..${cfg.ADC_MAX} (detected ${cfg.ADC_MAX === 4095 ? 'ESP32' : 'ESP8266'} thresholds)`, 'info');
  pushMsg('Plant agent online. Watching the soil.', 'ok');

  cancelAnimationFrame(sim.rafId);
  sim.rafId = requestAnimationFrame(tick);
}

function doPause() {
  if (!sim.running) return;
  sim.paused = !sim.paused;
  $('pauseBtn').textContent = sim.paused ? '▶ Resume' : '⏸ Pause';
  log(sim.paused ? '[PAUSED]' : '[RESUMED]', 'info');
}

function doReset() {
  sim.running = false;
  sim.paused = false;
  cancelAnimationFrame(sim.rafId);
  $('scene').classList.remove('pumping');
  $('bannerFsm').textContent = 'IDLE';
  $('bannerFsm').setAttribute('fill', '#7cd992');
  $('pauseBtn').textContent = '⏸ Pause';
  $('serialOutput').innerHTML = '';
  $('telegramFeed').innerHTML = '';
  sim.soilRaw = percentToRaw(60);
  sim.tankLevel = 80;
  sim.pumpsToday = 0;
  render(performance.now(), getScaledTimings());
  setStatus('reset — click Run to start', '');
}

// ===================== FILE I/O =====================
function loadFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    const text = e.target.result;
    if (file.name.endsWith('.json')) {
      diagramEd.value = text;
      updateGutter(diagramEd, diagramGutter);
      // switch to diagram tab
      document.querySelector('.tab[data-tab="diagram"]').click();
    } else {
      sketchEd.value = text;
      updateGutter(sketchEd, sketchGutter);
      document.querySelector('.tab[data-tab="sketch"]').click();
    }
    markDirty();
    setStatus(`Loaded ${file.name}`, '');
  };
  reader.readAsText(file);
}

function saveSketch() {
  const blob = new Blob([sketchEd.value], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sketch.ino';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  clearDirty();
  setStatus('Sketch downloaded as sketch.ino', '');
}

function resetToExample() {
  if ($('dirtyDot').classList.contains('dirty') &&
      !confirm('Discard your edits and reload the example?')) return;
  sketchEd.value  = window.DEFAULT_SKETCH;
  diagramEd.value = window.DEFAULT_DIAGRAM;
  updateGutter(sketchEd, sketchGutter);
  updateGutter(diagramEd, diagramGutter);
  clearDirty();
  setStatus('Reset to example sketch', '');
}

// ===================== INIT =====================
function init() {
  sketchEd.value  = window.DEFAULT_SKETCH;
  diagramEd.value = window.DEFAULT_DIAGRAM;
  setupEditor(sketchEd,  sketchGutter);
  setupEditor(diagramEd, diagramGutter);
  updateGutter(sketchEd,  sketchGutter);
  updateGutter(diagramEd, diagramGutter);
  clearDirty();
  applyConstants(extractConstants(sketchEd.value));
  sim.soilRaw = percentToRaw(60);
  sim.tankLevel = 80;
  render(performance.now(), getScaledTimings());
  setStatus('ready — click ▶ Run to start the simulation', '');

  // Buttons
  $('runBtn').addEventListener('click', doRun);
  $('pauseBtn').addEventListener('click', doPause);
  $('resetBtn').addEventListener('click', doReset);
  $('exampleBtn').addEventListener('click', resetToExample);
  $('saveBtn').addEventListener('click', saveSketch);
  $('loadInput').addEventListener('change', e => {
    if (e.target.files[0]) loadFile(e.target.files[0]);
    e.target.value = '';
  });
  $('clearSerialBtn').addEventListener('click', () => { $('serialOutput').innerHTML = ''; });
  $('clearTelegramBtn').addEventListener('click', () => { $('telegramFeed').innerHTML = ''; });

  // Sliders
  $('soilSlider').addEventListener('input', e => {
    sim.manualSoil = true;
    sim.soilRaw = percentToRaw(+e.target.value);
  });
  $('soilSlider').addEventListener('change', () => sim.manualSoil = false);
  $('tankSlider').addEventListener('input', e => {
    sim.manualTank = true;
    sim.tankLevel = +e.target.value;
  });
  $('tankSlider').addEventListener('change', () => sim.manualTank = false);
  $('dryBtn').addEventListener('click', () => {
    sim.soilRaw = cfg.DRY_THRESHOLD + 30;
    if (sim.running) log('[user] forced soil to dry', 'warn');
  });
  $('refillBtn').addEventListener('click', () => {
    sim.tankLevel = 100;
    if (sim.running) pushMsg('🪣 Tank refilled to 100%.', 'ok');
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); doRun(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveSketch(); }
  });
}

init();
})();
