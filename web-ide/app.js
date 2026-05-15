// IoTree Web IDE - visual board + component editor with codegen.
(() => {
'use strict';

const $ = id => document.getElementById(id);

// ===================== STATE =====================
const state = {
  boardId: 'esp32-devkit',
  boardPos: { x: 540, y: 180 },
  components: [],   // {uid, type, x, y}
  wires: [],        // {from:{uid,pinId}, to:{uid,pinId}}
  nextUid: 1,
  selectedPin: null
};

const PIN_COLORS = {
  power3v3: '#ff5252', power5v: '#ff5252',
  ground: '#cfd3dc',
  'i2c-sda': '#c586c0', 'i2c-scl': '#c586c0',
  gpio: '#ffd34d', digital: '#ffd34d', analog: '#ffd34d',
  unused: '#555'
};

function wireColorFor(roleA, roleB) {
  const r = [roleA, roleB];
  if (r.includes('power3v3') || r.includes('power5v')) return '#ff5252';
  if (r.includes('ground')) return '#cfd3dc';
  if (r.includes('i2c-sda') || r.includes('i2c-scl')) return '#c586c0';
  return '#7cd992';
}

// ===================== UTIL =====================
function $svg(tag, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

function uid() { return 'c' + (state.nextUid++); }

function setStatus(msg, kind) {
  const bar = $('statusBar');
  bar.classList.remove('error', 'warn');
  if (kind) bar.classList.add(kind);
  $('statusMsg').textContent = msg;
}

function setHint(msg, kind) {
  const el = $('canvasHint');
  el.classList.remove('wiring', 'error');
  if (kind) el.classList.add(kind);
  el.textContent = msg;
}

// ===================== BOARD PICKER =====================
function populateBoards() {
  const sel = $('boardSelect');
  Object.entries(BOARDS).forEach(([id, b]) => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = b.label;
    sel.appendChild(opt);
  });
  sel.value = state.boardId;
  sel.addEventListener('change', e => {
    if (state.components.length &&
        !confirm('Switching boards will clear components and wires. Continue?')) {
      e.target.value = state.boardId;
      return;
    }
    state.boardId = e.target.value;
    state.components = [];
    state.wires = [];
    state.selectedPin = null;
    render();
    refreshOutput();
    setStatus('Switched to ' + BOARDS[state.boardId].label);
  });
}

// ===================== CATALOG =====================
function populateCatalog() {
  const list = $('catalogList');
  COMPONENT_CATEGORIES.forEach(cat => {
    const items = Object.entries(COMPONENTS).filter(([_, c]) => c.category === cat);
    if (!items.length) return;
    const group = document.createElement('div');
    group.className = 'cat-group';
    group.innerHTML = `<div class="cat-group-title">${cat}</div>`;
    items.forEach(([id, c]) => {
      const div = document.createElement('div');
      div.className = 'cat-item';
      div.dataset.compId = id;
      div.dataset.cat = cat;
      div.innerHTML = `<div class="lbl">${c.label}</div>
        <span class="pins-hint">${c.pins.map(p => p.label).join(' / ')}</span>`;
      div.addEventListener('click', () => addComponent(id));
      group.appendChild(div);
    });
    list.appendChild(group);
  });
}

$('catalogSearch').addEventListener('input', e => {
  const q = e.target.value.toLowerCase();
  document.querySelectorAll('.cat-item').forEach(el => {
    const txt = el.textContent.toLowerCase();
    el.style.display = txt.includes(q) ? '' : 'none';
  });
});

// ===================== COMPONENT MGMT =====================
function addComponent(typeId) {
  const def = COMPONENTS[typeId];
  if (!def) return;
  const placed = state.components.length;
  const x = 100 + (placed % 4) * 180;
  const y = 80 + Math.floor(placed / 4) * 130;
  state.components.push({ uid: uid(), type: typeId, x, y });
  render();
  refreshOutput();
  setStatus(`Added ${def.label}. Click its pins to wire it up.`);
}

function removeComponent(componentUid) {
  state.components = state.components.filter(c => c.uid !== componentUid);
  state.wires = state.wires.filter(w =>
    w.from.uid !== componentUid && w.to.uid !== componentUid);
  state.selectedPin = null;
  render();
  refreshOutput();
}

function clearAll() {
  if (!state.components.length) return;
  if (!confirm('Remove all components and wires?')) return;
  state.components = [];
  state.wires = [];
  state.selectedPin = null;
  render();
  refreshOutput();
  setStatus('Cleared canvas.');
}

// ===================== PIN POSITION RESOLUTION =====================
function pinAbsolutePos(ref) {
  if (ref.uid === 'board') {
    const b = BOARDS[state.boardId];
    const p = b.pins.find(p => p.id === ref.pinId);
    if (!p) return null;
    const cx = p.side === 'left' ? state.boardPos.x : state.boardPos.x + b.width;
    return { x: cx, y: state.boardPos.y + p.y };
  }
  const comp = state.components.find(c => c.uid === ref.uid);
  if (!comp) return null;
  const def = COMPONENTS[comp.type];
  const p = def.pins.find(p => p.id === ref.pinId);
  if (!p) return null;
  return { x: comp.x + p.x, y: comp.y - 2 };  // top edge of part
}

function pinRoleOf(ref) {
  if (ref.uid === 'board') {
    const p = BOARDS[state.boardId].pins.find(p => p.id === ref.pinId);
    return p ? p.role : null;
  }
  const comp = state.components.find(c => c.uid === ref.uid);
  if (!comp) return null;
  const p = COMPONENTS[comp.type].pins.find(p => p.id === ref.pinId);
  return p ? p.role : null;
}

function pinAlreadyUsed(ref) {
  return state.wires.some(w =>
    (w.from.uid === ref.uid && w.from.pinId === ref.pinId) ||
    (w.to.uid === ref.uid && w.to.pinId === ref.pinId)
  );
}

function pinsCompatible(refA, refB) {
  // Don't wire a part to itself
  if (refA.uid === refB.uid) return false;
  const rA = pinRoleOf(refA), rB = pinRoleOf(refB);
  if (!rA || !rB) return false;
  const compat = window.PIN_COMPAT[rA] || [];
  return compat.includes(rB);
}

// ===================== PIN CLICK HANDLING =====================
function onPinClick(ref) {
  if (pinAlreadyUsed(ref)) {
    setHint('That pin is already wired. Click an unused pin or delete the existing wire.', 'error');
    return;
  }
  if (!state.selectedPin) {
    state.selectedPin = ref;
    setHint('Now click a compatible pin on another part. (ESC to cancel)', 'wiring');
    renderHighlights();
    return;
  }
  if (state.selectedPin.uid === ref.uid && state.selectedPin.pinId === ref.pinId) {
    state.selectedPin = null;
    setHint('Click a pin on one part, then a pin on another part to wire them.');
    renderHighlights();
    return;
  }
  if (!pinsCompatible(state.selectedPin, ref)) {
    const rA = pinRoleOf(state.selectedPin), rB = pinRoleOf(ref);
    setHint(`Pin roles incompatible (${rA} ↔ ${rB}). Pick a compatible pin or hit ESC.`, 'error');
    return;
  }
  state.wires.push({ from: state.selectedPin, to: ref });
  state.selectedPin = null;
  setHint('Wire added. Click another pin pair to wire more.');
  render();
  refreshOutput();
}

function deleteWire(idx) {
  state.wires.splice(idx, 1);
  render();
  refreshOutput();
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && state.selectedPin) {
    state.selectedPin = null;
    setHint('Click a pin on one part, then a pin on another part to wire them.');
    renderHighlights();
  }
});

// ===================== AUTO-WIRE POWER + GND =====================
function autoWirePower() {
  let added = 0;
  state.components.forEach(c => {
    const def = COMPONENTS[c.type];
    def.pins.forEach(p => {
      if (pinAlreadyUsed({ uid: c.uid, pinId: p.id })) return;
      // Look for a board pin with compatible role that is unused
      const compatRoles = window.PIN_COMPAT[p.role] || [];
      const board = BOARDS[state.boardId];
      const target = board.pins.find(bp =>
        compatRoles.includes(bp.role) &&
        !pinAlreadyUsed({ uid: 'board', pinId: bp.id }) &&
        (p.role === 'power3v3' || p.role === 'power5v' ||
         p.role === 'ground' || p.role === 'i2c-sda' || p.role === 'i2c-scl')
      );
      if (target) {
        state.wires.push({
          from: { uid: c.uid, pinId: p.id },
          to:   { uid: 'board', pinId: target.id }
        });
        added++;
      }
    });
  });
  render();
  refreshOutput();
  setStatus(added > 0 ? `Auto-wired ${added} power/ground/I2C pins.` : 'Nothing to auto-wire (already done?).');
}

// ===================== RENDERING =====================
function render() {
  const partLayer = $('partLayer');
  const wireLayer = $('wireLayer');
  partLayer.innerHTML = '';
  wireLayer.innerHTML = '';

  drawBoard(partLayer);
  state.components.forEach(c => drawComponent(partLayer, c));
  state.wires.forEach((w, i) => drawWire(wireLayer, w, i));

  $('wireCount').textContent = `${state.wires.length} wires`;
}

function renderHighlights() {
  document.querySelectorAll('.pin').forEach(p => {
    p.classList.remove('selected', 'compatible');
  });
  if (!state.selectedPin) return;
  const selectedEl = document.querySelector(
    `.pin[data-uid="${state.selectedPin.uid}"][data-pin="${state.selectedPin.pinId}"]`);
  if (selectedEl) selectedEl.classList.add('selected');
  // Highlight compatible candidates
  document.querySelectorAll('.pin').forEach(el => {
    const r = { uid: el.dataset.uid, pinId: el.dataset.pin };
    if (pinAlreadyUsed(r)) return;
    if (pinsCompatible(state.selectedPin, r)) el.classList.add('compatible');
  });
}

function drawBoard(layer) {
  const b = BOARDS[state.boardId];
  const g = $svg('g', {
    class: 'part board',
    transform: `translate(${state.boardPos.x},${state.boardPos.y})`
  });
  g.dataset.uid = 'board';
  layer.appendChild(g);

  const bg = $svg('rect', { class: 'part-bg board', x: 0, y: 0,
    width: b.width, height: b.height, rx: 12 });
  g.appendChild(bg);

  // chip area
  const chip = $svg('rect', {
    x: b.width / 2 - 28, y: 70, width: 56, height: 56, rx: 6, fill: '#0c0e13'
  });
  g.appendChild(chip);

  const lbl = $svg('text', { class: 'part-label', x: b.width / 2, y: 30 });
  lbl.textContent = b.label.split(' ')[0];
  g.appendChild(lbl);
  const sub = $svg('text', { class: 'part-sublabel', x: b.width / 2, y: 46 });
  sub.textContent = b.chip.toUpperCase();
  g.appendChild(sub);

  // pins
  b.pins.forEach(p => {
    const isLeft = p.side === 'left';
    const cx = isLeft ? 0 : b.width;
    const cy = p.y;
    const pin = $svg('circle', {
      class: 'pin', cx, cy, r: 5,
      fill: PIN_COLORS[p.role] || '#888',
      stroke: '#1e2229', 'stroke-width': 1.5
    });
    pin.dataset.uid = 'board';
    pin.dataset.pin = p.id;
    pin.addEventListener('click', e => {
      e.stopPropagation();
      onPinClick({ uid: 'board', pinId: p.id });
    });
    g.appendChild(pin);
    const lblX = isLeft ? cx + 9 : cx - 9;
    const labelEl = $svg('text', { class: 'pin-label', x: lblX, y: cy + 3,
      'text-anchor': isLeft ? 'start' : 'end' });
    labelEl.textContent = p.label;
    g.appendChild(labelEl);
  });

  // board itself is draggable
  enableDrag(g, null);
}

function drawComponent(layer, c) {
  const def = COMPONENTS[c.type];
  const g = $svg('g', { class: 'part', transform: `translate(${c.x},${c.y})` });
  g.dataset.uid = c.uid;
  layer.appendChild(g);

  const bg = $svg('rect', { class: 'part-bg', x: 0, y: 0,
    width: def.width, height: def.height, rx: 8 });
  g.appendChild(bg);

  const lbl = $svg('text', { class: 'part-label', x: def.width / 2, y: def.height / 2 - 4 });
  lbl.textContent = def.label.split(' (')[0];
  g.appendChild(lbl);
  const sub = $svg('text', { class: 'part-sublabel', x: def.width / 2, y: def.height / 2 + 14 });
  sub.textContent = c.uid;
  g.appendChild(sub);

  // delete button (top-right)
  const del = $svg('g', { class: 'part-delete' });
  const dx = def.width - 14, dy = -3;
  const dcirc = $svg('circle', { cx: dx, cy: dy, r: 9, fill: '#ff5252' });
  const dtxt = $svg('text', {
    x: dx, y: dy + 4, 'text-anchor': 'middle',
    'font-size': 13, 'font-weight': 700, fill: '#fff'
  });
  dtxt.textContent = '×';
  del.appendChild(dcirc);
  del.appendChild(dtxt);
  del.addEventListener('click', e => { e.stopPropagation(); removeComponent(c.uid); });
  g.appendChild(del);

  // pins on top edge
  def.pins.forEach(p => {
    const pin = $svg('circle', {
      class: 'pin', cx: p.x, cy: 0, r: 5,
      fill: PIN_COLORS[p.role] || '#888',
      stroke: '#1e2229', 'stroke-width': 1.5
    });
    pin.dataset.uid = c.uid;
    pin.dataset.pin = p.id;
    pin.addEventListener('click', e => {
      e.stopPropagation();
      onPinClick({ uid: c.uid, pinId: p.id });
    });
    g.appendChild(pin);
    const lblEl = $svg('text', { class: 'pin-label', x: p.x, y: -10, 'text-anchor': 'middle' });
    lblEl.textContent = p.label;
    g.appendChild(lblEl);
  });

  // drag handler
  enableDrag(g, c);
}

function drawWire(layer, w, idx) {
  const a = pinAbsolutePos(w.from);
  const b = pinAbsolutePos(w.to);
  if (!a || !b) return;
  const rA = pinRoleOf(w.from), rB = pinRoleOf(w.to);
  const color = wireColorFor(rA, rB);
  // S-shaped curve via cubic Bezier
  const dx = (b.x - a.x) * 0.5;
  const c1x = a.x + dx, c1y = a.y - 40;
  const c2x = b.x - dx, c2y = b.y - 40;
  const path = $svg('path', {
    class: 'wire',
    d: `M ${a.x} ${a.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${b.x} ${b.y}`,
    stroke: color
  });
  path.addEventListener('click', e => {
    e.stopPropagation();
    if (confirm('Delete this wire?')) deleteWire(idx);
  });
  layer.appendChild(path);
}

// ===================== DRAGGING (global handler, no per-part leaks) =====================
const drag = { active: false, target: null, startX: 0, startY: 0, origX: 0, origY: 0 };

function enableDrag(g, c) {
  g.addEventListener('mousedown', e => {
    if (e.target.classList.contains('pin')) return;
    if (e.target.closest('.part-delete')) return;
    drag.active = true;
    drag.target = c || 'board';
    drag.startX = e.clientX; drag.startY = e.clientY;
    if (c) { drag.origX = c.x; drag.origY = c.y; }
    else { drag.origX = state.boardPos.x; drag.origY = state.boardPos.y; }
    e.preventDefault();
  });
}

document.addEventListener('mousemove', e => {
  if (!drag.active) return;
  const ctm = $('canvas').getScreenCTM();
  const scale = ctm.a || 1;
  const dx = (e.clientX - drag.startX) / scale;
  const dy = (e.clientY - drag.startY) / scale;
  if (drag.target === 'board') {
    state.boardPos.x = drag.origX + dx;
    state.boardPos.y = drag.origY + dy;
  } else {
    drag.target.x = drag.origX + dx;
    drag.target.y = drag.origY + dy;
  }
  render();
});
document.addEventListener('mouseup', () => { drag.active = false; drag.target = null; });

// ===================== TAB SWITCHING (right panel) =====================
document.querySelectorAll('.output-panel .tab').forEach(t => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.output-panel .tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    const target = t.dataset.tab;
    document.querySelectorAll('[data-tab-pane]').forEach(p => {
      p.classList.toggle('hidden', p.dataset.tabPane !== target);
    });
  });
});

// ===================== CODE GENERATION =====================
function findWireFromComponentPin(componentUid, pinId) {
  return state.wires.find(w =>
    (w.from.uid === componentUid && w.from.pinId === pinId) ||
    (w.to.uid === componentUid && w.to.pinId === pinId)
  );
}

function otherEnd(wire, uid) {
  if (wire.from.uid === uid) return wire.to;
  return wire.from;
}

function dataPinForComponent(comp) {
  // First non-power, non-ground, non-I2C pin wired to a board GPIO
  const def = COMPONENTS[comp.type];
  for (const p of def.pins) {
    if (['power3v3', 'power5v', 'ground'].includes(p.role)) continue;
    const w = findWireFromComponentPin(comp.uid, p.id);
    if (w) {
      const other = otherEnd(w, comp.uid);
      if (other.uid === 'board') return other.pinId;
    }
  }
  return null;
}

function generateSketch() {
  const board = BOARDS[state.boardId];
  const includes = new Set(board.headers);
  const decls = [];
  const setups = [];
  const loops = [];

  state.components.forEach(c => {
    const def = COMPONENTS[c.type];
    def.code.includes.forEach(i => includes.add(`#include <${i}>`));
    const dataPin = dataPinForComponent(c);
    const pinExpr = dataPin ? `${formatPinForBoard(dataPin)}` : 'UNCONFIGURED';

    if (def.code.decl) {
      const line = def.code.decl(c.uid, pinExpr);
      if (line) decls.push(line);
    }
    if (def.code.setup) {
      const line = def.code.setup(c.uid, pinExpr);
      if (line) setups.push('  ' + line.replace(/\n/g, '\n  '));
    }
    if (def.code.loop) {
      const line = def.code.loop(c.uid, pinExpr);
      if (line) loops.push('  ' + line.replace(/\n/g, '\n  '));
    }
  });

  const header = `// Auto-generated by IoTree Web IDE
// Board: ${board.label}
// Components: ${state.components.length}, Wires: ${state.wires.length}

`;
  const inc = Array.from(includes).join('\n');
  const declBlock = decls.length ? '\n\n' + decls.join('\n') : '';

  const setupBlock = setups.length
    ? `\n\nvoid setup() {\n  Serial.begin(115200);\n${setups.join('\n')}\n}`
    : `\n\nvoid setup() {\n  Serial.begin(115200);\n}`;

  const loopBlock = loops.length
    ? `\n\nvoid loop() {\n${loops.join('\n')}\n  delay(1000);\n}`
    : `\n\nvoid loop() {\n  delay(1000);\n}`;

  return header + inc + declBlock + setupBlock + loopBlock + '\n';
}

function formatPinForBoard(pinId) {
  const chip = BOARDS[state.boardId].chip;
  if (chip === 'esp8266') {
    // pin like "D1" maps to NodeMCU's D1 macro
    if (/^D\d$|^A0$/.test(pinId)) return pinId;
    return pinId;
  }
  // ESP32, RP2040: raw GPIO number (strip 'GP' / 'D' prefix)
  return pinId.replace(/^GP/, '').replace(/^D(\d)/, '$1');
}

function collectLibraries() {
  const libs = new Set();
  state.components.forEach(c => {
    const def = COMPONENTS[c.type];
    def.libraries.forEach(l => libs.add(l));
  });
  return Array.from(libs);
}

function refreshOutput() {
  const code = generateSketch();
  const codeEl = $('codeOutput');
  codeEl.innerHTML = highlightCpp(code);

  // libraries
  const libs = collectLibraries();
  const ul = $('libsList');
  ul.innerHTML = '';
  if (!libs.length) {
    const li = document.createElement('li');
    li.className = 'nolib';
    li.textContent = 'No external libraries needed for the current components.';
    ul.appendChild(li);
  } else {
    libs.forEach(l => {
      const li = document.createElement('li');
      li.innerHTML = `<code>${l}</code>`;
      ul.appendChild(li);
    });
  }

  // wires table
  const tbody = $('wiresList');
  tbody.innerHTML = '';
  state.wires.forEach((w, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${wireEndLabel(w.from)}</td>
                    <td>${wireEndLabel(w.to)}</td>
                    <td><button class="wire-del" title="Delete wire">×</button></td>`;
    tr.querySelector('.wire-del').addEventListener('click', () => deleteWire(idx));
    tbody.appendChild(tr);
  });
}

function wireEndLabel(ref) {
  if (ref.uid === 'board') return `board:${ref.pinId}`;
  const c = state.components.find(x => x.uid === ref.uid);
  if (!c) return ref.uid + ':' + ref.pinId;
  return `${c.type}/${c.uid}:${ref.pinId}`;
}

function highlightCpp(code) {
  return code.replace(/[&<>]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[c]))
    .replace(/\/\/[^\n]*/g, m => `<span class="com">${m}</span>`)
    .replace(/"[^"]*"/g, m => `<span class="str">${m}</span>`)
    .replace(/\b(const|void|int|float|bool|true|false|if|else|while|for|return|delay|Serial|pinMode|digitalWrite|digitalRead|analogRead|analogWrite|OUTPUT|INPUT|INPUT_PULLUP|HIGH|LOW)\b/g,
      '<span class="kw">$1</span>')
    .replace(/\b(uint8_t|uint16_t|uint32_t|unsigned long|long|String|DHT|OneWire|DallasTemperature|Adafruit_BMP280|Adafruit_MPU6050|Adafruit_SSD1306|LiquidCrystal_I2C|Servo)\b/g,
      '<span class="type">$1</span>')
    .replace(/\b(\d+(\.\d+)?)\b/g, '<span class="num">$1</span>');
}

// ===================== LOCAL SIMULATOR INTEGRATION =====================
let simComponents = {};   // uid -> { type, state, runtime }
const SIM_STATE_PILL = { idle:'stopped', running:'running', paused:'paused', error:'error' };

function buildPinMap() {
  // Returns: { boardPinId → { componentUid, componentPin } }
  const map = {};
  state.wires.forEach(w => {
    let boardEnd, otherEnd;
    if (w.from.uid === 'board') { boardEnd = w.from; otherEnd = w.to; }
    else if (w.to.uid === 'board') { boardEnd = w.to; otherEnd = w.from; }
    else return;
    // Use the board pin's id in code-formatted form (D1, A0, raw GPIO number)
    const boardPin = formatPinForBoard(boardEnd.pinId);
    map[boardPin] = { componentUid: otherEnd.uid, componentPin: otherEnd.pinId };
  });
  return map;
}

function buildSimComponents() {
  simComponents = {};
  state.components.forEach(c => {
    const def = COMPONENTS[c.type];
    if (!def.runtime) return;
    const initialState = typeof def.runtime.state === 'function'
      ? def.runtime.state() : { ...(def.runtime.state || {}) };
    simComponents[c.uid] = {
      type: c.type,
      state: initialState,
      runtime: def.runtime
    };
  });
}

function setSimStatus(kind, msg) {
  const el = $('simStatus');
  el.className = 'sim-state ' + kind;
  el.textContent = msg || SIM_STATE_PILL[kind];
}

function renderWidgets() {
  const list = $('simWidgets');
  list.innerHTML = '';
  if (!Object.keys(simComponents).length) {
    list.innerHTML = '<div class="muted small" style="padding:12px">No simulatable components on the canvas yet. Add a potentiometer, button, LED, relay, etc.</div>';
    return;
  }
  Object.entries(simComponents).forEach(([uid, comp]) => {
    const def = COMPONENTS[comp.type];
    const row = document.createElement('div');
    row.className = 'widget-row';
    row.dataset.uid = uid;

    const label = comp.state.label || def.label.split(' (')[0];
    row.innerHTML = `<div class="widget-name">${uid}<small>${label}</small></div>`;

    const ctl = document.createElement('div');
    ctl.className = 'widget-ctl';
    row.appendChild(ctl);
    buildWidgetControl(ctl, uid, comp);
    list.appendChild(row);
  });
}

function buildWidgetControl(ctl, uid, comp) {
  const widget = comp.runtime.widget;
  if (widget === 'slider') {
    const max = comp.state.max || 1023;
    const sl = document.createElement('input');
    sl.type = 'range'; sl.min = 0; sl.max = max; sl.value = comp.state.value;
    const val = document.createElement('span');
    val.className = 'widget-val'; val.textContent = comp.state.value;
    sl.addEventListener('input', e => {
      comp.state.value = +e.target.value;
      val.textContent = comp.state.value;
    });
    ctl.appendChild(sl); ctl.appendChild(val);
  }
  else if (widget === 'momentary') {
    const btn = document.createElement('button');
    btn.className = 'pressbtn';
    btn.textContent = 'Press & hold';
    const press   = () => { comp.state.pressed = true; btn.classList.add('pressed'); };
    const release = () => { comp.state.pressed = false; btn.classList.remove('pressed'); };
    btn.addEventListener('mousedown', press);
    btn.addEventListener('mouseup', release);
    btn.addEventListener('mouseleave', release);
    btn.addEventListener('touchstart', e => { e.preventDefault(); press(); });
    btn.addEventListener('touchend',   e => { e.preventDefault(); release(); });
    ctl.appendChild(btn);
  }
  else if (widget === 'toggle') {
    const lbl = document.createElement('label');
    lbl.className = 'switch';
    lbl.innerHTML = `<input type="checkbox"${comp.state.on ? ' checked' : ''}> <span>${comp.state.on ? 'ON' : 'OFF'}</span>`;
    const cb = lbl.querySelector('input');
    const text = lbl.querySelector('span');
    cb.addEventListener('change', e => {
      comp.state.on = e.target.checked;
      text.textContent = comp.state.on ? 'ON' : 'OFF';
    });
    ctl.appendChild(lbl);
  }
  else if (widget === 'led' || widget === 'relay' || widget === 'buzzer') {
    const dot = document.createElement('span');
    dot.className = 'led-dot ' + widget;
    const val = document.createElement('span');
    val.className = 'widget-val';
    val.textContent = 'OFF';
    ctl.appendChild(dot); ctl.appendChild(val);
  }
  else if (widget === 'servo') {
    const wrap = document.createElement('span');
    wrap.className = 'servo-arm';
    wrap.innerHTML = `<svg viewBox="0 0 30 30"><circle cx="15" cy="15" r="13" fill="none" stroke="#5aa9ff" stroke-width="1.5"/><line class="servo-line" x1="15" y1="15" x2="28" y2="15" stroke="#7cd992" stroke-width="2"/></svg>`;
    const val = document.createElement('span');
    val.className = 'widget-val'; val.textContent = '0°';
    ctl.appendChild(wrap); ctl.appendChild(val);
  }
}

function updateWidget(uid, compState) {
  const row = document.querySelector(`.widget-row[data-uid="${uid}"]`);
  if (!row) return;
  const dot = row.querySelector('.led-dot');
  const val = row.querySelector('.widget-val');
  const comp = simComponents[uid];
  if (!comp) return;
  const widget = comp.runtime.widget;
  if (widget === 'led' || widget === 'dc-motor') {
    if (dot) dot.classList.toggle('on', compState.lit);
    if (val) val.textContent = compState.lit ? `ON (${compState.brightness || 255})` : 'OFF';
  }
  else if (widget === 'relay') {
    if (dot) dot.classList.toggle('on', compState.on);
    if (val) val.textContent = compState.on ? 'CLOSED' : 'OPEN';
  }
  else if (widget === 'buzzer') {
    if (dot) dot.classList.toggle('on', compState.active);
    if (val) val.textContent = compState.active ? 'BEEP' : 'silent';
  }
  else if (widget === 'servo') {
    const line = row.querySelector('.servo-line');
    if (line) {
      const a = ((compState.angle || 0) - 90) * Math.PI / 180;
      line.setAttribute('x2', 15 + 13 * Math.cos(a));
      line.setAttribute('y2', 15 + 13 * Math.sin(a));
    }
    if (val) val.textContent = (compState.angle | 0) + '°';
  }
}

async function startSimulation() {
  // Switch to simulator tab so the user sees output
  document.querySelector('.tab[data-tab="sim"]').click();
  $('simSerial').textContent = '';

  buildSimComponents();
  renderWidgets();

  const pinMap = buildPinMap();
  const sketch = generateSketch();

  $('runSimBtn').hidden = true;
  $('pauseSimBtn').hidden = false;
  $('pauseSimBtn').textContent = '⏸ Pause';
  $('stopSimBtn').hidden = false;
  setSimStatus('running');

  await SimEngine.run(sketch, pinMap, simComponents, {
    onSerial: text => { $('simSerial').textContent = text; $('simSerial').scrollTop = 1e9; },
    onPinWrite: (pin, val, kind) => {},
    onComponentState: (uid, compState) => updateWidget(uid, compState),
    onError: msg => { setSimStatus('error', msg); }
  });

  // run() returns when sim ends or errors out
  if (SimEngine.isRunning() === false) {
    $('runSimBtn').hidden = false;
    $('pauseSimBtn').hidden = true;
    $('stopSimBtn').hidden = true;
    if (!$('simStatus').classList.contains('error')) setSimStatus('idle');
  }
}

function pauseSimulation() {
  const nowPaused = !SimEngine.isPaused();
  SimEngine.setPaused(nowPaused);
  $('pauseSimBtn').textContent = nowPaused ? '▶ Resume' : '⏸ Pause';
  setSimStatus(nowPaused ? 'paused' : 'running');
}

function stopSimulation() {
  SimEngine.stop();
  $('runSimBtn').hidden = false;
  $('pauseSimBtn').hidden = true;
  $('stopSimBtn').hidden = true;
  setSimStatus('idle');
}

// ===================== WOKWI EXPORT (still available via Download) =====================
function exportWokwi() {
  const board = BOARDS[state.boardId];
  const parts = [{
    type: board.wokwiType, id: 'board',
    top: 0, left: 0, rotate: 0, attrs: {}
  }];
  state.components.forEach((c, i) => {
    const def = COMPONENTS[c.type];
    parts.push({
      type: def.wokwiType, id: c.uid,
      top: -180 - i * 40, left: -120 + (i % 3) * 130,
      attrs: {}
    });
  });
  const connections = state.wires.map(w => {
    const a = w.from.uid === 'board' ? `board:${w.from.pinId}` : `${w.from.uid}:${w.from.pinId}`;
    const b = w.to.uid === 'board' ? `board:${w.to.pinId}` : `${w.to.uid}:${w.to.pinId}`;
    const rA = pinRoleOf(w.from), rB = pinRoleOf(w.to);
    return [a, b, wireColorFor(rA, rB), []];
  });

  const diagram = {
    version: 1,
    author: 'IoTree Web IDE',
    editor: 'wokwi',
    parts,
    connections,
    dependencies: {}
  };

  const sketch = generateSketch();
  const libs = collectLibraries().join('\n');

  return { diagram, sketch, libraries: libs };
}

function copyCode() {
  navigator.clipboard.writeText(generateSketch()).then(() => {
    setStatus('Sketch copied to clipboard.');
  }).catch(() => {
    setStatus('Copy failed - select code manually and Ctrl+C.', 'error');
  });
}

function downloadProject() {
  const { diagram, sketch, libraries } = exportWokwi();
  const files = {
    'diagram.json': JSON.stringify(diagram, null, 2),
    'sketch.ino': sketch,
    'libraries.txt': libraries
  };
  Object.entries(files).forEach(([name, content]) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
  setStatus('Downloaded diagram.json, sketch.ino, libraries.txt.');
}

function openInWokwi() {
  const { sketch, diagram } = exportWokwi();
  // Wokwi has no project-import URL, so we copy both to clipboard
  // (separated by a sentinel) and open the new-project page.
  const payload = `// === Paste BELOW into sketch.ino ===\n\n${sketch}\n\n/* === Paste BELOW into diagram.json ===\n${JSON.stringify(diagram, null, 2)}\n*/`;
  navigator.clipboard.writeText(payload).then(() => {
    const boardUrl = wokwiUrlForBoard(state.boardId);
    setStatus('Sketch + diagram copied to clipboard. Wokwi will open in a new tab — paste both into the tabs.');
    window.open(boardUrl, '_blank', 'noopener');
  }).catch(() => {
    alert('Couldn\'t copy to clipboard - using download instead.');
    downloadProject();
  });
}

function wokwiUrlForBoard(boardId) {
  const map = {
    'esp32-devkit':     'https://wokwi.com/projects/new/esp32',
    'nodemcu-esp8266':  'https://wokwi.com/projects/new/wemos-d1-mini',
    'arduino-uno':      'https://wokwi.com/projects/new/arduino-uno',
    'rpi-pico':         'https://wokwi.com/projects/new/pi-pico'
  };
  return map[boardId] || 'https://wokwi.com/';
}

// ===================== BUTTONS =====================
$('autoWireBtn').addEventListener('click', autoWirePower);
$('clearBtn').addEventListener('click', clearAll);
$('copyCodeBtn').addEventListener('click', copyCode);
$('downloadBtn').addEventListener('click', downloadProject);
$('runSimBtn').addEventListener('click', startSimulation);
$('pauseSimBtn').addEventListener('click', pauseSimulation);
$('stopSimBtn').addEventListener('click', stopSimulation);
$('clearSimBtn').addEventListener('click', () => { $('simSerial').textContent = ''; });

// ===================== INIT =====================
populateBoards();
populateCatalog();
render();
refreshOutput();
setStatus('ready — pick a board on the right, click components on the left');
})();
