#ifndef MAXL_UTES_H_
#define MAXL_UTES_H_

#include <Arduino.h>

// TODO would be a refactor for flexible motion-dof sizes 
#define MAXL_MAX_DOF 7 
#define MAXL_QUEUE_LEN 32 

// ---------------------------------------------- structs and interfaes 

// we get explicit about fixed point 
typedef int32_t fpint32_t;

// ---------------- fixedp struct 

typedef struct motionFixedPointVect_t {
  fpint32_t axis[MAXL_MAX_DOF];
} motionVect_t;

// ---------------- state in fixedpoint and floats

typedef struct motionStateInterface_t {
  float pos[MAXL_MAX_DOF];    // position in all axes, steps
  float unit[MAXL_MAX_DOF];   // unit vector, direction of vel & accel
  float vel;                    // vel, steps/sec
  float accel;                  // accel, steps/sec 
} motionStateInterface_t;

typedef struct motionState_t {
  fpint32_t pos[MAXL_MAX_DOF];
  fpint32_t unit[MAXL_MAX_DOF];
  fpint32_t vel = 0;
  fpint32_t accel = 0;
} motionState_t;

// ---------------- segments 

typedef struct motionSegment_t {
  // system-reckoned start and end times, in micros, 
  uint32_t tStart_us = 0;
  uint32_t tEnd_us = 0;
  // sequencing aid,
  boolean isLastSegment = false;
  // valuuuues:
  // a start position, 
  fpint32_t start[MAXL_MAX_DOF];
  // a unit vector, to travel in, and length of travel, 
  fpint32_t unit[MAXL_MAX_DOF];
  fpint32_t distance = 0;
  // start rate, accel slope(s), cruise rate, end rate 
  fpint32_t vi = 0;
  fpint32_t accel = 0;
  fpint32_t vmax = 0;
  fpint32_t vf = 0;
  // pre-calculated phase integrals, 
  fpint32_t distAccelPhase = 0;
  fpint32_t distCruisePhase = 0;
  // phase times, 
  // i.e. when to stop accelerating, when to start decelerating 
  fpint32_t tAccelEnd;
  fpint32_t tCruiseEnd;
  // now some queue management flags / links; 
  // ready/set, token 
  boolean isOccupied = false;
  // linking 
  motionSegment_t* next;
  motionSegment_t* previous;
  uint32_t indice = 0;  // track own location, 
} motionSegment_t;

// ---------------------------------------------- fixedp maths  

float fp_fixed32ToFloat(fpint32_t fixed);

fpint32_t fp_floatToFixed32(float flt);

int32_t fp_fixed32ToInt32(fpint32_t fixed);

fpint32_t fp_int32ToFixed32(int32_t inty);

fpint32_t fp_mult32x32(fpint32_t a, fpint32_t b);

fpint32_t fp_div32x32(fpint32_t num, fpint32_t denum);

// ---------------------------------------------- serialization 

union chunk_float32 {
  uint8_t bytes[4];
  float f;
};

union chunk_uint32 {
  uint8_t bytes[4];
  uint32_t u;
};

float ts_readFloat32(unsigned char* buf, uint16_t* ptr);

void ts_writeFloat32(float val, volatile unsigned char* buf, uint16_t* ptr);

void ts_writeUint8(uint8_t val, volatile unsigned char* buf, uint16_t* ptr);

void ts_writeUint32(uint32_t val, volatile unsigned char* buf, uint16_t* ptr);

#endif 

