#include "motionStateMachine.h"

#define PIN_TICK 1
#define PIN_STEP 2
#define PIN_DIR 3

// NOTE: we need to do some maths here to set an absolute-maximum velocities... based on integrator width 
// and... could this be simpler? like, we have two or three "maximum" accelerations ?? operative and max ? 

#define POS_EPSILON 0.001F
#define TICK_INTERVAL 1000.0F

// hackney, this'll be an interrupt... allegedly 
const float delT = TICK_INTERVAL / 1000000;
// states (units are steps, 1=1 ?) 
volatile uint8_t mode = MOTION_MODE_VEL;         // operative mode 
volatile float pos = 0.0F;                // current position 
volatile float vel = 0.0F;                // current velocity 
volatile float accel = 0.0F;              // current acceleration 
// and settings 
float maxAccel = 100.0F;                  // absolute maximum acceleration (steps / sec)
float maxVel = 900.0F;                    // absolute maximum velocity (units / sec) 
// and targets 
float posTarget = 0.0F;
float velTarget = 0.0F;
// init-once values we'll use in the integrator 
volatile float delta = 0.0F;
volatile float stepModulo = 0.0F;
volatile float distanceToTarget = 0.0F;
volatile float stopDistance = 0.0F;

void motion_init(void){
  pinMode(PIN_TICK, OUTPUT);
  pinMode(PIN_STEP, OUTPUT);
  pinMode(PIN_DIR, OUTPUT);
}

void motion_integrate(void){
  digitalWrite(PIN_TICK, HIGH);
  // set our accel based on modal requests, 
  switch(mode){
    case MOTION_MODE_POS:
      distanceToTarget = posTarget - pos;
      stopDistance = (vel * vel) / (2.0F * maxAccel);
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
  // lastly... if we're about to smash the position target, don't smash it:
  // if(abs(distanceToTarget - delta) < POS_EPSILON && abs(vel) < 0.01F){
  //   delta = distanceToTarget;
  //   vel = 0.0F;
  //   accel = 0.0F;
  // }
  pos += delta;
  // Serial.println(String(pos) + " " + String(vel) + " " + String(accel) + " " + String(distanceToTarget));
  // and check in on our step modulo, 
  stepModulo += delta;
  if(stepModulo >= 1.0F){
    digitalWrite(PIN_DIR, HIGH);
    digitalWrite(PIN_STEP, !digitalRead(PIN_STEP));
    stepModulo -= 1.0F;
  } else if (stepModulo <= -1.0F){
    digitalWrite(PIN_DIR, LOW);
    digitalWrite(PIN_STEP, !digitalRead(PIN_STEP));
    stepModulo += 1.0F;
  }
  digitalWrite(PIN_TICK, LOW);
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