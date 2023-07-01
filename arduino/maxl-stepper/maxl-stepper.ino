#include "maxl.h"
#include "stepper-driver.h"
#include <osap.h>

OSAP_Runtime osap;
OSAP_Gateway_USBSerial serLink(&Serial);
OSAP_Port_DeviceNames namePort("maxlStepper");

// ---------------------------------------------- the limit pin ?

// the limit is on PIN1 (top left-most) on the XIAO
// which is D0 on the D21 (allegedly) 
// and GPIO26 (?) on the RP2040 
#define LIMIT_PIN 26 

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

// ---------------------------------------------- MAXL write time 

void writeMaxlTime(uint8_t* data, size_t len){
  uint16_t rptr = 0;
  uint32_t newTime = ts_readUint32(data, &rptr);
  maxl_setSystemTime(newTime);
}

OSAP_Port_Named writeMaxlTime_port("writeMaxlTime", writeMaxlTime);

// ---------------------------------------------- MAXL ingest a segment 

maxlSegmentLinearMotion_t handoffSeg;

void appendMaxlSegment(uint8_t* data, size_t len){
  uint16_t rptr = 0;
  // check type ? 
  uint8_t maxlSegmentType = data[rptr ++];
  // TODO: if type != x ... chunk, 
  // sequences
  handoffSeg.tStart_us = ts_readUint32(data, &rptr);
  handoffSeg.tEnd_us = ts_readUint32(data, &rptr);
  handoffSeg.isLastSegment = ts_readBoolean(data, &rptr);
  // start and distance 
  handoffSeg.start = ts_readInt32(data, &rptr);
  // vi, vmax, accel, 
  handoffSeg.vi = ts_readInt32(data, &rptr);
  handoffSeg.accel = ts_readInt32(data, &rptr);
  handoffSeg.vmax = ts_readInt32(data, &rptr);
  handoffSeg.vf = ts_readInt32(data, &rptr);
  // pre-computed integrals, 
  handoffSeg.distTotal = ts_readInt32(data, &rptr); 
  handoffSeg.distAccelPhase = ts_readInt32(data, &rptr);
  handoffSeg.distCruisePhase = ts_readInt32(data, &rptr);
  // and trapezoid times
  handoffSeg.tAccelEnd = ts_readInt32(data, &rptr);
  handoffSeg.tCruiseEnd = ts_readInt32(data, &rptr);
  // now we can add it in: 
  maxl_addSegmentToQueue(&handoffSeg);
}

OSAP_Port_Named appendMaxlSegment_port("appendMaxlSegment", appendMaxlSegment);

// ---------------------------------------------- MAXL halt 

void maxlHalt(uint8_t* data, size_t len){
  maxl_halt();
}

OSAP_Port_Named maxlHalt_port("maxlHalt", maxlHalt);

// ---------------------------------------------- read switch info 

size_t getLimitState(uint8_t* data, size_t len, uint8_t* reply){
  reply[0] = digitalRead(LIMIT_PIN) ? 1 : 0;
  return 1;
}

OSAP_Port_Named getLimitState_port("getLimitState", getLimitState);

// ---------------------------------------------- arduino setup 

void setup() {
  stepper_init();
  maxl_init();
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
  maxl_loop(false);
  // and clear out-messages (TODO... rm, or ?)
  size_t msgLen = maxl_getSegmentCompleteMsg(msgOut);
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
