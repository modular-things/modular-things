#include "maxl.h"
#include <osap.h>

// ---------------------------------------------- PROTOTYPE MAXL API THINGS 

// we'll use a MAXL object, 

MAXL maxl; 

// and we can write this func, to step our motor based on trajectory inputs... 
// YL: -ve, 
// X: -ve, 

bool _dir = true;
float stepsPerUnit = 100.0F;
float unitsPerStep = 1.0F / stepsPerUnit;
float stepModulo = 0.0F;

void aStepperListener(float position, float delta){
  // stepModulo += delta;
  // if(stepModulo > unitsPerStep){
  //   // stepper_step(1, _dir);
  //   stepModulo -= unitsPerStep;
  // } 
  // if (stepModulo < -unitsPerStep){
  //   // stepper_step(1, !_dir);
  //   stepModulo += unitsPerStep;
  // }
}

void bStepperListener(float position, float delta){

}

// and we can hand that over as an on-delta callback, 

MAXL_TrackPositionLinear stepperATrack("aStepper", aStepperListener);
MAXL_TrackPositionLinear stepperBTrack("bStepper", bStepperListener);

// ---------------------------------------------- OSAP SETUP 

OSAP_Runtime osap;
OSAP_Gateway_USBSerial serLink(&Serial);
OSAP_Port_DeviceNames namePort("haxidrawController");

// ---------------------------------------------- MAXL over MUTTS 

size_t maxlMessageInterface(uint8_t* data, size_t len, uint8_t* reply){
  return maxl.messageHandler(data, len, reply);
}

OSAP_Port_Named maxlMessage_port("maxlMessages", maxlMessageInterface);

// ---------------------------------------------- ACTU config the actual actuator 

// void writeMotorSettings(uint8_t* data, size_t len){
//   // it's just <cscale> for the time being, 
//   uint16_t rptr = 0;
//   float cscale = ts_readFloat32(data, &rptr);
//   // yarp, yarp, yarp, 
//   stepper_setCScale(cscale);
//   OSAP_DEBUG("writing cscale: " + String(cscale));
// }

// OSAP_Port_Named writeMotorSettings_port("writeMotorSettings", writeMotorSettings);

// ---------------------------------------------- attach error / debug msgs to the link pipe 

OSAP_Port_MessageEscape debugPort;

// ---------------------------------------------- arduino setup 

void setup() {
  // startup sys
  osap.begin();
  maxl.begin();
  // get debug 
  osap.attachDebugFunction(debugPort.escape);
  // we'll blink the user-led 
  pinMode(LED_BUILTIN, OUTPUT);
}

// ---------------------------------------------- arduino loop 

uint32_t lastBlink = 0;
uint32_t intervalBlink = 50;

void loop() {
  // do graph stuff
  osap.loop();
  // do maxl stuff 
  maxl.loop();
  // check check
  // we should blink a light or sth 
  if(lastBlink + intervalBlink < millis()){
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
    lastBlink = millis();
  }
}
