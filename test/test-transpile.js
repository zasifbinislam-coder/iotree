// Smoke test for the C++ → JS transpiler.
// Tests the patterns the real IDE will see from typical Arduino sketches.
//
//   node test/test-transpile.js

const fs = require('fs');
const path = require('path');

// Load sim-engine.js. It assigns to window.SimEngine.
const window = {};
const src = fs.readFileSync(path.join(__dirname, '..', 'web-ide', 'sim-engine.js'), 'utf8');
new Function('window', 'performance', src)(window, { now: () => 0 });
const { transpile } = window.SimEngine;

const cases = [
  {
    name: 'blink',
    cpp: `void setup() {
  Serial.begin(115200);
  pinMode(13, OUTPUT);
}
void loop() {
  digitalWrite(13, HIGH);
  delay(500);
  digitalWrite(13, LOW);
  delay(500);
}`,
    expectIncludes: ['async function setup', 'async function loop',
                     'await __delay(500)', 'pinMode(13, OUTPUT)']
  },
  {
    name: 'counter with const',
    cpp: `const int LED = 13;
int counter = 0;
void setup() { pinMode(LED, OUTPUT); }
void loop() {
  counter++;
  Serial.println(counter);
  delay(1000);
}`,
    expectIncludes: ['const LED = 13', 'let counter = 0',
                     'await __delay(1000)', 'Serial.println(counter)']
  },
  {
    name: 'enum + State machine',
    cpp: `enum State { IDLE, RUNNING, DONE };
State state = IDLE;
void loop() {
  if (state == IDLE) state = RUNNING;
  else if (state == RUNNING) state = DONE;
}`,
    expectIncludes: ['const IDLE = 0, RUNNING = 1, DONE = 2',
                     'let state = IDLE',
                     'async function loop']
  },
  {
    name: 'numeric suffixes',
    cpp: `const unsigned long PERIOD_MS = 5UL * 1000UL;
void setup() { delay(PERIOD_MS); }`,
    expectIncludes: ['const PERIOD_MS = 5 * 1000', 'await __delay(PERIOD_MS)']
  },
  {
    name: 'preprocessor stripped',
    cpp: `#include <Servo.h>
#define MAX 100
Servo myServo;
void setup() {
  myServo.attach(9);
  myServo.write(MAX);
}`,
    expectIncludes: ['let myServo = new Servo()', 'myServo.attach(9)', 'myServo.write(MAX)'],
    expectExcludes: ['#include', '#define']
  },
  {
    name: 'arithmetic and loops',
    cpp: `void setup() { Serial.begin(115200); }
void loop() {
  for (int i = 0; i < 10; i++) {
    int v = analogRead(A0);
    Serial.println(v);
  }
  delay(100);
}`,
    expectIncludes: ['for (let i = 0; i < 10; i++)', 'let v = analogRead(A0)']
  },
  {
    name: 'class instantiation with constructor args',
    cpp: `DHT dht(4, DHT22);
void setup() { dht.begin(); }
void loop() {
  float t = dht.readTemperature();
  Serial.println(t);
}`,
    expectIncludes: ['let dht = new DHT(4, DHT22)', 'dht.begin()', 'let t = dht.readTemperature()']
  }
];

console.log('='.repeat(60));
console.log('Transpiler test suite');
console.log('='.repeat(60));
let pass = 0, fail = 0;

cases.forEach(t => {
  const { js } = transpile(t.cpp);
  const missingInc = (t.expectIncludes || []).filter(s => !js.includes(s));
  const presentExc = (t.expectExcludes || []).filter(s => js.includes(s));
  const ok = missingInc.length === 0 && presentExc.length === 0;
  if (ok) {
    console.log(`\x1b[32m✓\x1b[0m ${t.name}`);
    pass++;
  } else {
    console.log(`\x1b[31m✗\x1b[0m ${t.name}`);
    if (missingInc.length) console.log('   missing: ' + missingInc.join(' | '));
    if (presentExc.length) console.log('   should NOT include: ' + presentExc.join(' | '));
    console.log('   --- transpiled output ---');
    console.log(js.split('\n').map(l => '   ' + l).join('\n'));
    fail++;
  }
});

console.log('\n' + '='.repeat(60));
console.log(`Result: \x1b[32m${pass} passed\x1b[0m, \x1b[31m${fail} failed\x1b[0m`);
console.log('='.repeat(60));
process.exit(fail > 0 ? 1 : 0);
