#include "motionStateMachine.h"
#include "stepperDriver.h"
#include <osap.h>

// NOTE: we need to do some maths here to set an absolute-maximum velocities... based on integrator width 
// and... could this be simpler? like, we have two or three "maximum" accelerations ?? operative and max ? 

// fp tests would be... writing to int, reading back floats, checking consistency 
// can probably use osap::debug ? 

// hmmm https://www.youtube.com/watch?v=S12qx1DwjVk& at ~ 18:00 
float fp_fixed32ToFloat(fpint32_t fixed){
  return ((float)fixed / (float)(1 << fp_scale));
}

// idk about this either, tbh 
float fp_fixed64ToFloat(fpint64_t fixed){
  return ((float)fixed / (float)(1 << fp_scale));
}

// actually this is unclear to me... https://www.youtube.com/watch?v=S12qx1DwjVk& at 16:57
fpint32_t fp_floatToFixed32(float flt){
  return (flt * (float)(1 << fp_scale));
}

// hmmm, 
fpint64_t fp_floatToFixed64(float flt){
  return (flt * (float)(1 << fp_scale));
}

int32_t fp_fixed32ToInt32(fpint32_t fixed){
  return (fixed >> fp_scale);
}

fpint32_t fp_int32ToFixed32(int32_t inty){
  return (inty << fp_scale); 
}

// w/ fixed point mult, we have some out-of-ranging trouble, 
// we can maybe do this w/ 64-bit ints, but it's going to suck a little bit of time
// though still better than the floating point libs, 
fpint32_t fp_mult32x32(fpint32_t a, fpint32_t b){
  return ((int64_t)(a) * (int64_t)(b)) >> fp_scale;
}
// we can instead do it w/ some fancy shifting, but I'm not going to get into this yet: 
// leaving it as a potential speedup... 
// https://www.youtube.com/watch?v=npQF28g6s_k& 7:40 
// fp_int32_t fp_mult(fpint32_t a, fpint32_t b){
//   return ((a >> 6) * (b >> 6)) >> 4;
// }

// division...
fpint32_t fp_div32x32(fpint32_t num, fpint32_t denum){
  return ((int64_t)(num) << fp_scale) / denum;
}

// big-div, 
fpint64_t fp_calcStopDistance(fpint32_t _vel, fpint32_t _maxAccel){
  // return 0;
  int64_t _velSq = ((int64_t)(_vel) * (int64_t)(_vel)) >> fp_scale;
  int64_t _accelTwo = ((int64_t)(_maxAccel) * (int64_t)(fp_int32ToFixed32(2))) >> fp_scale;
  return (_velSq << fp_scale) / _accelTwo;
}

// shouldn't be here: just using to debug interval time 
#define PIN_TICK 22 

// ---------------------------------------------- stateful stuff 
// ok, we store delT as a *float* - but we don't use it much in the 
// integrator... or at all; rather, it's used to convert our rates 
// (accel, vel) (which are in units-per-integration-step), 
// to/from normal-person rates (which are in units-per-second):
// additionally, this is re-calculated at startup, when we are told 
// how many microseconds happen in each integration, 
float delT = 0.001F; 
// not recalculated... or settings-adjustable, yet, 
// and note (!) this *is not* "microstepping" as in 1/n, it's n/16, per our LUTS 
uint8_t microsteps = 4; 
// states (units are steps, 1=1 ?) 
volatile uint8_t mode = MOTION_MODE_POS;            // operative mode 
volatile fpint64_t pos = 0;                         // current position (64-wide!) 
volatile fpint32_t vel = 0;                         // current velocity 
volatile fpint32_t accel = 0;                       // current acceleration 
// and settings... 
volatile fpint32_t maxAccel = 0;                    // absolute maximum acceleration (steps / sec) (not recalculated, but given w/ user instructions)
volatile fpint32_t maxVel = 0;                      // absolute maximum velocity (units / sec) (also recalculated on init)
volatile fpint32_t absMaxRate = 0;              // we'll recalculate this, it's related to our stepping rate 
// and targets, 
volatile fpint64_t posTarget = 0;
volatile fpint32_t velTarget = 0;
// ---------------------------------------------- integrator-internal stuff 
// init-once values we'll use in the integrator 
volatile fpint32_t delta = 0;
volatile fpint32_t stepModulo = 0;
volatile fpint64_t distanceToTarget = 0;

volatile fpint64_t twoDA = 0;
volatile fpint64_t vSquared = 0;

// ~ wavey, babey 
#define FP_STOPCALC_REDUCE 4

// s/o to http://academy.cba.mit.edu/classes/output_devices/servo/hello.servo-registers.D11C.ino 
// s/o also to https://gist.github.com/nonsintetic/ad13e70f164801325f5f552f84306d6f 
void motion_init(int32_t microsecondsPerIntegration){
  // -------------------------------------------- Maximums, given delta-tee,
  // before we get into hardware, let's consider our absolute-maximums;
  // here's our delta-tee, in real seconds:
  delT = (float)(microsecondsPerIntegration) / 1000000.0F;
  // that's ~ a base also for conversion as we swap around our internal units 
  // (which use units-per-integration-step), and the outside world (units-per-second)
  // first we want an absolute-max velocity: this is one-unit-per-integration-step, 
  // so actually it's just this, nice:
  absMaxRate = fp_int32ToFixed32(1);
  // init our maxVel to this absMax: 
  maxVel = absMaxRate;
  // and let's pick a startup accel that's ~ a tenth of this, idk:
  maxAccel = absMaxRate * fp_floatToFixed32(0.1F);
  // -------------------------------------------- Hardware Setup 
  // that's it - we can get on with the hardware configs 
  PORT->Group[0].DIRSET.reg = (uint32_t)(1 << PIN_TICK);
  // states are all initialized already, but we do want to get set-up on a timer interrupt, 
  // here we're using GCLK4, which I am assuming is set-up already / generated, in the 
  // stepper module, which uses it for PWM outputs ! 
  GCLK->CLKCTRL.reg = GCLK_CLKCTRL_CLKEN | 
                      GCLK_CLKCTRL_GEN_GCLK4 |
                      GCLK_CLKCTRL_ID_TC4_TC5;
  while(GCLK->STATUS.bit.SYNCBUSY);
  // now we want to unmask the TC5, 
  PM->APBCMASK.reg |= PM_APBCMASK_TC5;
  // set timer modes / etc, 
  TC5->COUNT16.CTRLA.reg |= TC_CTRLA_MODE_COUNT16 |
                            TC_CTRLA_WAVEGEN_MFRQ |
                            TC_CTRLA_PRESCALER_DIV8; // div/8 on 48mhz clock, so 6MHz base, 6-ticks-per-microsecond, 
  while(TC5->COUNT16.STATUS.bit.SYNCBUSY);
  // enable the interrupt,
  NVIC_DisableIRQ(TC5_IRQn);
  NVIC_ClearPendingIRQ(TC5_IRQn);
  NVIC_SetPriority(TC5_IRQn, 1); // hmmm 
  NVIC_EnableIRQ(TC5_IRQn);
  TC5->COUNT16.INTENSET.bit.MC0 = 1;
  // set la freqweenseh
  TC5->COUNT16.CC[0].reg = 6 * microsecondsPerIntegration;
  // and enable it, 
  TC5->COUNT16.CTRLA.reg |= TC_CTRLA_ENABLE;
  while(TC5->COUNT16.STATUS.bit.SYNCBUSY);
}

void TC5_Handler(void){
  PORT->Group[0].OUTSET.reg = (uint32_t)(1 << PIN_TICK);  // marks interrupt entry, to debug 
  TC5->COUNT16.INTFLAG.bit.MC0 = 1; // clear the interrupt
  motion_integrate(); // do the motion system integration, 
  PORT->Group[0].OUTCLR.reg = (uint32_t)(1 << PIN_TICK);  // marks exit 
}

void motion_integrate(void){
  // set our accel based on modal requests, 
  switch(mode){
    case MOTION_MODE_POS:
      // how far to go ? 
      distanceToTarget = posTarget - pos;
      // since we dead-reckon targets at the end, we should have this case:
      if(distanceToTarget == 0){
        vel = 0;
        accel = 0;
        break;
      }
      // I think it's like this:
      // (x << 1) == (x * 2), that's gorgus, 
      // and we're going to do this... with a little less prescision, as accel can be punishing:
      // that's the (x >> 16) in each of these terms... 
      twoDA = ((distanceToTarget << 1) >> FP_STOPCALC_REDUCE) * ((int64_t)(maxAccel) >> FP_STOPCALC_REDUCE);
      //abs(((((int64_t)(2 << fp_scale) * distanceToTarget) >> fp_scale) * (int64_t)(maxAccel)));
      vSquared = ((int64_t)(vel >> FP_STOPCALC_REDUCE) * (int64_t)(vel >> FP_STOPCALC_REDUCE));
      // we can use that to compare when-2-stop, 
      if(twoDA <= vSquared){    // if we're going to overshoot, deccel:
        if(vel <= 0){                               // if -ve vel,
          accel = maxAccel;                           // do +ve accel, 
        } else {                                    // if +ve vel, 
          accel = -maxAccel;                          // do -ve accel, 
        }
      } else {                                      // if we're not going to overshoot, 
        if(distanceToTarget > 0){                   // if +ve distance, 
          accel = maxAccel;                           // do +ve accel,
        } else {                                  // if -ve distnace,
          accel = -maxAccel;                          // do -ve accel, 
        }
      }
      break;
    case MOTION_MODE_VEL:
      if(vel < velTarget){
        accel = maxAccel; 
      } else if (vel > velTarget){
        accel = -maxAccel;
      }
      break;
  } // end mode-switch / accel settings, 
  // using our chosen accel, integrate velocity from previous: 
  // given that our rates are expressed in units-per-integration step, 
  // there's no multiply here, just += ... 
  vel += accel;
  // cap our vel based on maximum rates: 
  if(vel >= maxVel){
    accel = 0;
    vel = maxVel;
  } else if(vel <= -maxVel){
    accel = 0;
    vel = - maxVel;
  }
  // what's a position delta ? 
  delta = vel; 
  // if the next step is going to hit the targ, make exactly that delta... 
  if(mode == MOTION_MODE_POS){
    if(delta > distanceToTarget && distanceToTarget > 0){
      delta = distanceToTarget;
    } else if (delta < distanceToTarget && distanceToTarget < 0){
      delta = distanceToTarget;
    }
  }
  // I think we can smash these together (?) 
  pos += delta;
  // and check the step modulo as well:
  stepModulo += delta;
  if(stepModulo >= fp_int32ToFixed32(1)){
    stepper_step(microsteps, true);
    stepModulo -= fp_int32ToFixed32(1);
  } else if (stepModulo <= fp_int32ToFixed32(-1)){
    stepper_step(microsteps, false);
    stepModulo += fp_int32ToFixed32(1);
  }
} // end integrator 

void motion_setPositionTarget(float _targ, float _maxVel, float _maxAccel){
  // first, elevate from units-per-sec to units-per-integration-step,
  // and convert, 
  fpint32_t _mvCand = fp_floatToFixed32(_maxVel * delT);
  // I think that we might need to scale accel by delT^2, since 2nd derivative (?) or sth ?
  fpint32_t _maCand = fp_floatToFixed32(_maxAccel * delT * delT);
  // and check againt our abs-max, 
  if(_mvCand > absMaxRate) _mvCand = absMaxRate;
  if(_maCand > absMaxRate) _maCand = absMaxRate;
  // and stash as 
  noInterrupts();
  maxVel = _mvCand;
  maxAccel = _maCand;
  posTarget = fp_floatToFixed64(_targ);
  mode = MOTION_MODE_POS;
  interrupts();
}

void motion_setVelocityTarget(float _targ, float _maxAccel){
  fpint32_t _maCand = fp_floatToFixed32(_maxAccel * delT * delT);
  if(_maCand > absMaxRate) _maCand = absMaxRate;
  noInterrupts();
  maxAccel = _maCand;
  velTarget = fp_floatToFixed32(delT * _targ);
  mode = MOTION_MODE_VEL;
  interrupts();
}

void motion_setPosition(float _pos){
  // not too introspective here,
  pos = fp_floatToFixed64(_pos);
}

void motion_getCurrentStates(motionState_t* statePtr){
  noInterrupts();
  statePtr->pos = fp_fixed64ToFloat(pos);
  statePtr->vel = fp_fixed32ToFloat(vel) / delT;
  statePtr->accel = fp_fixed32ToFloat(accel) / delT;
  statePtr->distanceToTarget = fp_fixed64ToFloat(distanceToTarget);
  statePtr->maxVel = fp_fixed32ToFloat(maxVel) / delT;
  statePtr->maxAccel = fp_fixed32ToFloat(maxAccel) / delT;
  statePtr->twoDA = fp_fixed64ToFloat(twoDA);
  statePtr->vSquared = fp_fixed64ToFloat(vSquared);
  interrupts();
}

void motion_printDebug(void){
  // we should check if these worked, 
}