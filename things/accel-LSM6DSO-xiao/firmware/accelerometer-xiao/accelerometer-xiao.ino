#include <osap.h>
#include <Arduino_LSM6DSOX.h>

OSAP_Runtime osap;
OSAP_Gateway_USBSerial serLink(&Serial);
OSAP_Port_DeviceNames namePort("accelerometer");

uint8_t rgb[3] = {0, 0, 255};
boolean ledState = false;

typedef union {
  float floats[6];
  uint8_t bytes[24];
} FLOATUNION_t;

float x=0;
float y=0;
float z=0;
float rx=0;
float ry=0;
float rz=0;

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

size_t readAccGyro(uint8_t* data, size_t len, uint8_t* reply) {
  FLOATUNION_t values;
  values.floats[0] = x;
  values.floats[1] = y;
  values.floats[2] = z;
  values.floats[3] = rx;
  values.floats[4] = ry;
  values.floats[5] = rz;

  memcpy(reply, values.bytes, sizeof(values.bytes));

  return sizeof(values.bytes);
}

OSAP_Port_Named setRGB("setRGB", onRGBPacket);
OSAP_Port_Named setLED("setLED", onLEDPacket);
OSAP_Port_Named readAccGyro_port("readAccGyro", readAccGyro);

void setup() {
  osap.begin();
  analogWriteResolution(8);
  pinMode(PIN_LED_R, OUTPUT);
  pinMode(PIN_LED_G, OUTPUT);
  pinMode(PIN_LED_B, OUTPUT);
  updateRGB();

  IMU.begin();
}

void loop() {
  if (IMU.accelerationAvailable()) {
    IMU.readAcceleration(x, y, z);
  }
  if (IMU.gyroscopeAvailable()) {
    IMU.readGyroscope(rx, ry, rz);
  }
  osap.loop();
}
