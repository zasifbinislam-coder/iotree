// =====================================================================
// IoTree Sim Engine
// Transpiles Arduino C++ to JS, runs it against simulated pins +
// interactive sensor widgets. Not a chip emulator — a real-enough
// behavioural simulator for educational Arduino sketches.
// =====================================================================
(() => {
'use strict';

// =============== TRANSPILER ===============
// C++ → JS for the subset of Arduino we support.
function transpile(cpp) {
  let src = cpp;

  // 1. Strip preprocessor directives (#include, #define, #ifdef etc.)
  src = src.replace(/^\s*#.*$/gm, '');

  // 2. Strip block comments (preserve line breaks so line numbers don't shift)
  src = src.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ''));

  // 3. Strip numeric suffixes: 5UL → 5, 1.5f → 1.5
  src = src.replace(/(\d+)([UuLl]+)/g, '$1');
  src = src.replace(/(\d+\.\d+)[Ff]/g, '$1');

  // 4. Function definitions: `void name(args) {` → `async function name(args) {`
  //    Strip C++ types from args. Same for any other return type.
  const fnTypes = ['void','int','long','float','double','bool','char','byte',
                   'unsigned\\s+long','unsigned\\s+int','unsigned\\s+char',
                   'String','uint8_t','uint16_t','uint32_t','int8_t','int16_t','int32_t','size_t'];
  const fnTypeRe = new RegExp(`\\b(?:${fnTypes.join('|')})\\s+(\\w+)\\s*\\(([^)]*)\\)\\s*\\{`, 'g');
  const userFunctions = new Set(['setup', 'loop']);
  src = src.replace(fnTypeRe, (m, name, args) => {
    userFunctions.add(name);
    const cleanArgs = args.split(',').map(a => {
      a = a.trim();
      if (!a) return '';
      const parts = a.replace(/[*&]/g, '').split(/\s+/);
      return parts[parts.length - 1];
    }).filter(Boolean).join(', ');
    return `async function ${name}(${cleanArgs}) {`;
  });

  // 5. Variable declarations: `int x = 5;` → `let x = 5;`
  //    Multiple decls on one line: `int a, b = 2;` → `let a, b = 2;`
  //    `const int X = 5;` → `const X = 5;`
  src = src.replace(/\b(const\s+)?(?:unsigned\s+)?(?:int|long|float|double|bool|char|byte|word|String|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|size_t)\s+(?=\w)/g,
    (m, isConst) => isConst ? 'const ' : 'let ');

  // 6. enum State { IDLE, X };  →  const IDLE=0, X=1;
  src = src.replace(/\benum\s+\w+\s*\{([^}]*)\}\s*;/g, (m, body) => {
    const items = body.split(',').map(s => s.trim()).filter(Boolean);
    return 'const ' + items.map((it, i) => `${it} = ${i}`).join(', ') + ';';
  });

  // 7. `State x = IDLE;` and similar custom-type declarations.
  //    After previous step, those custom type tokens still exist - turn into `let`.
  src = src.replace(/^(\s*)([A-Z]\w*)\s+(\w+)\s*=/gm, '$1let $3 =');

  // 8. Class instantiation: `DHT dht(4, DHT22);` → `let dht = new DHT(4, DHT22);`
  const classes = ['DHT','Servo','LiquidCrystal_I2C','Adafruit_SSD1306','Adafruit_BMP280','Adafruit_MPU6050','OneWire','DallasTemperature','WiFiClientSecure','UniversalTelegramBot'];
  classes.forEach(cls => {
    const re = new RegExp(`\\b${cls}\\s+(\\w+)\\s*\\(([^)]*)\\)\\s*;`, 'g');
    src = src.replace(re, `let $1 = new ${cls}($2);`);
    // Also bare `ClassName name;` (no constructor args)
    const re2 = new RegExp(`\\b${cls}\\s+(\\w+)\\s*;`, 'g');
    src = src.replace(re2, `let $1 = new ${cls}();`);
  });

  // 9. Add `await` before blocking built-ins
  src = src.replace(/\b(delay|delayMicroseconds|pulseIn)\s*\(/g, 'await __$1(');

  // 10. Add `await` before user-defined function calls.
  //     (Skip `setup`/`loop` since those are top-level entry points.)
  userFunctions.forEach(fn => {
    if (fn === 'setup' || fn === 'loop') return;
    const re = new RegExp(`(?<![\\w.])${fn}\\s*\\(`, 'g');
    src = src.replace(re, `await ${fn}(`);
  });

  // 11. `Serial.printf("fmt %d %s", a, b)` is implemented in runtime as printf-style

  return { js: src, functions: Array.from(userFunctions) };
}


// =============== RUNTIME ===============
// State that the user sketch sees through Arduino built-ins.
const PIN_MODES = { INPUT: 0, OUTPUT: 1, INPUT_PULLUP: 2 };
const HIGH = 1, LOW = 0;

const sim = {
  running: false,
  paused: false,
  startedAt: 0,
  pinModes: {},     // pinId -> mode
  pinValues: {},    // pinId -> 0..1023 (analog) or 0/1 (digital)
  pinMap: {},       // pinId -> { componentUid, componentPin }
  components: {},   // uid -> { type, state }
  serial: [],       // list of strings appended
  onPinWrite: null, // hook for UI updates
  onSerial: null,
  onComponentState: null,
  abort: false
};

function resetSim() {
  sim.pinModes = {};
  sim.pinValues = {};
  sim.serial = [];
  sim.startedAt = performance.now();
  sim.abort = false;
}

// --- Arduino built-ins exposed to transpiled code ---
function pinMode(pin, mode) {
  sim.pinModes[pin] = mode;
  if (mode === PIN_MODES.INPUT_PULLUP && sim.pinValues[pin] === undefined) {
    sim.pinValues[pin] = 1;  // pull-up default HIGH
  }
}

function digitalWrite(pin, val) {
  sim.pinValues[pin] = val ? 1 : 0;
  routePinWrite(pin, sim.pinValues[pin], 'digital');
}

function digitalRead(pin) {
  // First, check if a wired component drives this pin
  const mapped = sim.pinMap[pin];
  if (mapped) {
    const comp = sim.components[mapped.componentUid];
    if (comp && comp.runtime && comp.runtime.onPinRead) {
      const v = comp.runtime.onPinRead(comp.state, mapped.componentPin);
      if (v !== undefined && v !== null) return v >= 1 ? 1 : 0;
    }
  }
  return sim.pinValues[pin] || 0;
}

function analogRead(pin) {
  const mapped = sim.pinMap[pin];
  if (mapped) {
    const comp = sim.components[mapped.componentUid];
    if (comp && comp.runtime && comp.runtime.onPinRead) {
      const v = comp.runtime.onPinRead(comp.state, mapped.componentPin);
      if (v !== undefined && v !== null) return v | 0;
    }
  }
  return sim.pinValues[pin] || 0;
}

function analogWrite(pin, val) {
  sim.pinValues[pin] = val;
  routePinWrite(pin, val, 'analog');
}

function routePinWrite(pin, val, kind) {
  const mapped = sim.pinMap[pin];
  if (mapped) {
    const comp = sim.components[mapped.componentUid];
    if (comp && comp.runtime && comp.runtime.onPinWrite) {
      comp.runtime.onPinWrite(comp.state, mapped.componentPin, val);
      if (sim.onComponentState) sim.onComponentState(mapped.componentUid, comp.state);
    }
  }
  if (sim.onPinWrite) sim.onPinWrite(pin, val, kind);
}

function __delay(ms) {
  return new Promise(resolve => {
    if (sim.abort) return resolve();
    setTimeout(resolve, ms);
  });
}
function __delayMicroseconds(us) { return __delay(us / 1000); }
function __pulseIn() { return 0; }  // no-op stub

function millis() { return Math.floor(performance.now() - sim.startedAt); }
function micros() { return Math.floor((performance.now() - sim.startedAt) * 1000); }

function map(x, in1, in2, out1, out2) {
  return Math.floor((x - in1) * (out2 - out1) / (in2 - in1) + out1);
}
function constrain(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

const Serial = {
  begin(_baud) {},
  print(x)   { append(String(x)); },
  println(x) { append(String(x == null ? '' : x) + '\n'); },
  printf(fmt, ...args) {
    let i = 0;
    const out = fmt.replace(/%([+\-0-9.]*)([dxsfc%])/g, (m, flags, type) => {
      if (type === '%') return '%';
      const v = args[i++];
      if (type === 'd') return String(parseInt(v, 10));
      if (type === 'x') return Number(v).toString(16);
      if (type === 'f') {
        const dec = (flags.match(/\.(\d+)/) || [, '2'])[1];
        return Number(v).toFixed(+dec);
      }
      if (type === 'c') return String.fromCharCode(v);
      return String(v);
    });
    append(out);
  }
};
function append(s) {
  // Split on newlines for per-line rendering
  s.split('\n').forEach((line, idx, arr) => {
    if (idx === 0 && sim.serial.length && !sim.serial[sim.serial.length - 1].endsWith('\n')) {
      sim.serial[sim.serial.length - 1] += line + (idx < arr.length - 1 ? '\n' : '');
    } else if (line || idx < arr.length - 1) {
      sim.serial.push(line + (idx < arr.length - 1 ? '\n' : ''));
    }
  });
  if (sim.onSerial) sim.onSerial(sim.serial.join(''));
}

// --- Stub classes for common Arduino libraries ---
class DHT {
  constructor(_pin, _type) { this.pin = _pin; }
  begin() {}
  readTemperature() { return 24 + Math.sin(millis() / 5000) * 2; }
  readHumidity()    { return 55 + Math.cos(millis() / 7000) * 5; }
}
class Servo {
  constructor() { this._pin = null; this._angle = 0; }
  attach(pin) { this._pin = pin; }
  write(angle) {
    this._angle = angle;
    if (this._pin) routePinWrite(this._pin, angle, 'pwm');
  }
}
class LiquidCrystal_I2C {
  constructor(_addr, _cols, _rows) { this._lines = ['', '']; }
  init() {}  begin() {}  backlight() {}  clear() { this._lines = ['', '']; }
  setCursor(_c, r) { this._row = r || 0; }
  print(x)   { this._lines[this._row || 0] = (this._lines[this._row || 0] || '') + String(x); }
}
class Adafruit_SSD1306 {
  constructor() { this._lines = []; }
  begin() { return true; }
  clearDisplay() { this._lines = []; }
  setTextSize() {}  setTextColor() {}  setCursor() {}
  println(x) { this._lines.push(String(x)); }
  print(x)   { this._lines.push(String(x)); }
  display() {}
}
class Adafruit_BMP280 {
  constructor() {}
  begin() { return true; }
  readTemperature() { return 23 + Math.random(); }
  readPressure()    { return 101325 + Math.random() * 200; }
}
class Adafruit_MPU6050 {
  constructor() {}
  begin() { return true; }
  getEvent() { return true; }
}
class OneWire { constructor() {} }
class DallasTemperature {
  constructor() {}
  begin() {}
  requestTemperatures() {}
  getTempCByIndex() { return 22 + Math.random(); }
}
class WiFiClientSecure { setInsecure() {} }
class UniversalTelegramBot {
  constructor() {}
  sendMessage(_chat, msg) { append(`[Telegram → would send] ${msg}\n`); return true; }
}

// Build sandbox scope for transpiled code
function buildScope() {
  return {
    pinMode, digitalWrite, digitalRead, analogRead, analogWrite,
    __delay, __delayMicroseconds, __pulseIn,
    millis, micros, map, constrain, Serial,
    DHT, Servo, LiquidCrystal_I2C, Adafruit_SSD1306,
    Adafruit_BMP280, Adafruit_MPU6050, OneWire, DallasTemperature,
    WiFiClientSecure, UniversalTelegramBot,
    INPUT: PIN_MODES.INPUT, OUTPUT: PIN_MODES.OUTPUT, INPUT_PULLUP: PIN_MODES.INPUT_PULLUP,
    HIGH, LOW,
    LED_BUILTIN: 13,
    PI: Math.PI, abs: Math.abs, sqrt: Math.sqrt, min: Math.min, max: Math.max,
    sin: Math.sin, cos: Math.cos, tan: Math.tan, pow: Math.pow,
    random: (a, b) => Math.floor(Math.random() * (b !== undefined ? (b - a) : a) + (b !== undefined ? a : 0)),
    Math
  };
}


// =============== SIMULATOR ORCHESTRATION ===============
async function run(cppSource, pinMap, components, callbacks) {
  resetSim();
  sim.pinMap = pinMap;
  sim.components = components;
  sim.onSerial = callbacks.onSerial;
  sim.onPinWrite = callbacks.onPinWrite;
  sim.onComponentState = callbacks.onComponentState;

  const { js } = transpile(cppSource);

  let setupFn, loopFn;
  const scope = buildScope();
  const scopeKeys = Object.keys(scope);
  const scopeVals = Object.values(scope);

  try {
    // Wrap user code in an async IIFE that returns setup/loop refs
    const wrappedJs = `
      ${js}
      return {
        setup: typeof setup === 'function' ? setup : null,
        loop:  typeof loop  === 'function' ? loop  : null
      };
    `;
    const factory = new Function(...scopeKeys, wrappedJs);
    const refs = factory(...scopeVals);
    setupFn = refs.setup;
    loopFn = refs.loop;
  } catch (e) {
    callbacks.onError && callbacks.onError('Parse/compile error: ' + e.message);
    if (callbacks.onSerial) callbacks.onSerial(sim.serial.join('') + '\n[ERROR] ' + e.message);
    return;
  }

  sim.running = true;
  sim.paused = false;
  sim.abort = false;
  append('[boot] sketch compiled. Starting...\n');

  try {
    if (setupFn) await setupFn();
    while (sim.running && !sim.abort) {
      if (sim.paused) { await __delay(50); continue; }
      if (loopFn) await loopFn();
      else break;
      // Always yield to UI even if user never calls delay()
      await new Promise(r => setTimeout(r, 0));
    }
  } catch (e) {
    callbacks.onError && callbacks.onError('Runtime error: ' + e.message);
    append('\n[ERROR] ' + e.message + '\n');
  }
  append('[stopped]\n');
  sim.running = false;
}

function stop() {
  sim.running = false;
  sim.abort = true;
}

function setPaused(p) { sim.paused = p; }


// =============== EXPORT TO GLOBAL ===============
window.SimEngine = {
  run,
  stop,
  setPaused,
  transpile,        // expose for debugging
  isRunning: () => sim.running,
  isPaused:  () => sim.paused
};

})();
