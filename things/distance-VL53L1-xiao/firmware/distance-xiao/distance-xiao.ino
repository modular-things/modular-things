#include <osap.h>
#include <VL53L1X.h> // https://www.arduino.cc/reference/en/libraries/vl53l1x/ (pololu version)

#define PIN_LED_R 17
#define PIN_LED_G 16
#define PIN_LED_B 25

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

OSAP_Port_Named getDistance("getDistance", onDistanceReq);
OSAP_Port_Named setRGB("setRGB", onRGBPacket);
OSAP_Port_Named setLED("setLED", onLEDPacket);

void setup() {
  // startup the OSAP runtime,
  osap.begin();
  // setup our hardware...
  pinMode(PIN_XSHUT, OUTPUT);
  digitalWrite(PIN_XSHUT, HIGH);
  Serial.begin(0);
  Wire.begin();
  Wire.setClock(400000); // use 400 kHz I2C

  sensor.setTimeout(500);
  if (!sensor.init())
  {
    Serial.println("Failed to detect and initialize sensor!");
    while (1);
  }

  // Use long distance mode and allow up to 50000 us (50 ms) for a measurement.
  // You can change these settings to adjust the performance of the sensor, but
  // the minimum timing budget is 20 ms for short distance mode and 33 ms for
  // medium and long distance modes. See the VL53L1X datasheet for more
  // information on range and timing limits.
  sensor.setDistanceMode(VL53L1X::Long);
  sensor.setMeasurementTimingBudget(50000);

  // Start continuous readings at a rate of one measurement every 50 ms (the
  // inter-measurement period). This period should be at least as long as the
  // timing budget.
  sensor.startContinuous(50);
}

void loop() {
  osap.loop();
}
