#include "maxl.h"
#include "stepper-driver.h"
#include <osap.h>

OSAP_Runtime osap;
OSAP_Gateway_USBSerial serLink(&Serial);
OSAP_Port_DeviceNames namePort("maxl-stepper");

/*
// ---------------------------------------------- set a new target 

void setTarget(uint8_t* data, size_t len){
  uint16_t wptr = 0;
  // there's no value in getting clever here: we have two possible requests...
  if(data[wptr ++] == MOTION_MODE_POS){
    float targ = ts_readFloat32(data, &wptr);
    float maxVel = ts_readFloat32(data, &wptr);
    float maxAccel = ts_readFloat32(data, &wptr);
    motion_setPositionTarget(targ, maxVel, maxAccel);
  } else if (data[wptr ++] == MOTION_MODE_VEL){
    float targ = ts_readFloat32(data, &wptr);
    float maxAccel = ts_readFloat32(data, &wptr);
    motion_setVelocityTarget(targ, maxAccel);
  }
}

OSAP_Port_Named setTarget_port("setTarget", setTarget);

// ---------------------------------------------- get the current states 

size_t getMotionStates(uint8_t* data, size_t len, uint8_t* reply){
  motionState_t state;
  motion_getCurrentStates(&state);
  uint16_t wptr = 0;
  // in-fill current posn, velocity, and acceleration
  ts_writeFloat32(state.pos, reply, &wptr);
  ts_writeFloat32(state.vel, reply, &wptr);
  ts_writeFloat32(state.accel, reply, &wptr);
  // return the data length 
  return wptr;
}

OSAP_Port_Named getMotionStates_port("getMotionStates", getMotionStates);

// ---------------------------------------------- set a new position 

void setPosition(uint8_t* data, size_t len){
  // should do maxAccel, maxVel, and (optionally) setPosition
  // upstream should've though of this, so,
  uint16_t rptr = 0;
  float pos = ts_readFloat32(data, &rptr);
  motion_setPosition(pos);
}

OSAP_Port_Named setPosition_port("setPosition", setPosition);

// ---------------------------------------------- settings 

void writeSettings(uint8_t* data, size_t len){
  // it's just <cscale> for the time being,
  uint16_t rptr = 0;
  float cscale = ts_readFloat32(data, &rptr);
  stepper_setCScale(cscale);
}

OSAP_Port_Named writeSettings_port("writeSettings", writeSettings);

// ---------------------------------------------- get the state of the limit switch

// this is lifted here, we set it periodically in the loop (to debounce) 
boolean lastButtonState = false;

size_t getLimitState(uint8_t* data, size_t len, uint8_t* reply){
  lastButtonState ? reply[0] = 1 : reply[0] = 0;
  return 1;
}

OSAP_Port_Named getLimitState_port("getLimitState", getLimitState);

*/

// ---------------------------------------------- arduino setup 

void setup() {
  stepper_init();
  motion_init();
  // uuuh...
  osap.begin();
  // and our limit pin 
  // pinMode(PIN_LIMIT, INPUT_PULLUP);
}

// ---------------------------------------------- arduino loop 

void loop() {
  // do graph stuff
  osap.loop();
  // do maxl stuff 
  motion_loop(false);
  // we should blink a light or sth 
}

/*
// using OSAP 0.2.3 
// uses the... this pico toolchain: https://github.com/earlephilhower/arduino-pico 
#include "motionStateMachine.h"
#include "stepperDriver.h"
#include <osap.h>
#include <vt_endpoint.h>
#include <vp_arduinoSerial.h>
#include <core/ts.h>

// the limit pin, here using xiao https://wiki.seeedstudio.com/XIAO-RP2040/ "P" numbers, 
#define PIN_BUT 26

// ---------------------------------------------- OSAP central-nugget 
// message-passing memory allocation 
#define OSAP_STACK_SIZE 6
VPacket messageStack[OSAP_STACK_SIZE];
OSAP osap("stepper", messageStack, OSAP_STACK_SIZE);

// ---------------------------------------------- 0: serialport 
VPort_ArduinoSerial vp_arduinoSerial(&osap, "usbSerial", &Serial);

// ---------------------------------------------- 1: state queries 
// queries only, more or less, so
EP_ONDATA_RESPONSES onMotionStateData(uint8_t* data, uint16_t len){ 
  motionStateInterface_t state;
  uint16_t rptr = 0;
  // check check, 
  if(data[rptr ++] != MAXL_MAX_DOF){
    OSAP::error("writing " + String(data[0]) + " dof to system w/ max " + String(MAXL_MAX_DOF));
    return EP_ONDATA_REJECT;
  }
  // write in posns, 
  for(uint8_t a = 0; a < MAXL_MAX_DOF; a ++){
    state.pos[a] = ts_readFloat32(data, &rptr);
  }
  // and unit vector, 
  for(uint8_t a = 0; a < MAXL_MAX_DOF; a ++){
    state.unit[a] = ts_readFloat32(data, &rptr);
  }
  // vel, accel,
  state.vel = ts_readFloat32(data, &rptr);
  state.accel = ts_readFloat32(data, &rptr);
  // push it ! 
  motion_setCurrentStates(&state);
  return EP_ONDATA_REJECT; 
}

boolean beforeMotionStateQuery(void);

Endpoint stateEndpoint(&osap, "motionState", onMotionStateData, beforeMotionStateQuery);

uint8_t stateData[sizeof(float) * (MAXL_MAX_DOF * 2 + 2) + 1];

boolean beforeMotionStateQuery(void){
  motionStateInterface_t state;
  motion_getCurrentStates(&state);
  uint16_t wptr = 0;
  // write in # of DOF reporting, 
  stateData[wptr ++] = MAXL_MAX_DOF;
  // write in posns, 
  for(uint8_t a = 0; a < MAXL_MAX_DOF; a ++){
    ts_writeFloat32(state.pos[a], stateData, &wptr);
  }
  // and unit vector, 
  for(uint8_t a = 0; a < MAXL_MAX_DOF; a ++){
    ts_writeFloat32(state.unit[a], stateData, &wptr);
  }
  // vel, accel,
  ts_writeFloat32(state.vel, stateData, &wptr);
  ts_writeFloat32(state.accel, stateData, &wptr);
  stateEndpoint.write(stateData, wptr);
  return true;
}

// ---------------------------------------------- 2: motor settings
EP_ONDATA_RESPONSES onSettingsData(uint8_t* data, uint16_t len){
  // should bundle... cscale, position (?) idk 
  // it's just <cscale> for the time being, 
  uint16_t rptr = 0;
  uint8_t id = ts_readUint8(data, &rptr);
  uint8_t axis = ts_readUint8(data, &rptr);
  float spu = ts_readFloat32(data, &rptr);
  float cscale = ts_readFloat32(data, &rptr);
  // yarp, yarp, yarp, 
  stepper_setCScale(cscale);
  motion_pushSettings(id, axis, spu);
  OSAP::debug(  "writing cscale: " + String(cscale) +
                " axis: " + String(axis) +
                " spu: " + String(spu)
              );
  return EP_ONDATA_ACCEPT;
}

Endpoint settingsEndpoint(&osap, "motorSettings", onSettingsData);

// ---------------------------------------------- 3: time setting 
EP_ONDATA_RESPONSES onTimeSetting(uint8_t* data, uint16_t len){
  uint16_t rptr = 0;
  uint32_t newTime = ts_readUint32(data, &rptr);
  motion_setSystemTime(newTime);
  return EP_ONDATA_ACCEPT;
}

Endpoint timeSetEndpoint(&osap, "sysTimeSet", onTimeSetting);

// ---------------------------------------------- 4: move ingest  
motionSegment_t seg;

EP_ONDATA_RESPONSES onSegmentData(uint8_t* data, uint16_t len){
  uint16_t rptr = 0;
  // sequences
  seg.tStart_us = ts_readUint32(data, &rptr);
  seg.tEnd_us = ts_readUint32(data, &rptr);
  seg.isLastSegment = ts_readBoolean(data, &rptr);
  // start, unit & distance, 
  for(uint8_t a = 0; a < MAXL_MAX_DOF; a ++){
    seg.start[a] = ts_readInt32(data, &rptr);
  }
  for(uint8_t a = 0; a < MAXL_MAX_DOF; a ++){
    seg.unit[a] = ts_readInt32(data, &rptr);
  }
  seg.distance = ts_readInt32(data, &rptr);
  // vi, vmax, accel, 
  seg.vi = ts_readInt32(data, &rptr);
  seg.accel = ts_readInt32(data, &rptr);
  seg.vmax = ts_readInt32(data, &rptr);
  seg.vf = ts_readInt32(data, &rptr);
  // pre-computed integrals, 
  seg.distAccelPhase = ts_readInt32(data, &rptr);
  seg.distCruisePhase = ts_readInt32(data, &rptr);
  // and trapezoid times
  seg.tAccelEnd = ts_readInt32(data, &rptr);
  seg.tCruiseEnd = ts_readInt32(data, &rptr);
  // now we can add it in: 
  motion_addSegmentToQueue(&seg);
  return EP_ONDATA_REJECT;
}

Endpoint segmentInput(&osap, "segmentIngest", onSegmentData);

// ---------------------------------------------- 5: outgoing segment msgs, 

Endpoint segmentCompleteOutput(&osap, "segmentComplete");

// ---------------------------------------------- 6: halt codes 

EP_ONDATA_RESPONSES onHaltData(uint8_t* data, uint16_t len){
  motion_halt();
  return EP_ONDATA_REJECT;
}

Endpoint haltInput(&osap, "haltInput", onHaltData);

// ---------------------------------------------- 7: button / limit switch state, 

Endpoint limitOutput(&osap, "limitOutput");

// ---------------------------------------------- Arduino Setup 

void setup() {
  Serial.begin(0);
  // uuuh... 
  osap.init();
  // run the commos 
  vp_arduinoSerial.begin();
  // and init the limit / "button" pin 
  pinMode(PIN_BUT, INPUT_PULLUP);
  // ~ important: the stepper code initializes GCLK4, which we use as timer-interrupt
  // in the motion system, so it aught to be initialized first ! 
  stepper_init();
  // another note on the motion system:
  // currently operating at 10kHz, per the below arg... I think this is near the limit 
  // on a D21 (even w/ fixed point), other micros will be faster, 
  // but we want everyone on the same interval, and we will have queues to manage as well 
  // perhaps best is to make sure that speed limits (and SPU:Speed tradeoffs) are well communicated ? 
  motion_init();
}

uint32_t debounceDelay = 10;   // microseconds (!)
uint32_t lastButtonCheck = 0;   
boolean lastButtonState = false;

uint32_t debugDelay = 100;  // milliseconds (!) 
uint32_t lastDebug = 0;

uint8_t outMsgData[128];

void loop() {
  // do graph stuff
  osap.loop();
  // do motion stuff, 
  // ... should rm old debug code, non ? 
  if(lastDebug + debugDelay < millis()){
    lastDebug = millis();
    motion_loop(false);
  } else {
    motion_loop(false);
  }
  // delay(10);
  // check for outgoing messages, 
  size_t outMsgLen = motion_getSegmentCompleteMsg(outMsgData);
  if(outMsgLen){
    // write, 
    segmentCompleteOutput.write(outMsgData, outMsgLen);
  }
  // debounce and set button states, 
  if(lastButtonCheck + debounceDelay < micros()){
    lastButtonCheck = micros();
    boolean newState = digitalRead(PIN_BUT);
    if(newState != lastButtonState){
      lastButtonState = newState;
      limitOutput.write(lastButtonState);
    }
  }
}
*/