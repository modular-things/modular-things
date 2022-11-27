#include <osap.h>
#include <vt_endpoint.h>
#include <vp_arduinoSerial.h>
#include <core/ts.h>
#include <Wire.h>
#include <Arduino_LSM6DSOX.h>

// type of board (firmware name)
OSAP osap("accelerometer");

// ---------------------------------------------- 0th Vertex: OSAP USB Serial
VPort_ArduinoSerial vp_arduinoSerial(&osap, "usbSerial", &Serial);

// ---------------------------------------------- 1 Vertex
boolean preQuery(void);

Endpoint accelerometerEndpoint(&osap, "accelerometerQuery", preQuery);

boolean preQuery(void) {
  float x, y, z;
  float rx, ry, rz;
  IMU.readAcceleration(x, y, z);
  IMU.readGyroscope(rx, ry, rz);

  uint8_t* ptr;

  uint8_t buf[4 * 6];

  ptr = (uint8_t*)&x;
  buf[0] = *ptr;
  buf[1] = *(ptr+1);
  buf[2] = *(ptr+2);
  buf[3] = *(ptr+3);

  ptr = (uint8_t*)&y;
  buf[4] = *ptr;
  buf[5] = *(ptr+1);
  buf[6] = *(ptr+2);
  buf[7] = *(ptr+3);

  ptr = (uint8_t*)&z;
  buf[8] = *ptr;
  buf[9] = *(ptr+1);
  buf[10] = *(ptr+2);
  buf[11] = *(ptr+3);

  ptr = (uint8_t*)&rx;
  buf[12] = *ptr;
  buf[13] = *(ptr+1);
  buf[14] = *(ptr+2);
  buf[15] = *(ptr+3);

  ptr = (uint8_t*)&ry;
  buf[16] = *ptr;
  buf[17] = *(ptr+1);
  buf[18] = *(ptr+2);
  buf[19] = *(ptr+3);

  ptr = (uint8_t*)&rz;
  buf[20] = *ptr;
  buf[21] = *(ptr+1);
  buf[22] = *(ptr+2);
  buf[23] = *(ptr+3);

  accelerometerEndpoint.write(buf, 4 * 6);
  return true;
}

void setup() {
  osap.init();
  vp_arduinoSerial.begin();

  IMU.begin();
}

void loop() {
  osap.loop();
}
