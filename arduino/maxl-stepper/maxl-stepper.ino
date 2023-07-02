#include "maxl.h"
#include "stepper-driver.h"
#include <osap.h>

// ---------------------------------------------- the limit pin, lol 

// the limit is on PIN1 (top left-most) on the XIAO
// which is D0 on the D21 (allegedly) 
// and GPIO26 (?) on the RP2040 
#define LIMIT_PIN 26 

// ---------------------------------------------- PROTOTYPE MAXL API THINGS 

// we'll use a MAXL object, 

MAXL maxl; 

// and we can write this func, to step our motor based on trajectory inputs... 

float stepsPerUnit = 100.0F;
float unitsPerStep = 1.0F / stepsPerUnit;
float stepModulo = 0.0F;

void onPositionUpdate(float position, float delta){
  stepModulo += delta;
  if(stepModulo > unitsPerStep){
    stepper_step(8, true);
    stepModulo -= unitsPerStep;
  } 
  if (stepModulo < -unitsPerStep){
    stepper_step(8, false);
    stepModulo += unitsPerStep;
  }
}

// and we can hand that over as an on-delta callback, 

MAXL_TrackPositionLinear stepperTrack("stepper", onPositionUpdate);

// ---------------------------------------------- OSAP SETUP 

OSAP_Runtime osap;
OSAP_Gateway_USBSerial serLink(&Serial);
OSAP_Port_DeviceNames namePort("maxlStepper");

// ---------------------------------------------- MAXL over MUTTS 

size_t maxlMessageInterface(uint8_t* data, size_t len, uint8_t* reply){
  return maxl.messageHandler(data, len, reply);
}

OSAP_Port_Named maxlMessage_port("maxlMessages", maxlMessageInterface);

/*

// ---------------------------------------------- MAXL write time 

void writeMaxlTime(uint8_t* data, size_t len){
  uint16_t rptr = 0;
  uint32_t newTime = ts_readUint32(data, &rptr);
  // maxl_setSystemTime(newTime);
}

OSAP_Port_Named writeMaxlTime_port("writeMaxlTime", writeMaxlTime);

// ---------------------------------------------- MAXL ingest a segment 

maxlSegmentPositionLinear_t handoffSeg;

void appendMaxlSegment(uint8_t* data, size_t len){
  // maxl_addSegment(data, len);
}

OSAP_Port_Named appendMaxlSegment_port("appendMaxlSegment", appendMaxlSegment);

// ---------------------------------------------- MAXL halt 

void maxlHalt(uint8_t* data, size_t len){
  // maxl_halt();
}

OSAP_Port_Named maxlHalt_port("maxlHalt", maxlHalt);

*/

// ---------------------------------------------- ACTU config the actual actuator 

void writeMotorSettings(uint8_t* data, size_t len){
  // should bundle... cscale, position (?) idk 
  // it's just <cscale> for the time being, 
  uint16_t rptr = 0;
  uint8_t id = ts_readUint8(data, &rptr);
  uint8_t axis = ts_readUint8(data, &rptr);
  float spu = ts_readFloat32(data, &rptr);
  float cscale = ts_readFloat32(data, &rptr);
  // yarp, yarp, yarp, 
  stepper_setCScale(cscale);
  // the below... should get-decoupled from maxl 
  // maxl_pushSettings(id, axis, spu);
  OSAP_DEBUG(  "writing cscale: " + String(cscale) +
                " axis: " + String(axis) +
                " spu: " + String(spu)
              );
}

OSAP_Port_Named writeMotorSettings_port("writeMotorSettings", writeMotorSettings);

// ---------------------------------------------- read switch info 

size_t getLimitState(uint8_t* data, size_t len, uint8_t* reply){
  reply[0] = digitalRead(LIMIT_PIN) ? 1 : 0;
  return 1;
}

OSAP_Port_Named getLimitState_port("getLimitState", getLimitState);

// ---------------------------------------------- arduino setup 

void setup() {
  stepper_init();
  // maxl_init();
  osap.begin();
  // we'll blink the user-led 
  pinMode(LED_BUILTIN, OUTPUT);
  // and our limit pin 
  pinMode(LIMIT_PIN, INPUT_PULLDOWN);
}

// ---------------------------------------------- arduino loop 

uint32_t lastBlink = 0;
uint32_t intervalBlink = 50;

uint8_t msgOut[256];

void loop() {
  // do graph stuff
  osap.loop();
  // do maxl stuff 
  // maxl_loop(false);
  // and clear out-messages (TODO... rm, or ?)
  // size_t msgLen = maxl_getSegmentCompleteMsg(msgOut);
  // check check
  // we should blink a light or sth 
  if(lastBlink + intervalBlink < millis()){
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
    lastBlink = millis();
  }
  // for the LED, LOGIC HIGH is OFF (!) 
  // if(digitalRead(LIMIT_PIN)){
  //   // light ON 
  //   digitalWrite(LED_BUILTIN, LOW);
  // } else {
  //   // light OFF
  //   digitalWrite(LED_BUILTIN, HIGH);
  // }
}
