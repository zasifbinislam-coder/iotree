// Default files bundled with the IDE.
// Defined as strings so the IDE works offline from file:// (no fetch).

window.DEFAULT_SKETCH = `// Smart Plant Communicator
// NodeMCU ESP8266 + analog soil sensor + water-level probe + relay + Telegram

#include <ESP8266WiFi.h>
#include <WiFiClientSecure.h>
#include <UniversalTelegramBot.h>

// ---------- USER CONFIG ----------
const char* WIFI_SSID     = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

const char* BOT_TOKEN = "PASTE_BOT_TOKEN_HERE";
const char* CHAT_ID   = "PASTE_CHAT_ID_HERE";

// Moisture calibration. raw 0-1023 on ESP8266.
const int DRY_THRESHOLD = 800;
const int WET_FLOOR     = 400;

// Pins
const uint8_t PUMP_PIN        = D1;
const uint8_t TANK_LEVEL_PIN  = D2;
const bool    PUMP_ACTIVE_LOW = true;

// Timings - try changing these and hit Run to see the simulator react.
const unsigned long PUMP_BURST_MS      = 5UL * 1000UL;
const unsigned long SOAK_WAIT_MS       = 30UL * 1000UL;
const unsigned long PUMP_COOLDOWN_MS   = 60UL * 60UL * 1000UL;
const unsigned long SAMPLE_INTERVAL_MS = 60UL * 1000UL;
const uint8_t       MAX_PUMPS_PER_DAY  = 6;
// ---------------------------------

WiFiClientSecure secured_client;
UniversalTelegramBot bot(BOT_TOKEN, secured_client);

enum State { IDLE, PUMPING, SOAKING };
State state = IDLE;

unsigned long lastSampleAt    = 0;
unsigned long pumpStartedAt   = 0;
unsigned long soakStartedAt   = 0;
unsigned long lastPumpAt      = 0;
unsigned long lastTankAlertAt = 0;
unsigned long dayWindowStart  = 0;
uint8_t       pumpsThisWindow = 0;

void pumpOn()  { digitalWrite(PUMP_PIN, PUMP_ACTIVE_LOW ? LOW  : HIGH); }
void pumpOff() { digitalWrite(PUMP_PIN, PUMP_ACTIVE_LOW ? HIGH : LOW ); }

void connectWifi() {
  Serial.print("Wi-Fi");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.print(" OK, IP="); Serial.println(WiFi.localIP());
}

int readMoistureRaw() {
  long sum = 0;
  for (int i = 0; i < 8; i++) { sum += analogRead(A0); delay(20); }
  return (int)(sum / 8);
}

int rawToPercent(int raw) {
  if (raw <= WET_FLOOR)     return 100;
  if (raw >= DRY_THRESHOLD) return 0;
  long pct = map(raw, WET_FLOOR, DRY_THRESHOLD, 100, 0);
  return constrain((int)pct, 0, 100);
}

bool isTankEmpty() { return digitalRead(TANK_LEVEL_PIN) == HIGH; }

void sendTelegram(const String& msg) {
  if (!bot.sendMessage(CHAT_ID, msg, "")) Serial.println("TG send failed");
}

void setup() {
  Serial.begin(115200);
  delay(200);
  digitalWrite(PUMP_PIN, PUMP_ACTIVE_LOW ? HIGH : LOW);
  pinMode(PUMP_PIN, OUTPUT);
  pumpOff();
  pinMode(A0, INPUT);
  pinMode(TANK_LEVEL_PIN, INPUT_PULLUP);
  connectWifi();
  secured_client.setInsecure();
  dayWindowStart = millis();
  Serial.println("Plant agent online.");
}

void loop() {
  // Full FSM lives here in the real sketch (IDLE -> PUMPING -> SOAKING).
  // See plant_communicator.ino in the parent folder for the complete loop.
  // The IDE only needs the constants above to drive the simulation.
  delay(50);
}
`;

window.DEFAULT_DIAGRAM = `{
  "version": 1,
  "author": "Plant Communicator",
  "editor": "wokwi",
  "parts": [
    { "type": "board-esp32-devkit-c-v4", "id": "esp", "top": 0, "left": 0, "attrs": {} },
    { "type": "wokwi-potentiometer",    "id": "soilPot", "top": -230, "left": -210, "attrs": { "value": "1500" } },
    { "type": "wokwi-slide-switch",     "id": "tankSw",  "top": 100,  "left": -200, "attrs": {} },
    { "type": "wokwi-relay-module",     "id": "relay",   "top": -60,  "left": 220,  "attrs": {} }
  ],
  "connections": [
    [ "soilPot:VCC",  "esp:3V3",   "red",    [] ],
    [ "soilPot:GND",  "esp:GND.1", "black",  [] ],
    [ "soilPot:SIG",  "esp:34",    "yellow", [] ],
    [ "tankSw:1",     "esp:GND.2", "black",  [] ],
    [ "tankSw:2",     "esp:14",    "blue",   [] ],
    [ "relay:VCC",    "esp:VIN",   "orange", [] ],
    [ "relay:GND",    "esp:GND.2", "black",  [] ],
    [ "relay:IN",     "esp:13",    "green",  [] ]
  ],
  "dependencies": {}
}
`;
