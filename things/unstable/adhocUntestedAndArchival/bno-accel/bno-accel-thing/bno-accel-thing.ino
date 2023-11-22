// #include <osap.h>
// #include <LSM6.h> // by Pololu 

#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BNO055.h>
#include <utility/imumaths.h>
#include <osap.h>
#include "maxl.h"

// our bno 
Adafruit_BNO055 bno = Adafruit_BNO055(55, 0x28, &Wire);

// maxl instance, for timing 
MAXL maxl; 

// our comms 
OSAP_Runtime osap;
OSAP_Gateway_USBSerial serLink(&Serial);
OSAP_Port_DeviceNames namePort("maxlAccelerometer");
OSAP_Port_MessageEscape debugPort;

// ---------------------------------------------- MAXL over MUTTS 

size_t maxlMessageInterface(uint8_t* data, size_t len, uint8_t* reply){
  return maxl.messageHandler(data, len, reply);
}

OSAP_Port_Named maxlMessage_port("maxlMessages", maxlMessageInterface);

// ---------------------------------------------- Pipe!

OSAP_Port_OnePipe linearAccelPipe("linearAcceleration");

// ... 

bool bnoInitOK = false;

void setup() {
  osap.begin();
  maxl.begin();
  osap.attachDebugFunction(debugPort.escape);
  // setup and wait for serial 
  // Serial.begin(0);
  // while(!Serial) delay(10);
  // startup 
  if(bno.begin()){
    bnoInitOK = true;
    bno.setMode(OPERATION_MODE_ACCONLY);
  }
  // we'll blink the user-led 
  pinMode(LED_BUILTIN, OUTPUT);
}

uint32_t lastBlink = 0;
uint32_t intervalBlink = 10;
uint8_t datagram[256];

void loop() {
  // lewp 
  osap.loop();
  // blinky / act 
  if(millis() > lastBlink + intervalBlink){
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
    lastBlink = millis();
    if(bnoInitOK){
      sensors_event_t linearAccelData;
      bno.getEvent(&linearAccelData, Adafruit_BNO055::VECTOR_LINEARACCEL);
      // and let's write it to the pipe... 
      uint16_t wptr = 0;
      ts_writeUint32(maxl.getSystemTime(), datagram, &wptr);
      ts_writeFloat32(linearAccelData.acceleration.x, datagram, &wptr);
      ts_writeFloat32(linearAccelData.acceleration.y, datagram, &wptr);
      ts_writeFloat32(linearAccelData.acceleration.z, datagram, &wptr);
      linearAccelPipe.write(datagram, wptr);
      // ok ok and for bonus measure 
      // OSAP_DEBUG(String(linearAccelData.acceleration.x));
    } else {
      OSAP_DEBUG("init failed");
    }
    // printEvent(&linearAccelData);
  }
}

// void printEvent(sensors_event_t* event) {
//   double x = -1000000, y = -1000000 , z = -1000000; //dumb values, easy to spot problem
//   if (event->type == SENSOR_TYPE_ACCELEROMETER) {
//     Serial.print("Accl:");
//     x = event->acceleration.x;
//     y = event->acceleration.y;
//     z = event->acceleration.z;
//   }
//   else if (event->type == SENSOR_TYPE_ORIENTATION) {
//     Serial.print("Orient:");
//     x = event->orientation.x;
//     y = event->orientation.y;
//     z = event->orientation.z;
//   }
//   else if (event->type == SENSOR_TYPE_MAGNETIC_FIELD) {
//     Serial.print("Mag:");
//     x = event->magnetic.x;
//     y = event->magnetic.y;
//     z = event->magnetic.z;
//   }
//   else if (event->type == SENSOR_TYPE_GYROSCOPE) {
//     Serial.print("Gyro:");
//     x = event->gyro.x;
//     y = event->gyro.y;
//     z = event->gyro.z;
//   }
//   else if (event->type == SENSOR_TYPE_ROTATION_VECTOR) {
//     Serial.print("Rot:");
//     x = event->gyro.x;
//     y = event->gyro.y;
//     z = event->gyro.z;
//   }
//   else if (event->type == SENSOR_TYPE_LINEAR_ACCELERATION) {
//     Serial.print("Linear:");
//     x = event->acceleration.x;
//     y = event->acceleration.y;
//     z = event->acceleration.z;
//   }
//   else if (event->type == SENSOR_TYPE_GRAVITY) {
//     Serial.print("Gravity:");
//     x = event->acceleration.x;
//     y = event->acceleration.y;
//     z = event->acceleration.z;
//   }
//   else {
//     Serial.print("Unk:");
//   }

//   Serial.print("\tx= ");
//   Serial.print(x);
//   Serial.print(" |\ty= ");
//   Serial.print(y);
//   Serial.print(" |\tz= ");
//   Serial.println(z);
// }