// ---------------------------------------------- Application State 
#ifndef MOTION_STATE_MACHINE_H_
#define MOTION_STATE_MACHINE_H_

#include <Arduino.h>

#define MOTION_MODE_POS 0
#define MOTION_MODE_VEL 1 

// where's the radix... picking 14 arbitrarily 
// so we have 2^14 = 16 384 dots after the pt,
// and 2^18 = 262 144 dots in front of the pt, 
const int32_t fp_scale = 14;

// get explicit abt which are fixed point ints, 
typedef int32_t fpint32_t;

// and ops w/ em 
float fp_fixedToFloat(fpint32_t a);
fpint32_t fp_floatToFixed(float a);

fpint32_t fp_mult(fpint32_t a, fpint32_t b);

// struct for a handoff, 
typedef struct motionState_t {
  float pos;
  float vel;
  float accel;
} motionState_t;

void motion_init(uint16_t microsecondsPerIntegration);

void motion_integrate(void);

void motion_setPositionTarget(float _targ, float _maxVel, float _maxAccel);
void motion_setVelocityTarget(float _targ, float _maxAccel);
void motion_setPosition(float _pos);

void motion_getCurrentStates(motionState_t* statePtr);

#endif 