// ---------------------------------------------- Application State 
#ifndef MOTION_STATE_MACHINE_H_
#define MOTION_STATE_MACHINE_H_

#include <Arduino.h>

#define MOTION_MODE_POS 0
#define MOTION_MODE_VEL 1 

// we're going to use `2.30` *and* `34.30` fixed points, 
const int32_t fp_scale = 30;

// get explicit abt which are fixed point ints, 
typedef int32_t fpint32_t;
typedef int64_t fpint64_t;

// struct for a handoff, 
typedef struct motionState_t {
  float pos;
  float vel;
  float accel;
  float distanceToTarget;
  float maxVel;
  float maxAccel;
  float twoDA;
  float vSquared;
} motionState_t;

void motion_init(int32_t microsecondsPerIntegration);

void motion_integrate(void);

void motion_setPositionTarget(float _targ, float _maxVel, float _maxAccel);
void motion_setVelocityTarget(float _targ, float _maxAccel);
void motion_setPosition(float _pos);

void motion_getCurrentStates(motionState_t* statePtr);

void motion_printDebug(void);

#endif 