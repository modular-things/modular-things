// C:\Users\jaker\AppData\Local\Arduino15\libraries\osap
#include "motionStateMachine.h"
#include "stepperDriver.h"
#include <osap.h>
#include <vt_endpoint.h>
#include <vp_arduinoSerial.h>
#include <core/ts.h>

// ---------------------------------------------- OSAP central-nugget 
OSAP osap("stepper");

// ---------------------------------------------- 0th Vertex: OSAP USB Serial
VPort_ArduinoSerial vp_arduinoSerial(&osap, "usbSerial", &Serial);

// ---------------------------------------------- 1th Vertex: Target Requests (pos, or velocity)
EP_ONDATA_RESPONSES onTargetData(uint8_t* data, uint16_t len){
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
  return EP_ONDATA_ACCEPT;
}

Endpoint targetEndpoint(&osap, "targetState", onTargetData);

// ---------------------------------------------- 2nd Vertex: Motion State Read 
// queries only, more or less, so
EP_ONDATA_RESPONSES onMotionStateData(uint8_t* data, uint16_t len){ return EP_ONDATA_REJECT; }

boolean beforeMotionStateQuery(void);

Endpoint stateEndpoint(&osap, "motionState", onMotionStateData, beforeMotionStateQuery);

uint8_t stateData[12];

boolean beforeMotionStateQuery(void){
  motionState_t state;
  motion_getCurrentStates(&state);
  uint16_t rptr = 0;
  ts_writeFloat32(state.pos, stateData, &rptr);
  ts_writeFloat32(state.vel, stateData, &rptr);
  ts_writeFloat32(state.accel, stateData, &rptr);
  stateEndpoint.write(stateData, 12);
  // in-fill current posn, velocity, and acceleration
  return true;
}

// ---------------------------------------------- 3rd Vertex: Set Current Position 
EP_ONDATA_RESPONSES onPositionSetData(uint8_t* data, uint16_t len){
  // should do maxAccel, maxVel, and (optionally) setPosition 
  // upstream should've though of this, so, 
  uint16_t rptr = 0;
  float pos = ts_readFloat32(data, &rptr);
  motion_setPosition(pos);
  return EP_ONDATA_ACCEPT;
}

Endpoint settingsEndpoint(&osap, "setPosition", onPositionSetData);

// ---------------------------------------------- 4th Vertex: Limit / Switch Output... non-op at the moment, 
Endpoint buttonEndpoint(&osap, "buttonState");

void setup() {
  Serial.begin(0);
  motion_init();
  stepper_init();
  // uuuh... 
  osap.init();
  // run the commos 
  vp_arduinoSerial.begin();
}

uint32_t lastIntegration = 0;
// shouldn't be here... 
uint32_t integratorInterval = 1000;

void loop() {
  // do graph stuff
  osap.loop();
  if(lastIntegration + integratorInterval < micros()){
    lastIntegration = micros();
    motion_integrate();
  }
}