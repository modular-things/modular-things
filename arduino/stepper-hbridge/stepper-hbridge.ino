// C:\Users\jaker\AppData\Local\Arduino15\libraries\osap
#include <osap.h>
#include <vt_endpoint.h>
#include <vp_arduinoSerial.h>
#include <core/ts.h>
// ---------------------------------------------- Application State 

#define PIN_TICK 1
#define PIN_STEP 2
#define PIN_DIR 3

// NOTE: we need to do some maths here to set an absolute-maximum velocities... based on integrator width 
// and... could this be simpler? like, we have two or three "maximum" accelerations ?? operative and max ? 

#define MODE_POS 0
#define MODE_VEL 1
#define POS_EPSILON 0.001F

// hackney, this'll be an interrupt... allegedly 
const uint32_t integratorInterval = 1000; // microseconds (us) 
uint32_t lastIntegration = 0;
const float delT = 1000000 / integratorInterval;
// states (units are steps, 1=1 ?) 
volatile uint8_t mode = MODE_POS;         // operative mode 
volatile float pos = 0.0F;                // current position 
volatile float vel = 0.0F;                // current velocity 
volatile float accel = 1.0F;              // current acceleration 
volatile float operativeVel = 0.0F;       // velocity *to use*
volatile float operativeAccel = 50.0F;    // acceleration *to use*
// and settings 
float maxAccel = 250.0F;                  // absolute maximum acceleration (steps / sec)
float maxVel = 150.0F;                    // absolute maximum velocity (units / sec) 
// and targets 
float posTarget = 10000.0F;
// init-once values we'll use in the integrator 
volatile float delta = 0.0F;
volatile float stepModulo = 0.0F;
volatile float distanceToTarget = 0.0F;
volatile float stopDistance = 0.0F;

void integrate(void){
  digitalWrite(PIN_TICK, HIGH);
  // set our accel based on modal requests, 
  switch(mode){
    case MODE_POS:
      distanceToTarget = posTarget - pos;
      stopDistance = (vel * vel) / (2.0F * operativeAccel);
      if(stopDistance >= abs(distanceToTarget)){   // if we're going to overshoot, deccel:
        if(vel <= 0.0F){                // if -ve vel,
          accel = operativeAccel;             // do +ve accel, 
        } else {                        // if +ve vel, 
          accel = -operativeAccel;            // do -ve accel, 
        }
      }
      break;
    case MODE_VEL:
      if(vel < operativeVel){
        accel = operativeAccel; 
      } else if (vel > operativeVel){
        accel = -operativeAccel;
      }
      break;
  }
  // cap our accel based on maximum rates: 
  if(vel >= operativeVel){
    accel = 0.0F;
    vel = operativeVel;
  } else if(vel <= -operativeVel){
    accel = 0.0F;
    vel = - operativeVel;
  }
  // now: 
  // I don't know who I am,
  // I don't know where I am...
  // all I know is that I must integrate 
  vel += accel * delT;
  delta = vel * delT;
  // lastly... if we're about to smash the position target, don't smash it:
  if(abs(distanceToTarget - delta) < POS_EPSILON && abs(vel) < 0.01F){
    delta = distanceToTarget;
    vel = 0.0F;
    accel = 0.0F;
  }
  pos += delta;
  // and check in on our step modulo, 
  stepModulo += delta;
  if(stepModulo >= 1.0F){
    digitalWrite(PIN_DIR, HIGH);
    digitalWrite(PIN_STEP, !digitalRead(PIN_STEP));
  } else {
    digitalWrite(PIN_DIR, LOW);
    digitalWrite(PIN_STEP, !digitalRead(PIN_STEP));
  }
  digitalWrite(PIN_TICK, LOW);
}

// float stopDistance = (state.velocities.axis[a] * state.velocities.axis[a]) / (2.0F * settings.accelLimits.axis[a]);

// ---------------------------------------------- OSAP central-nugget 
OSAP osap("stepper");

// ---------------------------------------------- 0th Vertex: OSAP USB Serial
VPort_ArduinoSerial vp_arduinoSerial(&osap, "usbSerial", &Serial);

// ---------------------------------------------- 1th Vertex: Target Requests (pos, or velocity)
EP_ONDATA_RESPONSES onTargetData(uint8_t* data, uint16_t len){
  // key (pos / vel), <val>, <accel (optional)>
  // always is from-current-pos... 
  return EP_ONDATA_ACCEPT;
}

Endpoint targetEndpoint(&osap, "targetState", onTargetData);

// ---------------------------------------------- 2nd Vertex: Motion State
// queries only, more or less, so
EP_ONDATA_RESPONSES onMotionStateData(uint8_t* data, uint16_t len){return EP_ONDATA_REJECT;}

boolean beforeMotionStateQuery(void);

Endpoint stateEndpoint(&osap, "motionState", onMotionStateData, beforeMotionStateQuery);

boolean beforeMotionStateQuery(void){
  // in-fill current posn, velocity, and acceleration
  return true;
}

// ---------------------------------------------- 3rd Vertex: Set Values
EP_ONDATA_RESPONSES onSettingsData(uint8_t* data, uint16_t len){
  // should do maxAccel, maxVel, and (optionally) setPosition 
  // upstream should've though of this, so, 
  uint16_t rptr = 0;
  float _pos = ts_readFloat32(data, &rptr);
  noInterrupts();
  pos = _pos;
  interrupts();
  return EP_ONDATA_ACCEPT;
}

Endpoint settingsEndpoint(&osap, "settings", onSettingsData);

// ---------------------------------------------- 4th Vertex: Limit / Switch Output... non-op at the moment, 
Endpoint buttonEndpoint(&osap, "buttonState");

void setup() {
  pinMode(PIN_TICK, OUTPUT);
  pinMode(PIN_STEP, OUTPUT);
  pinMode(PIN_DIR, OUTPUT);
  // uuuh... 
  osap.init();
  // run the commos 
  vp_arduinoSerial.begin();
}

void loop() {
  // do graph stuff
  osap.loop();
  if(lastIntegration + integratorInterval < micros()){
    lastIntegration = micros();
    integrate();
  }
}