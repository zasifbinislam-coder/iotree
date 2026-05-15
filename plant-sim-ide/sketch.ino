// Smart Plant Communicator - reference sketch for the IDE
// (Same content is bundled inside default-files.js so the IDE works offline.)

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

// Timings - the IDE simulation reads these directly.
const unsigned long PUMP_BURST_MS      = 5UL * 1000UL;
const unsigned long SOAK_WAIT_MS       = 30UL * 1000UL;
const unsigned long PUMP_COOLDOWN_MS   = 60UL * 60UL * 1000UL;
const unsigned long SAMPLE_INTERVAL_MS = 60UL * 1000UL;
const uint8_t       MAX_PUMPS_PER_DAY  = 6;
// ---------------------------------

// Full implementation lives in ../plant_communicator/plant_communicator.ino
