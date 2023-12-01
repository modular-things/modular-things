#include <Servo.h>
#include "maxl.h"
#include <osap.h>

//      PIN           RP2040 GPIO PIN         XIAO Generic Pin 
#define PIN_SERVO     6                       // A4 
#define PIN_A_DIR     7                       // A5 
#define PIN_A_STEP    0                       // A6 
#define PIN_B_DIR     2                       // A8 
#define PIN_B_STEP    1                       // A7
#define PIN_C_DIR     4                       // A9 
#define PIN_C_STEP    3                       // A10 

Servo servo; 

typedef struct stepperSettings {
  uint32_t stepPin = 0;
  uint32_t dirPin = 0;
  bool dir = false;
  float stepsPerUnit = 0.0F;
  float unitsPerStep = 0.0F;
  float stepModulo = 0.0F;
} stepperSettings;

stepperSettings aMotorSettings;
stepperSettings bMotorSettings;

void hardwareBegin(void){
  // config a 
  aMotorSettings.stepPin = PIN_A_STEP;
  aMotorSettings.dirPin = PIN_A_DIR;
  aMotorSettings.dir = false;
  aMotorSettings.stepsPerUnit = 160.0F;
  // config b 
  bMotorSettings.stepPin = PIN_B_STEP;
  bMotorSettings.dirPin = PIN_B_DIR;
  bMotorSettings.dir = false;
  bMotorSettings.stepsPerUnit = 160.0F;
  // calc
  aMotorSettings.unitsPerStep = 1.0F / aMotorSettings.stepsPerUnit;
  bMotorSettings.unitsPerStep = 1.0F / bMotorSettings.stepsPerUnit;
  // pin config 
  pinMode(aMotorSettings.dirPin, OUTPUT);
  pinMode(aMotorSettings.stepPin, OUTPUT);
  pinMode(bMotorSettings.dirPin, OUTPUT);
  pinMode(bMotorSettings.stepPin, OUTPUT);
  // aaaand 
  servo.attach(PIN_SERVO);
  servo.writeMicroseconds(1500);
}

stepperSettings* stpr = nullptr;

void aStepperListener(float position, float delta){
  stpr = &aMotorSettings;
  stpr->stepModulo += delta;
  if(stpr->stepModulo > stpr->unitsPerStep){
    digitalWrite(stpr->dirPin, stpr->dir);
    digitalWrite(stpr->stepPin, HIGH);
    delayMicroseconds(1);
    digitalWrite(stpr->stepPin, LOW);
    delayMicroseconds(1);
    stpr->stepModulo -= stpr->unitsPerStep;
  } 
  if (stpr->stepModulo < -stpr->unitsPerStep){
    digitalWrite(stpr->dirPin, !stpr->dir);
    digitalWrite(stpr->stepPin, HIGH);
    delayMicroseconds(1);
    digitalWrite(stpr->stepPin, LOW);
    delayMicroseconds(1);
    stpr->stepModulo += stpr->unitsPerStep;
  }
}

void bStepperListener(float position, float delta){
  stpr = &bMotorSettings;
  stpr->stepModulo += delta;
  if(stpr->stepModulo > stpr->unitsPerStep){
    digitalWrite(stpr->dirPin, stpr->dir);
    digitalWrite(stpr->stepPin, HIGH);
    delayMicroseconds(1);
    digitalWrite(stpr->stepPin, LOW);
    delayMicroseconds(1);
    stpr->stepModulo -= stpr->unitsPerStep;
  } 
  if (stpr->stepModulo < -stpr->unitsPerStep){
    digitalWrite(stpr->dirPin, !stpr->dir);
    digitalWrite(stpr->stepPin, HIGH);
    delayMicroseconds(1);
    digitalWrite(stpr->stepPin, LOW);
    delayMicroseconds(1);
    stpr->stepModulo += stpr->unitsPerStep;
  }
}

void servoListener(float position, float delta){
  // let's map position to servo ranges, 
  // say... 100 microseconds of advance for every "unit" 
  // and we'll center at 1500... 
  float micros = 1500.0F - position * 100.0F;
  servo.writeMicroseconds(micros);
}

// ---------------------------------------------- PROTOTYPE MAXL API THINGS 

MAXL maxl; 

MAXL_TrackPositionLinear stepperATrack("aStepper", aStepperListener);
MAXL_TrackPositionLinear stepperBTrack("bStepper", bStepperListener);
MAXL_TrackPositionLinear servoTrack("servo", servoListener);

// ---------------------------------------------- OSAP SETUP 

OSAP_Runtime osap;
OSAP_Gateway_USBSerial serLink(&Serial);
OSAP_Port_DeviceNames namePort("haxidrawController");

// ---------------------------------------------- MAXL over MUTTS 

size_t maxlMessageInterface(uint8_t* data, size_t len, uint8_t* reply){
  return maxl.messageHandler(data, len, reply);
}

OSAP_Port_Named maxlMessage_port("maxlMessages", maxlMessageInterface);

// ---------------------------------------------- ACTU config the actual actuator 

// void writeMotorSettings(uint8_t* data, size_t len){
//   // it's just <cscale> for the time being, 
//   uint16_t rptr = 0;
//   float cscale = ts_readFloat32(data, &rptr);
//   // yarp, yarp, yarp, 
//   stepper_setCScale(cscale);
//   OSAP_DEBUG("writing cscale: " + String(cscale));
// }

// OSAP_Port_Named writeMotorSettings_port("writeMotorSettings", writeMotorSettings);

// ---------------------------------------------- attach error / debug msgs to the link pipe 

OSAP_Port_MessageEscape debugPort;

// ---------------------------------------------- arduino setup 

void setup() {
  // startup self 
  hardwareBegin();
  // startup sys
  osap.begin();
  maxl.begin();
  // get debug 
  osap.attachDebugFunction(debugPort.escape);
  // we'll blink the user-led 
  pinMode(LED_BUILTIN, OUTPUT);
}

// ---------------------------------------------- arduino loop 

uint32_t lastBlink = 0;
uint32_t intervalBlink = 50;

void loop() {
  // do graph stuff
  osap.loop();
  // do maxl stuff 
  maxl.loop();
  // check check
  // we should blink a light or sth 
  if(lastBlink + intervalBlink < millis()){
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
    lastBlink = millis();
  }
}
