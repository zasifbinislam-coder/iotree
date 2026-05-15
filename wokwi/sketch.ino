// Smart Plant Communicator - Wokwi simulation variant
// Identical to plant_communicator.ino but with shortened timings
// so you can observe the full dry->pump->soak->alert cycle within
// a normal simulation session.

#include <ESP8266WiFi.h>
#include <WiFiClientSecure.h>
#include <UniversalTelegramBot.h>

// ---------- WOKWI CONFIG ----------
// Wokwi's virtual Wi-Fi. Do NOT change for simulation.
const char* WIFI_SSID     = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";

// Paste your real Telegram bot token + chat ID here to receive
// real messages on your phone from the simulation.
const char* BOT_TOKEN = "PASTE_BOT_TOKEN_HERE";
const char* CHAT_ID   = "PASTE_CHAT_ID_HERE";

// Calibration - Wokwi's soil sensor outputs ~0 (wet) to ~1023 (dry).
const int DRY_THRESHOLD = 700;
const int WET_FLOOR     = 300;

// Pump
const uint8_t PUMP_PIN        = D1;
const bool    PUMP_ACTIVE_LOW = true;

// Sim-tuned timings (real sketch uses minutes/hours)
const unsigned long PUMP_BURST_MS      = 3UL  * 1000UL;   // 3 s burst
const unsigned long SOAK_WAIT_MS       = 8UL  * 1000UL;   // 8 s soak
const unsigned long PUMP_COOLDOWN_MS   = 30UL * 1000UL;   // 30 s cooldown
const unsigned long SAMPLE_INTERVAL_MS = 5UL  * 1000UL;   // sample every 5 s
const uint8_t       MAX_PUMPS_PER_DAY  = 6;
// ----------------------------------

WiFiClientSecure secured_client;
UniversalTelegramBot bot(BOT_TOKEN, secured_client);

enum State { IDLE, PUMPING, SOAKING };
State state = IDLE;

unsigned long lastSampleAt    = 0;
unsigned long pumpStartedAt   = 0;
unsigned long soakStartedAt   = 0;
unsigned long lastPumpAt      = 0;
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
  for (int i = 0; i < 8; i++) { sum += analogRead(A0); delay(10); }
  return (int)(sum / 8);
}

int rawToPercent(int raw) {
  if (raw <= WET_FLOOR)     return 100;
  if (raw >= DRY_THRESHOLD) return 0;
  long pct = map(raw, WET_FLOOR, DRY_THRESHOLD, 100, 0);
  return constrain((int)pct, 0, 100);
}

void sendTelegram(const String& msg) {
  if (!bot.sendMessage(CHAT_ID, msg, "")) Serial.println("TG send failed");
}

void resetDailyWindowIfNeeded(unsigned long now) {
  const unsigned long DAY = 24UL * 60UL * 60UL * 1000UL;
  if (now - dayWindowStart >= DAY) {
    dayWindowStart  = now;
    pumpsThisWindow = 0;
  }
}

void setup() {
  Serial.begin(115200);
  delay(200);

  digitalWrite(PUMP_PIN, PUMP_ACTIVE_LOW ? HIGH : LOW);
  pinMode(PUMP_PIN, OUTPUT);
  pumpOff();

  pinMode(A0, INPUT);

  connectWifi();
  secured_client.setInsecure();

  dayWindowStart = millis();
  Serial.println("Plant agent online (SIM). Drag soil slider to test.");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWifi();

  unsigned long now = millis();
  resetDailyWindowIfNeeded(now);

  switch (state) {

    case IDLE: {
      if (lastSampleAt != 0 && (now - lastSampleAt) < SAMPLE_INTERVAL_MS) break;
      lastSampleAt = now;

      int raw = readMoistureRaw();
      int pct = rawToPercent(raw);
      Serial.printf("raw=%d  pct=%d%%\n", raw, pct);

      bool isDry        = (raw >= DRY_THRESHOLD);
      bool cooldownOver = (lastPumpAt == 0) || ((now - lastPumpAt) >= PUMP_COOLDOWN_MS);
      bool quotaLeft    = (pumpsThisWindow < MAX_PUMPS_PER_DAY);

      if (isDry && cooldownOver && quotaLeft) {
        Serial.println("DRY -> pumping");
        pumpOn();
        pumpStartedAt = now;
        state = PUMPING;
      }
      else if (isDry && !quotaLeft && cooldownOver) {
        sendTelegram("Soil still dry but daily pump quota reached. Refill tank! (" +
                     String(pct) + "%)");
        lastPumpAt = now;
      }
      break;
    }

    case PUMPING: {
      if ((now - pumpStartedAt) >= PUMP_BURST_MS) {
        pumpOff();
        Serial.println("burst done -> soaking");
        soakStartedAt = now;
        state = SOAKING;
      }
      break;
    }

    case SOAKING: {
      if ((now - soakStartedAt) >= SOAK_WAIT_MS) {
        int raw = readMoistureRaw();
        int pct = rawToPercent(raw);
        Serial.printf("post-soak raw=%d pct=%d%%\n", raw, pct);

        lastPumpAt = now;
        pumpsThisWindow++;

        if (raw >= DRY_THRESHOLD) {
          sendTelegram("Tried to water but still dry (" + String(pct) +
                       "%). Check the tank!");
        } else {
          sendTelegram("I was thirsty so I watered myself. Moisture now " +
                       String(pct) + "%.");
        }
        state = IDLE;
        lastSampleAt = now;
      }
      break;
    }
  }

  delay(50);
}
