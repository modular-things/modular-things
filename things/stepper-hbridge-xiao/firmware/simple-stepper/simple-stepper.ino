#include "motionStateMachine.h"
#include "stepperDriver.h"
#include <osap.h>

// using the RP2040 at 200MHz 

#define PIN_LIMIT 26 

// transport layer 
OSAP_Runtime osap;
OSAP_Gateway_USBSerial serLink(&Serial);
OSAP_Port_DeviceNames namePort("stepper");

// ---------------------------------------------- baby needs to serialize fluts 

union chunk_float32_stp {
  uint8_t bytes[4];
  float f;
};

float ts_readFloat32(unsigned char* buf, uint16_t* ptr){
  chunk_float32_stp chunk = { .bytes = { buf[(*ptr)], buf[(*ptr) + 1], buf[(*ptr) + 2], buf[(*ptr) + 3] } };
  (*ptr) += 4;
  return chunk.f;
}

void ts_writeFloat32(float val, volatile unsigned char* buf, uint16_t* ptr){
  chunk_float32_stp chunk;
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
  // we get that as a floating p, 0-1, 
  // driver wants integers 0-1024: 
  uint32_t amp = cscale * 1024;
  stepper_setAmplitude(amp);
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
  // startup the stepper hardware 
  stepper_init();
  // setup motion, pick an integration interval (us) 
  motion_init(64);
  // startup the network transporter 
  osap.begin();
  // and our limit pin, is wired (to spec)
  // to a normally-closed switch, from SIG to GND, 
  // meaning that when the switch is "clicked" - it will open, 
  // and the pullup will win, we will have logic high 
  pinMode(PIN_LIMIT, INPUT_PULLUP);
}

uint32_t debounceDelay = 1;
uint32_t lastButtonCheck = 0;

motionState_t states;

void loop() {
  // do transport stuff 
  osap.loop();

  // debounce and set button states,
  if(lastButtonCheck + debounceDelay < millis()){
    lastButtonCheck = millis();
    boolean newState = digitalRead(PIN_LIMIT);
    if(newState != lastButtonState){
      lastButtonState = newState;
    }
  }
}

// test randy set / res velocities, 
// if(lastFlip + flipInterval < millis()){
//   lastFlip = millis();
//   // pick a new flip interval, 
//   flipInterval = random(1000);
//   // and val, 
//   sampleVal = random(-1000, 1000);
//   // and coin-toss for vel or posn, 
//   uint32_t flip = random(0, 2);
//   if(flip == 1){
//     motion_setPositionTarget(sampleVal, 1000.0F, 4000.0F);
//   } else {
//     motion_setVelocityTarget(sampleVal, 5000.0F);
//   }
// }