#include "motionStateMachine.h"
#include "stepperDriver.h"
#include <osap.h>

// NOTE: we need to do some maths here to set an absolute-maximum velocities... based on integrator width 
// and... could this be simpler? like, we have two or three "maximum" accelerations ?? operative and max ? 

// fp tests would be... writing to int, reading back floats, checking consistency 
// can probably use osap::debug ? 

// hmmm https://www.youtube.com/watch?v=S12qx1DwjVk& at ~ 18:00 
float fp_fixedToFloat(fpint32_t fixed){
  return ((float)fixed / (float)(1 << fp_scale));
}

// actually this is unclear to me... https://www.youtube.com/watch?v=S12qx1DwjVk& at 16:57
fpint32_t fp_floatToFixed(float flt){
  return (flt * (float)(1 << fp_scale));
}

int32_t fp_fixedToInt(fpint32_t fixed){
  return (fixed >> fp_scale);
}

fpint32_t fp_intToFixed(int32_t inty){
  return (inty << fp_scale); 
}

// w/ fixed point mult, we have some out-of-ranging trouble, 
// we can maybe do this w/ 64-bit ints, but it's going to suck a little bit of time
// though still better than the floating point libs, 
fpint32_t fp_mult(fpint32_t a, fpint32_t b){
  return ((int64_t)(a) * (int64_t)(b)) >> fp_scale;
}
// we can instead do it w/ some fancy shifting, but I'm not going to get into this yet: 
// leaving it as a potential speedup... 
// https://www.youtube.com/watch?v=npQF28g6s_k& 7:40 
// fp_int32_t fp_mult(fpint32_t a, fpint32_t b){
//   return ((a >> 6) * (b >> 6)) >> 4;
// }

// division...
fpint32_t fp_div(fpint32_t num, fpint32_t denum){
  return ((int64_t)(num) << fp_scale) / denum;
}

// big-div, 
fpint32_t fp_calcStopDistance(fpint32_t _vel, fpint32_t _maxAccel){
  int64_t _velSq = ((int64_t)(_vel) * (int64_t)(_vel)) >> fp_scale;
  int64_t _accelTwo = ((int64_t)(_maxAccel) * (int64_t)(fp_intToFixed(2))) >> fp_scale;
  return (_velSq << fp_scale) / _accelTwo;
}

// stopping criteria... state machine is not perfect,
#define POS_EPSILON fp_floatToFixed(0.01F)
#define VEL_EPSILON 1.0F
#define TICK_INTERVAL 1000.0F

// shouldn't be here: just using to debug interval time 
#define PIN_TICK 22 

// ---------------------------------------------- stateful stuff 
// delT is re-calculated when we init w/ a new microsecondsPerIntegration 
fpint32_t delT = fp_floatToFixed(0.001F);
// not recalculated... or settings-adjustable, yet, 
uint8_t microsteps = 4; // and note (!) this *is not* "microstepping" as in 1/n, it's n/16, per our LUTS 
// states (units are steps, 1=1 ?) 
volatile uint8_t mode = MOTION_MODE_POS;            // operative mode 
volatile fpint32_t pos = 0;                         // current position 
volatile fpint32_t vel = 0;                         // current velocity 
volatile fpint32_t accel = 0;                       // current acceleration 
// and settings 
fpint32_t maxAccel = fp_floatToFixed(5000.0F);      // absolute maximum acceleration (steps / sec) (not recalculated, but given w/ user instructions)
fpint32_t maxVel = fp_floatToFixed(900.0F);         // absolute maximum velocity (units / sec) (also recalculated on init)
fpint32_t absMaxVelocity = fp_floatToFixed(10.0F);  // we'll recalculate this, it's related to our stepping rate 
// and targets 
fpint32_t posTarget = 0;
fpint32_t velTarget = 0;

// ---------------------------------------------- internal stuff 
// init-once values we'll use in the integrator 
volatile fpint32_t delta = 0;
volatile fpint32_t stepModulo = 0;
volatile fpint32_t distanceToTarget = 0;
volatile fpint32_t stopDistance = 0;

// s/o to http://academy.cba.mit.edu/classes/output_devices/servo/hello.servo-registers.D11C.ino 
// s/o also to https://gist.github.com/nonsintetic/ad13e70f164801325f5f552f84306d6f 
void motion_init(int32_t microsecondsPerIntegration){
  // before we get into hardware, let's consider our absolute-maximums;
  // here's our delta-tee:
  // ... resorting to floating maths here for the big div, then converting, 
  float fdelT = (float)(microsecondsPerIntegration) / 1000000.0F;
  delT = fp_floatToFixed(fdelT);
  // oof, this'll break... since the 1m is out of our range, non ? 
  // though maybe the promotion to 64-bits helps, so I should test 
  // delT = fp_div(fp_intToFixed(microsecondsPerIntegration), fp_intToFixed(1000000));
  // we absolutely cannot step more than one tick-per-integration cycle, 
  // since we are in one-step-per-unit land, it means our absMax is just 1/delT, 
  absMaxVelocity = fp_div(fp_intToFixed(1), delT);
  // init our maxVel to this absMax, 
  maxVel = absMaxVelocity; // start here, 
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
      // how far to stop, at end ? 
      // for vf = 0, d = (vel^2) / (2 * a)
      // or d / (2 * a) = vel ^ 2
      // or sqrt(d/(2a)) = vel ?? useless, sqrt hard 
      // yar: this easily scales velocities outside of any sensible range... 
      stopDistance = fp_calcStopDistance(vel, maxAccel); // fp_div(fp_mult(vel, vel), fp_mult(fp_intToFixed(2), maxAccel));
      // check for overshoot: 
      if(stopDistance >= abs(distanceToTarget)){    // if we're going to overshoot, deccel:
        if(vel <= 0){                               // if -ve vel,
          accel = maxAccel;                           // do +ve accel, 
        } else {                                    // if +ve vel, 
          accel = -maxAccel;                          // do -ve accel, 
        }
      } else {                                      // if we're not going to overshoot, 
        if(distanceToTarget > 0){                   // if +ve distance, 
          accel = maxAccel;                           // do +ve accel,
        } else {                                    // if -ve distnace,
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
  }
  // using our chosen accel, integrate velocity from previous: 
  vel += fp_mult(accel, delT);
  // cap our vel based on maximum rates: 
  if(vel >= maxVel){
    accel = 0;
    vel = maxVel;
  } else if(vel <= -maxVel){
    accel = 0;
    vel = - maxVel;
  }
  // what's a position delta ? 
  delta = fp_mult(vel, delT);
  // if the next step is going to hit the targ, make exactly that delta... 
  if(mode == MOTION_MODE_POS){
    if(delta > distanceToTarget && distanceToTarget > 0){
      delta = distanceToTarget;
    } else if (delta < distanceToTarget && distanceToTarget < 0){
      delta = distanceToTarget;
    }
  }
  // integrate posn with delta 
  pos += delta;
  // Serial.println(String(pos) + " " + String(vel) + " " + String(accel) + " " + String(distanceToTarget));
  // and check in on our step modulo, 
  stepModulo += delta;
  if(stepModulo >= fp_intToFixed(1)){
    stepper_step(microsteps, true);
    stepModulo -= fp_intToFixed(1);
  } else if (stepModulo <= fp_intToFixed(-1)){
    stepper_step(microsteps, false);
    stepModulo += fp_intToFixed(1);
  }
} // end integrator 

void motion_setPositionTarget(float _targ, float _maxVel, float _maxAccel){
  // I'm ~ kind of assuming we are already stopped when these reqs are issued, so... 
  noInterrupts();
  maxAccel = fp_floatToFixed(_maxAccel);
  maxVel = fp_floatToFixed(_maxVel);
  posTarget = fp_floatToFixed(_targ);
  mode = MOTION_MODE_POS;
  interrupts();
}

void motion_setVelocityTarget(float _targ, float _maxAccel){
  noInterrupts();
  maxAccel = fp_floatToFixed(_maxAccel);
  velTarget = fp_floatToFixed(_targ);
  mode = MOTION_MODE_VEL;
  interrupts();
}

void motion_setPosition(float _pos){
  // not too introspective here,
  pos = fp_floatToFixed(_pos);
}

void motion_getCurrentStates(motionState_t* statePtr){
  noInterrupts();
  statePtr->pos = fp_fixedToFloat(pos);
  statePtr->vel = fp_fixedToFloat(vel);
  statePtr->accel = fp_fixedToFloat(accel);
  statePtr->distanceToTarget = fp_fixedToFloat(distanceToTarget);
  statePtr->stopDistance = fp_fixedToFloat(stopDistance);
  interrupts();
}

void motion_printDebug(void){
  // we should check if these worked, 
  // OSAP::debug("delT and absMax, " + String(fp_fixedToFloat(delT), 6) + " " + String(fp_fixedToFloat(absMaxVelocity)));
}