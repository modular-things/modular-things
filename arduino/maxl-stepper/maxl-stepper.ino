#include "maxl.h"
#include "stepper-driver.h"
#include <osap.h>

OSAP_Runtime osap;
OSAP_Gateway_USBSerial serLink(&Serial);
OSAP_Port_DeviceNames namePort("maxlStepper");

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
  maxl_pushSettings(id, axis, spu);
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

// ---------------------------------------------- MAXL reply to state queries 

size_t getMaxlStates(uint8_t* data, size_t len, uint8_t* reply){
  maxlStateInterface_t state;
  maxl_getCurrentStates(&state);
  // write into the reply, 
  uint16_t wptr = 0;
  // write in # of DOF reporting, 
  reply[wptr ++] = MAXL_MAX_DOF;
  // write in posns, 
  for(uint8_t a = 0; a < MAXL_MAX_DOF; a ++){
    ts_writeFloat32(state.pos[a], reply, &wptr);
  }
  // and unit vector, 
  for(uint8_t a = 0; a < MAXL_MAX_DOF; a ++){
    ts_writeFloat32(state.unit[a], reply, &wptr);
  }
  // vel, accel,
  ts_writeFloat32(state.vel, reply, &wptr);
  ts_writeFloat32(state.accel, reply, &wptr);
  return wptr;
}

OSAP_Port_Named getMaxlStates_port("getMaxlStates", getMaxlStates);

// ---------------------------------------------- MAXL ingest a segment 

maxlSegment_t handoffSeg;

void appendMaxlSegment(uint8_t* data, size_t len){
  uint16_t rptr = 0;
  // sequences
  handoffSeg.tStart_us = ts_readUint32(data, &rptr);
  handoffSeg.tEnd_us = ts_readUint32(data, &rptr);
  handoffSeg.isLastSegment = ts_readBoolean(data, &rptr);
  // start, unit & distance, 
  for(uint8_t a = 0; a < MAXL_MAX_DOF; a ++){
    handoffSeg.start[a] = ts_readInt32(data, &rptr);
  }
  for(uint8_t a = 0; a < MAXL_MAX_DOF; a ++){
    handoffSeg.unit[a] = ts_readInt32(data, &rptr);
  }
  handoffSeg.distance = ts_readInt32(data, &rptr);
  // vi, vmax, accel, 
  handoffSeg.vi = ts_readInt32(data, &rptr);
  handoffSeg.accel = ts_readInt32(data, &rptr);
  handoffSeg.vmax = ts_readInt32(data, &rptr);
  handoffSeg.vf = ts_readInt32(data, &rptr);
  // pre-computed integrals, 
  handoffSeg.distAccelPhase = ts_readInt32(data, &rptr);
  handoffSeg.distCruisePhase = ts_readInt32(data, &rptr);
  // and trapezoid times
  handoffSeg.tAccelEnd = ts_readInt32(data, &rptr);
  handoffSeg.tCruiseEnd = ts_readInt32(data, &rptr);
  // now we can add it in: 
  maxl_addSegmentToQueue(&handoffSeg);
}

OSAP_Port_Named appendMaxlSegment_port("appendMaxlSegment", appendMaxlSegment);

// ---------------------------------------------- arduino setup 

void setup() {
  stepper_init();
  maxl_init();
  osap.begin();
  // we'll blink the user-led 
  pinMode(LED_BUILTIN, OUTPUT);
  // and our limit pin 
  // pinMode(PIN_LIMIT, INPUT_PULLUP);
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
  // we should blink a light or sth 
  if(lastBlink + intervalBlink < millis()){
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
    lastBlink = millis();
  }
}
