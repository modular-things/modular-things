#include <osap.h>
#include <LSM6.h> // by Pololu 
// #include <Wire.h>

LSM6 imu;

OSAP_Runtime osap;
OSAP_Gateway_USBSerial serLink(&Serial);
OSAP_Port_DeviceNames namePort("accelerometer");

size_t readAccGyro(uint8_t* data, size_t len, uint8_t* reply) {
  imu.read();

  reply[0] = imu.a.x & 0xFF;
  reply[1] = imu.a.x >> 8 & 0xFF;

  reply[2] = imu.a.y & 0xFF;
  reply[3] = imu.a.y >> 8 & 0xFF;

  reply[4] = imu.a.z & 0xFF;
  reply[5] = imu.a.z >> 8 & 0xFF;

  reply[6] = imu.g.x & 0xFF;
  reply[7] = imu.g.x >> 8 & 0xFF;

  reply[8] = imu.g.y & 0xFF;
  reply[9] = imu.g.y >> 8 & 0xFF;

  reply[10] = imu.g.z & 0xFF;
  reply[11] = imu.g.z >> 8 & 0xFF;

  return 2 * 6;
}

OSAP_Port_Named readAccGyro_port("readAccGyro", readAccGyro);

void setup() {
  osap.begin();

  // Wire.begin();
  imu.init();
  imu.enableDefault();
}

void loop() {
  osap.loop();
}
