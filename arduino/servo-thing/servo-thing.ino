#include <osap.h>
#include <Servo.h>

#define PIN_SERVO 8

Servo servo;

OSAP_Runtime osap;
OSAP_Gateway_USBSerial serLink(&Serial);
OSAP_Port_DeviceNames namePort("servo");

void setServo(uint8_t* data, uint16_t len) {
  uint16_t pulse_us = data[0] * 256 + data[1];

  servo.writeMicroseconds(pulse_us);

}

OSAP_Port_Named setServo_port("setServo", setServo);

void setup() {
  osap.begin();
  servo.attach(PIN_SERVO);
}

void loop() {
  osap.loop();
}
