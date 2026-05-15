// ====================================================================
// Plant Sim IDE - main app logic (Monaco edition)
// Parses constants from sketch.ino and drives a visual plant simulation.
// ====================================================================

(() => {
'use strict';

const $ = id => document.getElementById(id);

// ===================== STATE =====================
const cfg = {
  DRY_THRESHOLD: 800,
  WET_FLOOR: 400,
  PUMP_BURST_MS: 5000,
  SOAK_WAIT_MS: 30000,
  PUMP_COOLDOWN_MS: 60 * 60 * 1000,
  SAMPLE_INTERVAL_MS: 60 * 1000,
  MAX_PUMPS_PER_DAY: 6,
  PUMP_ACTIVE_LOW: true,
  ADC_MAX: 1023,
  EVAP_RAW_PER_SEC: 8,
  SOIL_DROP_PER_BURST: 600,
  TANK_DROP_PER_BURST: 14
};

const sim = {
  running: false, paused: false, fsm: 'IDLE',
  soilRaw: 500, tankLevel: 80, pumpsToday: 0,
  lastPumpAt: 0, lastSampleAt: 0, lastTankAlertAt: 0,
  pumpStartedAt: 0, soakStartedAt: 0,
  startedAt: 0, lastTick: 0,
  manualSoil: false, manualTank: false,
  rafId: 0
};

// Monaco editors (assigned once Monaco loads)
let sketchEditor = null;
let diagramEditor = null;

// ===================== MONACO BOOTSTRAP =====================
function initMonaco() {
  monaco.editor.defineTheme('plant-dark', {
    base: 'vs-dark', inherit: true, rules: [],
    colors: { 'editor.background': '#1e1e1e' }
  });

  const common = {
    theme: 'plant-dark',
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 13,
    fontFamily: 'ui-monospace, Consolas, "Courier New", monospace',
    tabSize: 2,
    insertSpaces: true,
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    cursorBlinking: 'smooth',
    renderLineHighlight: 'gutter',
    wordWrap: 'off'
  };

  sketchEditor = monaco.editor.create($('sketchEditor'), {
    ...common,
    value: window.DEFAULT_SKETCH,
    language: 'cpp'
  });

  diagramEditor = monaco.editor.create($('diagramEditor'), {
    ...common,
    value: window.DEFAULT_DIAGRAM,
    language: 'json'
  });

  sketchEditor.onDidChangeModelContent(() => markDirty());
  diagramEditor.onDidChangeModelContent(() => markDirty());

  const updateLnCol = ed => () => {
    const pos = ed.getPosition();
    if (pos) $('lineCol').textContent = `Ln ${pos.lineNumber}, Col ${pos.column}`;
  };
  sketchEditor.onDidChangeCursorPosition(updateLnCol(sketchEditor));
  diagramEditor.onDidChangeCursorPosition(updateLnCol(diagramEditor));

  $('editorLoading').classList.add('hidden');
  applyConstants(extractConstants(sketchEditor.getValue()));
  setStatus('ready — click ▶ Run to start the simulation', '');
}

if (window.monacoReady) initMonaco();
else window.addEventListener('monaco-ready', initMonaco);

// helpers to get/set content
function getSketch()  { return sketchEditor  ? sketchEditor.getValue()  : window.DEFAULT_SKETCH; }
function getDiagram() { return diagramEditor ? diagramEditor.getValue() : window.DEFAULT_DIAGRAM; }
function setSketch(t)  { if (sketchEditor)  sketchEditor.setValue(t); }
function setDiagram(t) { if (diagramEditor) diagramEditor.setValue(t); }

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
    $('editorLang').textContent = name === 'sketch' ? 'C++' : name === 'diagram' ? 'JSON' : '';
    // Monaco needs an explicit relayout after the container becomes visible
    if (name === 'sketch'  && sketchEditor)  { setTimeout(() => { sketchEditor.layout();  sketchEditor.focus();  }, 0); }
    if (name === 'diagram' && diagramEditor) { setTimeout(() => { diagramEditor.layout(); diagramEditor.focus(); }, 0); }
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

function applyConstants(consts) {
  const map = ['DRY_THRESHOLD','WET_FLOOR','PUMP_BURST_MS','SOAK_WAIT_MS',
               'PUMP_COOLDOWN_MS','SAMPLE_INTERVAL_MS','MAX_PUMPS_PER_DAY',
               'PUMP_ACTIVE_LOW'];
  const found = [], missing = [];
  map.forEach(k => {
    if (typeof consts[k] === 'number' || typeof consts[k] === 'boolean') {
      cfg[k] = consts[k]; found.push(k);
    } else missing.push(k);
  });
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

// ===================== TIMING SCALE =====================
function getScaledTimings() {
  const scale = 3000 / Math.max(cfg.PUMP_BURST_MS, 1);
  return {
    burst:    cfg.PUMP_BURST_MS    * scale,
    soak:     cfg.SOAK_WAIT_MS     * scale,
    cooldown: cfg.PUMP_COOLDOWN_MS * scale,
    sample:   Math.max(cfg.SAMPLE_INTERVAL_MS * scale, 800)
  };
}

// ===================== SIMULATION =====================
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
    next === 'PUMPING' ? '#5aa9ff' : next === 'SOAKING' ? '#ffb454' : '#7cd992');
  $('scene').classList.toggle('pumping', next === 'PUMPING');
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
    pushMsg(`Soil still dry but daily pump quota reached. (${pct}%)`, 'warn');
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
  const dt = (now - sim.lastTick) / 1000;
  sim.lastTick = now;
  if (sim.paused) {
    sim.rafId = requestAnimationFrame(tick);
    render(now);
    return;
  }
  const t = getScaledTimings();

  if (!sim.manualSoil && sim.fsm !== 'PUMPING') {
    sim.soilRaw = Math.min(cfg.ADC_MAX, sim.soilRaw + cfg.EVAP_RAW_PER_SEC * dt);
  }

  if (sim.fsm === 'IDLE') {
    if (sim.lastSampleAt === 0 || (now - sim.lastSampleAt) >= t.sample) sample(now, t);
  } else if (sim.fsm === 'PUMPING') {
    const elapsed = now - sim.pumpStartedAt;
    const frac = Math.min(1, elapsed / t.burst) - Math.min(1, (elapsed - dt * 1000) / t.burst);
    sim.soilRaw = Math.max(cfg.WET_FLOOR, sim.soilRaw - cfg.SOIL_DROP_PER_BURST * frac);
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

  render(now);
  sim.rafId = requestAnimationFrame(tick);
}

function render() {
  const tankH = (sim.tankLevel / 100) * 200;
  const water = document.querySelector('.tank-water');
  water.setAttribute('height', tankH);
  water.setAttribute('y', 30 + (200 - tankH));

  const pct = rawToPercent(sim.soilRaw) / 100;
  const dry = [160, 118, 84], wet = [77, 50, 32];
  const c = dry.map((d, i) => Math.round(d + (wet[i] - d) * pct));
  document.querySelector('.soil-fill').setAttribute('fill', `rgb(${c.join(',')})`);

  document.querySelectorAll('.leaf').forEach(l => {
    l.setAttribute('fill', pct < 0.25 ? '#a8b96a' : pct < 0.45 ? '#7eb86b' : '#3eb371');
  });

  const pctRound = Math.round(pct * 100);
  $('bannerMoist').textContent = pctRound + '%';
  $('soilVal').textContent = pctRound;
  $('tankVal').textContent = Math.round(sim.tankLevel);
  $('pumpsToday').textContent = sim.pumpsToday;

  if (!sim.manualSoil) $('soilSlider').value = pctRound;
  if (!sim.manualTank) $('tankSlider').value = Math.round(sim.tankLevel);
}

// ===================== RUN/PAUSE/RESET =====================
function doRun() {
  const consts = extractConstants(getSketch());
  const { found, missing } = applyConstants(consts);

  if (found.length === 0) {
    setStatus('Could not parse any constants — using defaults', 'warning');
  } else if (missing.length === 0) {
    setStatus(`Parsed ${found.length} constants ✓`, '');
  } else {
    setStatus(`Parsed ${found.length} constants (${missing.length} missing — using defaults)`, 'warning');
  }

  Object.assign(sim, {
    fsm: 'IDLE', pumpsToday: 0,
    lastPumpAt: 0, lastSampleAt: 0, lastTankAlertAt: 0,
    pumpStartedAt: 0, soakStartedAt: 0,
    startedAt: performance.now(), lastTick: performance.now(),
    running: true, paused: false
  });

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
  sim.running = false; sim.paused = false;
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
  render();
  setStatus('reset — click Run to start', '');
}

// ===================== FILE I/O =====================
function loadFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    const text = e.target.result;
    if (file.name.endsWith('.json')) {
      setDiagram(text);
      document.querySelector('.tab[data-tab="diagram"]').click();
    } else {
      setSketch(text);
      document.querySelector('.tab[data-tab="sketch"]').click();
    }
    markDirty();
    setStatus(`Loaded ${file.name}`, '');
  };
  reader.readAsText(file);
}

function saveSketch() {
  const blob = new Blob([getSketch()], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'sketch.ino';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
  clearDirty();
  setStatus('Sketch downloaded as sketch.ino', '');
}

function resetToExample() {
  if ($('dirtyDot').classList.contains('dirty') &&
      !confirm('Discard your edits and reload the example?')) return;
  setSketch(window.DEFAULT_SKETCH);
  setDiagram(window.DEFAULT_DIAGRAM);
  clearDirty();
  setStatus('Reset to example sketch', '');
}

// ===================== PWA INSTALL =====================
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  $('installBtn').hidden = false;
});
$('installBtn').addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  $('installBtn').hidden = true;
});
window.addEventListener('appinstalled', () => {
  $('installBtn').hidden = true;
  setStatus('Installed as desktop app ✓', '');
});

// ===================== BUTTONS / KEYS =====================
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

document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); doRun(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveSketch(); }
});

// initial render with defaults
sim.soilRaw = percentToRaw(60);
sim.tankLevel = 80;
render();
})();
