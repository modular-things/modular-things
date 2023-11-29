#include "motionStateMachine.h"
#include "fixedPointUtes.h"
#include "stepperDriver.h"

// overlapping with the limit pin ! 
#define PIN_DEBUG 26 

#define ALARM_DT_NUM 1
#define ALARM_DT_IRQ TIMER_IRQ_1

// _delT is re-calculated when we init w/ a new microsecondsPerIntegration 
fpint32_t           _delT = 0;
uint32_t            _delT_us = 0;

// core states (units are full steps) 
volatile uint8_t    _mode = MOTION_MODE_VEL;    // operative _mode 
volatile fpint64_t  _pos = 0;                   // current position (big 64)
volatile fpint32_t  _vel = 0;                   // current velocity 
volatile fpint32_t  _accel = 0;                 // current acceleration 

// init-once values we'll use in the integrator 
volatile fpint32_t  _delta = 0;
volatile fpint64_t  _posTarget = 0;             // for position control, 
volatile fpint64_t  _dist = 0;                  // for position control, 
volatile fpint64_t  _stopDistance = 0;          // for position control, 

// and settings 
fpint32_t           _maxAccel = 0;              // maximum acceleration
fpint32_t           _maxVelocity = 0;

void motion_init(uint32_t microsecondsPerIntegration){
  // here's our delta-tee for each integration step 
  _delT = fp_floatToFixed32((float)(microsecondsPerIntegration) / 1000000.0F);
  // and (for resetting our timer) the _delta directly in us 
  _delT_us = microsecondsPerIntegration;

  // setup the hardware timer 
  hw_set_bits(&timer_hw->inte, 1u << ALARM_DT_NUM);
  irq_set_exclusive_handler(ALARM_DT_IRQ, alarm_dt_handler);
  irq_set_enabled(ALARM_DT_IRQ, true);
  timer_hw->alarm[ALARM_DT_NUM] = (uint32_t) (timer_hw->timerawl + _delT_us);

  // (optionally) use a debug pin to perf test 
  // pinMode(PIN_DEBUG, OUTPUT);
}

void alarm_dt_handler(void){
  // setup next call right away
  hw_clear_bits(&timer_hw->intr, 1u << ALARM_DT_NUM);
  timer_hw->alarm[ALARM_DT_NUM] = (uint32_t) (timer_hw->timerawl + _delT_us);
  // do the motion system integration, 
  // sio_hw->gpio_set = (uint32_t)(1 << PIN_DEBUG);
  motion_integrate(); 
  // sio_hw->gpio_clr = (uint32_t)(1 << PIN_DEBUG);
}

// ------------------------------------ integrator codes 

fpint64_t motion_calc_stopping_distance(fpint32_t vel, fpint32_t accel){
  // our num / denum, 
  fpint64_t velSqrd = fp_mult32x32_64(vel, vel); 
  fpint64_t twoAccel = fp_mult32x32_64(fp_int32ToFixed32(2), accel);
  // now we div that out, 
  return fp_div64x64(velSqrd, twoAccel);
}

void motion_calc_mode_velocity(void){
  // go fast, or go slo; 
  if(_vel < _maxVelocity){
    _accel = _maxAccel; 
  } else if (_vel > _maxVelocity){
    _accel = -_maxAccel;
  }

  // using our chosen accel, integrate velocity from previous: 
  _vel += fp_mult32x32(_accel, _delT); 

  // and check against targets 
  if(_vel > 0 && _maxVelocity > 0 && _vel > _maxVelocity){
    _accel = 0;
    _vel = _maxVelocity;
  } else if(_vel < 0 && _maxVelocity < 0 && _vel < _maxVelocity){
    _accel = 0;
    _vel = _maxVelocity;
  }
}

void motion_calc_mode_position(void){
  // figure whence we would need to start stopping, and our current dist  
  _stopDistance = motion_calc_stopping_distance(_vel, _maxAccel);
  _dist = _posTarget - _pos;

  // check if we're about to make it... bonk if so, 
  // units are steps, so epsilon is tiny ! 
  if(abs(_dist - _delta) < fp_floatToFixed32(0.001F)){
    _vel = 0;
    _accel = 0;
    return;
  }

  // now we do a buncha cheques 
  if(_stopDistance >= abs(_dist)){  // we're going to overshoot, 
    if(_vel <= 0){                  // when -ve vel, 
      _accel = _maxAccel;           // do +ve accel 
    } else {                        // when +ve vel, 
      _accel = -_maxAccel;          // do -ve accel 
    }
  } else {                          // we're not overshooting, 
    if(_dist > 0){                  // if delta is positive,
      _accel = _maxAccel;           // go forwards, 
    } else {                        // if it's negative 
      _accel = -_maxAccel;          // go backwards... 
    }
  }

  // using our chosen accel, integrate velocity from previous: 
  _vel += fp_mult32x32(_accel, _delT); 

  // cap our _vel based on maximum rates: 
  if(_vel >= _maxVelocity){
    _accel = 0;
    _vel = _maxVelocity;
  } else if (_vel <= -_maxVelocity){
    _accel = 0;
    _vel = -_maxVelocity;
  }
}

void motion_integrate(void){
  // set our _accel based on modal requests, 
  switch(_mode){
    case MOTION_MODE_POS:
      motion_calc_mode_position();
      break;
    case MOTION_MODE_VEL:
      motion_calc_mode_velocity();
      break;
  }

  // grab a delta and integrate, 
  _delta = fp_mult32x32(_vel, _delT);
  _pos += _delta;

  // position is base 16, we can just shift our way to relative electrical phase 
  // 0-2048 (11 bits) per electrical phase, is
  // 0-512 (9 bits) per step, 
  // 0b XXXXXXXXXXXXXXXX.XXXXXXXXXXXXXXXX
  // 0b               XX.XXXXXXXXX
  //                  FS.MicroStep
  uint16_t phaseAngle = (_pos >> 7) & 0b11111111111;
  stepper_point(phaseAngle);
} 

// ------------------------------------ end integrator 

void motion_setVelocityTarget(float target, float maxAccel){
  noInterrupts();
  _maxAccel = fp_floatToFixed32(abs(maxAccel));
  _maxVelocity = fp_floatToFixed32(target);
  _mode = MOTION_MODE_VEL;
  interrupts();
}

void motion_setPosition(float pos){
  noInterrupts();
  _pos = fp_floatToFixed64(pos);
  interrupts();
}

void motion_getCurrentStates(motionState_t* statePtr){
  noInterrupts();
  statePtr->pos = fp_fixed64ToFloat(_pos);
  statePtr->vel = fp_fixed32ToFloat(_vel);
  statePtr->accel = fp_fixed32ToFloat(_accel);
  interrupts();
}

void motion_setPositionTarget(float target, float maxVel, float maxAccel){
  noInterrupts();
  _posTarget = fp_floatToFixed64(target);
  _maxVelocity = fp_floatToFixed32(abs(maxVel));
  _maxAccel = fp_floatToFixed32(abs(maxAccel));
  _mode = MOTION_MODE_POS;
  interrupts();
}

// void motion_debug(void){
//   // ... we could / should snapshot, if this is chunky ? 
//   noInterrupts();
//   Serial.println(String(millis())
//       // + "\t_delT: \t" + String(fp_fixed32ToFloat(_delT), 6)
//       + "\tm: " + String(_mode) 
//       + "\tptrg: " + String(fp_fixed64ToFloat(_posTarget), 1)
//       + "\tvtrg: " + String(fp_fixed64ToFloat(_maxVelocity), 1)
//       + "\tpos: " + String(fp_fixed64ToFloat(_pos), 1)
//       + "\tdst: " + String(fp_fixed64ToFloat(_dist), 1)
//       + "\tstp: " + String(fp_fixed64ToFloat(_stopDistance), 1)
//       + "\tacc: " + String(fp_fixed32ToFloat(_accel), 1)
//       + "\tvel: " + String(fp_fixed32ToFloat(_vel), 1)
//       // + "\tvtrg: \t" + String(fp_fixed32ToFloat(_maxVelocity), 4)
//     );
//   interrupts();
// }
