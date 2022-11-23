// ---------------------------------------------- Application State 
#ifndef MOTION_STATE_MACHINE_H_
#define MOTION_STATE_MACHINE_H_

#include <Arduino.h>

#define MOTION_MODE_POS 0
#define MOTION_MODE_VEL 1 

// struct for a handoff, 
typedef struct motionState_t {
  float pos;
  float vel;
  float accel;
} motionState_t;

void motion_init(void);

void motion_integrate(void);

void motion_setPositionTarget(float _targ, float _maxVel, float _maxAccel);
void motion_setVelocityTarget(float _targ, float _maxAccel);
void motion_setPosition(float _pos);

void motion_getCurrentStates(motionState_t* statePtr);

#endif 