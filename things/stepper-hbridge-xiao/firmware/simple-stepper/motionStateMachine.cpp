#include "motionStateMachine.h"
#include "fixedPointUtes.h"
#include "stepperDriver.h"

// we can take some pin over to do debuggen... 
#define PIN_DEBUG 26 

#define ALARM_DT_NUM 1
#define ALARM_DT_IRQ TIMER_IRQ_1

// delT is re-calculated when we init w/ a new microsecondsPerIntegration 
fpint32_t delT = 0;
uint32_t delT_us = 0;
// core states (units are steps, 1=1 ?) 
volatile uint8_t mode = MOTION_MODE_POS;      // operative mode 
volatile fpint64_t pos = 0;                   // current position (big 64)
volatile fpint32_t vel = 0;                   // current velocity 
volatile fpint32_t accel = 0;                 // current acceleration 
// and settings 
fpint32_t maxAccel = 0;                       // maximum acceleration
// and targets 
fpint32_t posTarget = 0;
fpint32_t velTarget = 0;
// init-once values we'll use in the integrator 
volatile fpint32_t delta = 0;

void motion_init(uint32_t microsecondsPerIntegration){
  // here's our delta-tee for each integration step 
  delT = fp_floatToFixed32((float)(microsecondsPerIntegration) / 1000000.0F);
  // and (for resetting our timer) the delta directly in us 
  delT_us = microsecondsPerIntegration;

  // we absolutely cannot step more than one tick-per-integration cycle, 
  // since we are in one-step-per-unit land, it means our absMax is just 1/delT, 
  // TODO: this would be... something insane, since now we are only limited
  // by one full step per delta-tee, so it's like 256 microsteps, etc... 
  // absMaxVelocity = 1.0F / delT; 
  // maxVel = absMaxVelocity; // start here, 

  hw_set_bits(&timer_hw->inte, 1u << ALARM_DT_NUM);
  irq_set_exclusive_handler(ALARM_DT_IRQ, alarm_dt_Handler);
  irq_set_enabled(ALARM_DT_IRQ, true);
  timer_hw->alarm[ALARM_DT_NUM] = (uint32_t) (timer_hw->timerawl + delT_us);

  pinMode(PIN_DEBUG, OUTPUT);
}

void alarm_dt_Handler(void){
  // setup next call right away
  hw_clear_bits(&timer_hw->intr, 1u << ALARM_DT_NUM);
  timer_hw->alarm[ALARM_DT_NUM] = (uint32_t) (timer_hw->timerawl + delT_us);
  // do the motion system integration, 
  sio_hw->gpio_set = (uint32_t)(1 << PIN_DEBUG);
  motion_integrate(); 
  sio_hw->gpio_clr = (uint32_t)(1 << PIN_DEBUG);
}

void motion_debug(void){
  Serial.println(String(millis())
      // + "\tdelT: \t" + String(fp_fixed32ToFloat(delT), 6)
      + "\tpos: \t" + String(fp_fixed64ToFloat(pos), 4)
      + "\tvel: \t" + String(fp_fixed32ToFloat(vel), 4)
      + "\tvtrg: \t" + String(fp_fixed32ToFloat(velTarget), 4)
      + "\tacc: \t" + String(fp_fixed32ToFloat(accel), 3)
    );
}

void motion_integrate(void){
  // set our accel based on modal requests, 
  switch(mode){
    case MOTION_MODE_POS:
      break;
    case MOTION_MODE_VEL:
      if(vel < velTarget){
        accel = maxAccel; 
      } else if (vel > velTarget){
        accel = -maxAccel;
      }
      break;
  }
  // using our chosen accel, integrate velocity from previous: 
  vel += fp_mult32x32(accel, delT); // accel * delT;
  // cap our vel based on maximum rates: 
  // we have to be careful with signs ! 
  if(vel > 0 && velTarget > 0 && vel > velTarget){
    accel = 0;
    vel = velTarget;
  } else if(vel < 0 && velTarget < 0 && vel < velTarget){
    accel = 0;
    vel = velTarget;
  }
  // what's a position delta ? 
  delta = fp_mult32x32(vel, delT); // vel * delT;
  // integrate posn with delta 
  pos += delta;

  // OK so, we are down here in hi-perfland, 
  // and everything comes to us steps-wise, full-steps wise ? 
  // and a full step for us is 512, 2^9, we should be able 
  // to just take a bitmask of the position, right?

  // position is base 16, we can just shift our way to relative electrical phase 
  // 0-2048 (11 bits) per electrical phase, is
  // 0-512 (9 bits) per step, 
  // 0b XXXXXXXXXXXXXXXX.XXXXXXXXXXXXXXXX
  // 0b               XX.XXXXXXXXX
  //                  FS.MicroStep
  uint16_t phaseAngle = (pos >> 7) & 0b11111111111;
  stepper_point(phaseAngle);
} // end integrator 

void motion_setPositionTarget(float _targ, float _maxVel, float _maxAccel){
  // I'm ~ kind of assuming we are already stopped when these reqs are issued, so... 
  noInterrupts();
  // TODO: this needs a whole ass rework, to write trajectories... 
  // maxAccel = _maxAccel;
  // maxVel = _maxVel;
  // posTarget = _targ;
  mode = MOTION_MODE_POS;
  interrupts();
}

void motion_setVelocityTarget(float _targ, float _maxAccel){
  noInterrupts();
  maxAccel = fp_floatToFixed32(_maxAccel);
  velTarget = fp_floatToFixed32(_targ);
  mode = MOTION_MODE_VEL;
  interrupts();
}

void motion_setPosition(float _pos){
  // not too introspective here,
  // TODO: we should halt ahead of this, non? could fk shit up bigtime 
  pos = fp_floatToFixed64(_pos);
}

void motion_getCurrentStates(motionState_t* statePtr){
  noInterrupts();
  statePtr->pos = fp_fixed64ToFloat(pos);
  statePtr->vel = fp_fixed32ToFloat(vel);
  statePtr->accel = fp_fixed32ToFloat(accel);
  interrupts();
}

// some notes on fixed-points,
/*

we have FP 15.17, so we have 32k ticks ahead of the dot and 131k behind. 
signed-ness means we have actually only 16k ticks ahead, so an effective 
max rate of 16k full-steps per second, which is 80 revs / second or only 4800RPM
that's... not really enough, 

FP 16.16 gets us to 9800 RPM, where a stepper will never go, but BLDCs might 
(though if we do any real-units alignment that's 32k of whatever unit: rads/sec, is enough)

So we'll pick FP 16.16 

*/