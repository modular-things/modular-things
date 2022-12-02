#include <osap.h>
#include <vt_endpoint.h>
#include <vp_arduinoSerial.h>
#include <core/ts.h>
#include <Servo.h>

#define PIN_SERVO 8

Servo servo;

// type of board (firmware name)
OSAP osap("servo");

// ---------------------------------------------- 0th Vertex: OSAP USB Serial
VPort_ArduinoSerial vp_arduinoSerial(&osap, "usbSerial", &Serial);

// ---------------------------------------------- 1th Vertex: String input Endpoint 
EP_ONDATA_RESPONSES onServoData(uint8_t* data, uint16_t len) {
  uint16_t pulse_us = ts_readUint16(data, 0);

  servo.writeMicroseconds(pulse_us);

  return EP_ONDATA_ACCEPT;
}

Endpoint stringEndpoint(&osap, "servoEndpoint", onServoData);

void setup() {
  osap.init();
  vp_arduinoSerial.begin();
  servo.attach(PIN_SERVO);
}

void loop() {
  osap.loop();
}
