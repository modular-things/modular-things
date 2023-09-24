// NOTE:
/*
this is the "standalone motor" firmware, that we can subsequently "sync" 
and it's developed for the XIAO stepper h-bridge board, but doesn't properly 
differentiate build for the D21 pin-nums or the RP2040 pin-nums, though it should do 
and could do perhaps just using arduino pin numbers, why not ? 
*/

#include "motionStateMachine.h"
#include "stepperDriver.h"
#include <osap.h>

OSAP_Runtime osap;
OSAP_Gateway_USBSerial serLink(&Serial);
OSAP_Port_DeviceNames namePort("stepper");

// ---------------------------------------------- baby needs to serialize fluts 

union chunk_float32 {
  uint8_t bytes[4];
  float f;
};

float ts_readFloat32(unsigned char* buf, uint16_t* ptr){
  chunk_float32 chunk = { .bytes = { buf[(*ptr)], buf[(*ptr) + 1], buf[(*ptr) + 2], buf[(*ptr) + 3] } };
  (*ptr) += 4;
  return chunk.f;
}

void ts_writeFloat32(float val, volatile unsigned char* buf, uint16_t* ptr){
  chunk_float32 chunk;
  chunk.f = val;
  buf[(*ptr)] = chunk.bytes[0]; buf[(*ptr) + 1] = chunk.bytes[1]; buf[(*ptr) + 2] = chunk.bytes[2]; buf[(*ptr) + 3] = chunk.bytes[3];
  (*ptr) += 4;
}

// ---------------------------------------------- set a new target 

void setTarget(uint8_t* data, size_t len){
  uint16_t wptr = 1;
  // there's no value in getting clever here: we have two possible requests...
  if(data[0] == MOTION_MODE_POS){
    float targ = ts_readFloat32(data, &wptr);
    float maxVel = ts_readFloat32(data, &wptr);
    float maxAccel = ts_readFloat32(data, &wptr);
    motion_setPositionTarget(targ, maxVel, maxAccel);
  } else if (data[0] == MOTION_MODE_VEL){
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

// ---------------------------------------------- set..tings 

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

void setup() {
  // ~ important: the stepper code initializes GCLK4, which we use as timer-interrupt
  // in the motion system, so it aught to be initialized first !
  stepper_init();
  // another note on the motion system:
  // at the moment, we have a relatively small absolute-maximum speed: say the integrator interval is 250us,
  // we have 0.00025 seconds between ticks, for a max of 4000 steps / second...
  // we are then microstepping at 1/4th steps, for 800 steps per motor revolution, (from a base of 200)
  // meaning we can make only 5 revs / sec, or 300 rippums (RPM),
  // with i.e. a 20-tooth GT2 belt, we have 40mm of travel per revolution, making only 200mm/sec maximum traverse
  // this is not pitiful, but not too rad, and more importantly is that we will want to communicate these limits
  // to users of the motor - so we should outfit a sort of settings-grab function, or something ?
  motion_init(250);
  // uuuh...
  osap.begin();
  // and our limit pin 
  pinMode(PIN_LIMIT, INPUT_PULLDOWN);
}

uint32_t debounceDelay = 1;
uint32_t lastButtonCheck = 0;

void loop() {
  // do graph stuff
  osap.loop();
  // if(lastIntegration + integratorInterval < micros()){
  //   // stepper_step(1, true);
  //   lastIntegration = micros();
  //   motion_integrate();
  // }
  // debounce and set button states,
  if(lastButtonCheck + debounceDelay < millis()){
    lastButtonCheck = millis();
    boolean newState = digitalRead(PIN_LIMIT);
    if(newState != lastButtonState){
      lastButtonState = newState;
    }
  }
}
