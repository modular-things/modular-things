#include <osap.h>
#include <VL53L1X.h> // https://www.arduino.cc/reference/en/libraries/vl53l1x/ (pololu version)
#include <Wire.h>

VL53L1X sensor;

OSAP_Runtime osap;
OSAP_Gateway_USBSerial serLink(&Serial);
OSAP_Port_DeviceNames namePort("timeOfFlight");

size_t readDistance(uint8_t* data, size_t len, uint8_t* reply) {
  if(sensor.timeoutOccurred()){
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

OSAP_Port_Named readDistance_port("readDistance", readDistance);

// TODO: bugfix
/*
* some trouble with the board / I2C
* behaviour is... first time we program the board, it works as expects
* all subsequent times (unplug, plug back in...) the I2C times out...
* so... go looking for flash bugs, IDK ? 
* bug appears whether / not we write a new name to flash... 
*/

void setup() {
  osap.begin();

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
