// Default files + preset examples bundled with the IDE.
// All defined as strings so the IDE works offline from file:// (no fetch).

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

// ===== Preset examples =====
window.EXAMPLES = {
  default: {
    name: 'Default — balanced (1h cooldown, 6/day)',
    sketch: window.DEFAULT_SKETCH
  },

  fast: {
    name: 'Fast & twitchy — small bursts, low cooldown',
    sketch: `// Fast & twitchy preset
// Small frequent waterings - good for shallow pots that dry quickly.
// Watch the simulator: bursts trigger often, plant stays consistently moist.

#include <ESP8266WiFi.h>

const int DRY_THRESHOLD = 600;
const int WET_FLOOR     = 300;

const unsigned long PUMP_BURST_MS      = 2UL * 1000UL;     // 2 s burst
const unsigned long SOAK_WAIT_MS       = 10UL * 1000UL;    // 10 s soak
const unsigned long PUMP_COOLDOWN_MS   = 5UL * 60UL * 1000UL;   // 5 min cooldown
const unsigned long SAMPLE_INTERVAL_MS = 20UL * 1000UL;    // 20 s sample
const uint8_t       MAX_PUMPS_PER_DAY  = 20;

const bool    PUMP_ACTIVE_LOW = true;
`
  },

  conservative: {
    name: 'Conservative — patient, big bursts (4h cooldown)',
    sketch: `// Conservative preset
// Long deep waterings on a slow schedule - mimics how you'd water a
// houseplant manually. Plant gets thoroughly soaked, then dries down.

#include <ESP8266WiFi.h>

const int DRY_THRESHOLD = 900;
const int WET_FLOOR     = 300;

const unsigned long PUMP_BURST_MS      = 15UL * 1000UL;       // 15 s burst
const unsigned long SOAK_WAIT_MS       = 60UL * 1000UL;       // 1 min soak
const unsigned long PUMP_COOLDOWN_MS   = 4UL * 60UL * 60UL * 1000UL;  // 4 h
const unsigned long SAMPLE_INTERVAL_MS = 5UL * 60UL * 1000UL; // 5 min sample
const uint8_t       MAX_PUMPS_PER_DAY  = 3;

const bool    PUMP_ACTIVE_LOW = true;
`
  },

  cactus: {
    name: 'Cactus mode — once a day, only when very dry',
    sketch: `// Cactus / succulent preset
// Triggers only when soil is VERY dry, then one short watering per day.
// Set MAX_PUMPS_PER_DAY=1, so even if the soil dries faster than expected
// (e.g. in a heat wave), the bot will Telegram you instead of overwatering.

#include <ESP8266WiFi.h>

const int DRY_THRESHOLD = 950;   // very dry before triggering
const int WET_FLOOR     = 250;

const unsigned long PUMP_BURST_MS      = 3UL * 1000UL;        // 3 s burst
const unsigned long SOAK_WAIT_MS       = 30UL * 1000UL;
const unsigned long PUMP_COOLDOWN_MS   = 24UL * 60UL * 60UL * 1000UL;  // 24 h
const unsigned long SAMPLE_INTERVAL_MS = 30UL * 60UL * 1000UL;         // 30 min
const uint8_t       MAX_PUMPS_PER_DAY  = 1;

const bool    PUMP_ACTIVE_LOW = true;
`
  },

  esp32: {
    name: 'ESP32 — 12-bit ADC (auto-detected by IDE)',
    sketch: `// ESP32 variant
// ESP32 has a 12-bit ADC (0..4095) vs the ESP8266's 10-bit (0..1023).
// The IDE auto-detects this from threshold magnitudes and rescales display.

#include <WiFi.h>

const int DRY_THRESHOLD = 2800;   // 4x larger than ESP8266 equivalent
const int WET_FLOOR     = 1200;

const unsigned long PUMP_BURST_MS      = 5UL * 1000UL;
const unsigned long SOAK_WAIT_MS       = 30UL * 1000UL;
const unsigned long PUMP_COOLDOWN_MS   = 60UL * 60UL * 1000UL;
const unsigned long SAMPLE_INTERVAL_MS = 60UL * 1000UL;
const uint8_t       MAX_PUMPS_PER_DAY  = 6;

const bool    PUMP_ACTIVE_LOW = true;
`
  },

  bonsai: {
    name: 'Bonsai — tight calibration, gentle waterings',
    sketch: `// Bonsai / sensitive plant preset
// Tight gap between wet and dry, so the simulator shows finer % control.
// Many small waterings; never lets soil get crispy.

#include <ESP8266WiFi.h>

const int DRY_THRESHOLD = 600;
const int WET_FLOOR     = 500;   // tight 100-point band

const unsigned long PUMP_BURST_MS      = 1500UL;              // 1.5 s gentle
const unsigned long SOAK_WAIT_MS       = 20UL * 1000UL;
const unsigned long PUMP_COOLDOWN_MS   = 30UL * 60UL * 1000UL;  // 30 min
const unsigned long SAMPLE_INTERVAL_MS = 2UL * 60UL * 1000UL;   // 2 min
const uint8_t       MAX_PUMPS_PER_DAY  = 10;

const bool    PUMP_ACTIVE_LOW = true;
`
  }
};
