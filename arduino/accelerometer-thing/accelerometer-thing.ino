#include <osap.h>
#include <vt_endpoint.h>
#include <vp_arduinoSerial.h>
#include <core/ts.h>
#include <Wire.h>
#include <LSM6.h>

LSM6 imu;

// type of board (firmware name)
OSAP osap("accelerometer");

// ---------------------------------------------- 0th Vertex: OSAP USB Serial
VPort_ArduinoSerial vp_arduinoSerial(&osap, "usbSerial", &Serial);

// ---------------------------------------------- 1 Vertex
boolean preQuery(void);

Endpoint accelerometerEndpoint(&osap, "accelerometerQuery", preQuery);

boolean preQuery(void) {
  imu.read();

  uint8_t* ptr;

  uint8_t buf[2 * 6];

  buf[0] = imu.a.x & 0xFF;
  buf[1] = imu.a.x >> 8 & 0xFF;

  buf[2] = imu.a.y & 0xFF;
  buf[3] = imu.a.y >> 8 & 0xFF;

  buf[4] = imu.a.z & 0xFF;
  buf[5] = imu.a.z >> 8 & 0xFF;

  buf[6] = imu.g.x & 0xFF;
  buf[7] = imu.g.x >> 8 & 0xFF;

  buf[8] = imu.g.y & 0xFF;
  buf[9] = imu.g.y >> 8 & 0xFF;

  buf[10] = imu.g.z & 0xFF;
  buf[11] = imu.g.z >> 8 & 0xFF;

  accelerometerEndpoint.write(buf, 2 * 6);
  return true;
}

void setup() {
  osap.init();
  vp_arduinoSerial.begin();

  Wire.begin();
  imu.init();
  imu.enableDefault();
}

void loop() {
  osap.loop();
}
