#include <osap.h>
#include <VL53L1X.h> // https://www.arduino.cc/reference/en/libraries/vl53l1x/ (pololu version)

#define PIN_XSHUT 29

VL53L1X sensor;

OSAP_Runtime osap;

OSAP_Gateway_USBSerial serLink(&Serial);

OSAP_Port_DeviceNames namePort("distance");

uint8_t rgb[3] = {0, 0, 255};
boolean ledState = false;

uint16_t value = 0;

size_t onDistanceReq(uint8_t* data, size_t len, uint8_t* reply){
  if (sensor.timeoutOccurred()) {
    reply[0] = 0;
  } else {
    sensor.read();
    uint16_t value = sensor.ranging_data.range_mm;
    reply[0] = 1;
    reply[1] = value & 0xFF;
    reply[2] = value >> 8 & 0xFF;
  }
  return 3;
}

void updateRGB() {
  if (ledState) {
    analogWrite(PIN_LED_R, 255-rgb[0]);
    analogWrite(PIN_LED_G, 255-rgb[1]);
    analogWrite(PIN_LED_B, 255-rgb[2]);
  } else {
    analogWrite(PIN_LED_R, 255);
    analogWrite(PIN_LED_G, 255);
    analogWrite(PIN_LED_B, 255);
  }
}

void onRGBPacket(uint8_t* data, size_t len){
  rgb[0] = data[0];
  rgb[1] = data[1];
  rgb[2] = data[2];
  ledState = true;
  updateRGB();
}

void onLEDPacket(uint8_t* data, size_t len){
  ledState = data[0] > 0;
  updateRGB();
}

OSAP_Port_Named setRGB("setRGB", onRGBPacket);
OSAP_Port_Named setLED("setLED", onLEDPacket);
OSAP_Port_Named getDistance("getDistance", onDistanceReq);

void setup() {
  osap.begin();
  analogWriteResolution(8);
  pinMode(PIN_LED_R, OUTPUT);
  pinMode(PIN_LED_G, OUTPUT);
  pinMode(PIN_LED_B, OUTPUT);
  updateRGB();
  pinMode(PIN_XSHUT, OUTPUT);
  digitalWrite(PIN_XSHUT, HIGH);
  Wire.begin();
  Wire.setClock(400000); // use 400 kHz I2C

  sensor.setTimeout(500);
  if (!sensor.init()) {
    Serial.println("Failed to detect and initialize sensor!");
    while (1);
  }

  sensor.setDistanceMode(VL53L1X::Long);
  sensor.setMeasurementTimingBudget(50000);

  sensor.startContinuous(50);
}

void loop() {
  osap.loop();
}
