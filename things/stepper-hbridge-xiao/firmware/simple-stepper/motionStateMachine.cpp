#include "motionStateMachine.h"
#include "stepperDriver.h"

// NOTE: we need to do some maths here to set an absolute-maximum velocities... based on integrator width 
// and... could this be simpler? like, we have two or three "maximum" accelerations ?? operative and max ? 

// stopping criteria... state machine is not perfect,
#define POS_EPSILON 0.01F
#define VEL_EPSILON 1.0F
#define TICK_INTERVAL 1000.0F

#define ALARM_DT_NUM 1
#define ALARM_DT_IRQ TIMER_IRQ_1

// we can take some pin over to do debuggen... 
#define PIN_DEBUG 26 

// delT is re-calculated when we init w/ a new microsecondsPerIntegration 
float delT = 0.001F;
uint32_t delT_us = 1;
// not recalculated... or settings-adjustable, yet, 
uint8_t microsteps = 4; // and note (!) this *is not* "microstepping" as in 1/n, it's n/16, per our LUTS 
// states (units are steps, 1=1 ?) 
volatile uint8_t mode = MOTION_MODE_POS;         // operative mode 
volatile float pos = 0.0F;                // current position 
volatile float vel = 0.0F;                // current velocity 
volatile float accel = 0.0F;              // current acceleration 
// and settings 
float maxAccel = 5000.0F;                  // absolute maximum acceleration (steps / sec) (not recalculated, but given w/ user instructions)
float maxVel = 900.0F;                      // absolute maximum velocity (units / sec) (also recalculated on init)
float absMaxVelocity = 10.0F;               // we'll recalculate this, it's related to our stepping rate 
// and targets 
float posTarget = 0.0F;
float velTarget = 0.0F;
// init-once values we'll use in the integrator 
volatile float delta = 0.0F;
volatile float stepModulo = 0.0F;
volatile float distanceToTarget = 0.0F;
volatile float stopDistance = 0.0F;

// s/o to http://academy.cba.mit.edu/classes/output_devices/servo/hello.servo-registers.D11C.ino 
// s/o also to https://gist.github.com/nonsintetic/ad13e70f164801325f5f552f84306d6f 
void motion_init(uint16_t microsecondsPerIntegration){
  // before we get into hardware, let's consider our absolute-maximums;
  // here's our delta-tee:
  delT = (float)(microsecondsPerIntegration) / 1000000.0F;
  delT_us = microsecondsPerIntegration;

  // we absolutely cannot step more than one tick-per-integration cycle, 
  // since we are in one-step-per-unit land, it means our absMax is just 1/delT, 
  absMaxVelocity = 1.0F / delT; 
  maxVel = absMaxVelocity; // start here, 

  hw_set_bits(&timer_hw->inte, 1u << ALARM_DT_NUM);
  irq_set_exclusive_handler(ALARM_DT_IRQ, alarm_dt_Handler);
  irq_set_enabled(ALARM_DT_IRQ, true);
  timer_hw->alarm[ALARM_DT_NUM] = (uint32_t) (timer_hw->timerawl + delT_us);

  pinMode(PIN_DEBUG, OUTPUT);
}

uint16_t point = 0;

void alarm_dt_Handler(void){
  // setup next call right away
  hw_clear_bits(&timer_hw->intr, 1u << ALARM_DT_NUM);
  timer_hw->alarm[ALARM_DT_NUM] = (uint32_t) (timer_hw->timerawl + delT_us);
  // do the motion system integration, 
  sio_hw->gpio_set = (uint32_t)(1 << PIN_DEBUG);
  // we do a debug step 
  point ++;
  if(point >= 2048) point = 0;
  stepper_point(point, 50);
  // motion_integrate(); 
  sio_hw->gpio_clr = (uint32_t)(1 << PIN_DEBUG);
}

void motion_integrate(void){
  // set our accel based on modal requests, 
  switch(mode){
    case MOTION_MODE_POS:
      distanceToTarget = posTarget - pos;
      stopDistance = (vel * vel) / (2.0F * maxAccel);
      if(abs(distanceToTarget - delta) < POS_EPSILON){
        // zero out and don't do any phantom motion 
        delta = 0.0F;
        vel = 0.0F;
        accel = 0.0F;
        return; 
      }
      if(stopDistance >= abs(distanceToTarget)){    // if we're going to overshoot, deccel:
        if(vel <= 0.0F){                            // if -ve vel,
          accel = maxAccel;                         // do +ve accel, 
        } else {                                    // if +ve vel, 
          accel = -maxAccel;                        // do -ve accel, 
        }
      } else {
        if(distanceToTarget > 0.0F){
          accel = maxAccel;
        } else {
          accel = -maxAccel;
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
  vel += accel * delT;
  // cap our vel based on maximum rates: 
  if(vel >= maxVel){
    accel = 0.0F;
    vel = maxVel;
  } else if(vel <= -maxVel){
    accel = 0.0F;
    vel = - maxVel;
  }
  // what's a position delta ? 
  delta = vel * delT;
  // integrate posn with delta 
  pos += delta;
  // Serial.println(String(pos) + " " + String(vel) + " " + String(accel) + " " + String(distanceToTarget));
  // and check in on our step modulo, 
  stepModulo += delta;
  if(stepModulo >= 1.0F){
    // stepper_step(microsteps, true);
    stepModulo -= 1.0F;
  } else if (stepModulo <= -1.0F){
    // stepper_step(microsteps, false);
    stepModulo += 1.0F;
  }
} // end integrator 

void motion_setPositionTarget(float _targ, float _maxVel, float _maxAccel){
  // I'm ~ kind of assuming we are already stopped when these reqs are issued, so... 
  noInterrupts();
  maxAccel = _maxAccel;
  maxVel = _maxVel;
  posTarget = _targ;
  mode = MOTION_MODE_POS;
  interrupts();
}

void motion_setVelocityTarget(float _targ, float _maxAccel){
  noInterrupts();
  maxAccel = _maxAccel;
  velTarget = _targ;
  mode = MOTION_MODE_VEL;
  interrupts();
}

void motion_setPosition(float _pos){
  // not too introspective here,
  pos = _pos;
}

void motion_getCurrentStates(motionState_t* statePtr){
  noInterrupts();
  statePtr->pos = pos;
  statePtr->vel = vel;
  statePtr->accel = accel;
  interrupts();
}
