#include <osap.h>
#include <vt_endpoint.h>
#include <vp_arduinoSerial.h>
#include <core/ts.h>
#include <Wire.h>
#include <VL53L1X.h> // https://www.arduino.cc/reference/en/libraries/vl53l1x/ (pololu version)

VL53L1X sensor;

// type of board (firmware name)
OSAP osap("timeOfFlight");

// ---------------------------------------------- 0th Vertex: OSAP USB Serial
VPort_ArduinoSerial vp_arduinoSerial(&osap, "usbSerial", &Serial);

// ---------------------------------------------- 1 Vertex
boolean preTOFQuery(void);

Endpoint tofEndpoint(&osap, "tofQuery", preTOFQuery);

boolean preTOFQuery(void) {
  uint8_t buf[2];
  sensor.read();
  uint16_t value = sensor.ranging_data.range_mm;
  buf[0] = value & 0xFF;
  buf[1] = value >> 8 & 0xFF;
  tofEndpoint.write(buf, 2);
  return true;
}

void setup() {
  osap.init();
  vp_arduinoSerial.begin();

  Wire.begin();
  Wire.setClock(400000); // 400 KHz I2C
  sensor.setTimeout(500);
  sensor.init();

  sensor.setDistanceMode(VL53L1X::Long);
  sensor.setMeasurementTimingBudget(50000);
  sensor.startContinuous(50);
}

void loop() {
  osap.loop();
}
