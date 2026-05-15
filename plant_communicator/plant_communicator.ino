// Smart Plant Communicator
// NodeMCU ESP8266 + analog soil sensor + water-level probe + relay + DC pump + Telegram

#include <ESP8266WiFi.h>
#include <WiFiClientSecure.h>
#include <UniversalTelegramBot.h>

// ---------- USER CONFIG ----------
const char* WIFI_SSID     = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

const char* BOT_TOKEN = "PASTE_BOT_TOKEN_HERE";
const char* CHAT_ID   = "PASTE_CHAT_ID_HERE";

// Moisture calibration (see calibration steps in the wiring guide)
const int DRY_THRESHOLD = 800;   // raw >= this  -> dry
const int WET_FLOOR     = 400;   // raw <= this  -> 100% in display

// Pins
const uint8_t PUMP_PIN        = D1;   // GPIO5  - relay IN
const uint8_t TANK_LEVEL_PIN  = D2;   // GPIO4  - two stripped wires in reservoir
                                      //          one to GND, one to D2.
                                      //          Water bridges = LOW = water present.
                                      //          Open circuit = HIGH = tank empty.
const bool    PUMP_ACTIVE_LOW = true;

const unsigned long PUMP_BURST_MS    = 5UL * 1000UL;             // 5 s burst
const unsigned long SOAK_WAIT_MS     = 30UL * 1000UL;            // 30 s soak before re-check
const unsigned long PUMP_COOLDOWN_MS = 60UL * 60UL * 1000UL;     // min 1 h between bursts
const uint8_t       MAX_PUMPS_PER_DAY = 6;

const unsigned long SAMPLE_INTERVAL_MS = 60UL * 1000UL;          // read every 60 s
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

bool isTankEmpty() {
  return digitalRead(TANK_LEVEL_PIN) == HIGH;
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

  // Pre-set the de-asserted level BEFORE pinMode, so the pump never blips on boot.
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
  if (WiFi.status() != WL_CONNECTED) connectWifi();

  unsigned long now = millis();
  resetDailyWindowIfNeeded(now);

  switch (state) {

    case IDLE: {
      if (lastSampleAt != 0 && (now - lastSampleAt) < SAMPLE_INTERVAL_MS) break;
      lastSampleAt = now;

      int raw      = readMoistureRaw();
      int pct      = rawToPercent(raw);
      bool tankDry = isTankEmpty();
      Serial.printf("soil raw=%d pct=%d%% tank=%s\n",
                    raw, pct, tankDry ? "EMPTY" : "ok");

      bool isDry        = (raw >= DRY_THRESHOLD);
      bool cooldownOver = (lastPumpAt == 0) || ((now - lastPumpAt) >= PUMP_COOLDOWN_MS);
      bool quotaLeft    = (pumpsThisWindow < MAX_PUMPS_PER_DAY);

      if (isDry && tankDry) {
        // Refuse to dry-run the pump. Throttle the SOS so we don't spam.
        if (lastTankAlertAt == 0 || (now - lastTankAlertAt) >= PUMP_COOLDOWN_MS) {
          sendTelegram("Soil is dry (" + String(pct) +
                       "%) but the water tank is EMPTY. Please refill the reservoir!");
          lastTankAlertAt = now;
        }
      }
      else if (isDry && cooldownOver && quotaLeft) {
        Serial.println("DRY -> pumping");
        pumpOn();
        pumpStartedAt = now;
        state = PUMPING;
      }
      else if (isDry && !quotaLeft && cooldownOver) {
        sendTelegram("Soil still dry but I've hit my daily watering limit. "
                     "Possible blockage or sensor issue. (" + String(pct) + "%)");
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
        int raw      = readMoistureRaw();
        int pct      = rawToPercent(raw);
        bool tankDry = isTankEmpty();
        Serial.printf("post-soak raw=%d pct=%d%% tank=%s\n",
                      raw, pct, tankDry ? "EMPTY" : "ok");

        lastPumpAt = now;
        pumpsThisWindow++;

        if (raw >= DRY_THRESHOLD) {
          String msg = "I tried to water myself but soil is still dry (" + String(pct) + "%).";
          if (tankDry) msg += " Tank is empty - please refill!";
          else         msg += " Check the tube or pump.";
          sendTelegram(msg);
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
