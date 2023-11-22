#include <osap.h>
#include "pidHeater.h"
#include "cs5530.h"

OSAP_Runtime osap;
OSAP_Gateway_USBSerial serLink(&Serial);
OSAP_Port_DeviceNames namePort("hotend");

// // the hardware config... i.e. pins 

#define THERM_ADC_PIN       26
#define THERM_PWM_PIN       27
#define PCF_PWM_PIN         28 

#define LOADCELL_PIN_CS     29
#define LOADCELL_PIN_CLK    6
#define LOADCELL_PIN_MOSI   7
#define LOADCELL_PIN_MISO   4

PIDHeater heater(THERM_PWM_PIN, THERM_ADC_PIN);

// CURRENT STATE OF DEV (2023-08-17)
/*
- have found circuit mistake in the loadcell (no loading caps on the crystal)
- am going to correct that, re-order, re-fab, and unfk the filament sensor design as well 
- then will get back 2 rolling this thing up 
*/

// CS5530_Loadcell loadcell(LOADCELL_PIN_CS, LOADCELL_PIN_CLK, LOADCELL_PIN_MOSI, LOADCELL_PIN_MISO);

// -------------------------- Coupla OSAP Hookups 

// write a new config 

void writeHeaterConfig(uint8_t* data, size_t len){
  // it's the hot new extraction technique 
  pid_heater_config_t config;
  memcpy(&config, data, sizeof config);
  // hand that off 
  heater.setConfig(&config);
}

OSAP_Port_Named heaterConfig_port("writeHeaterConfig", writeHeaterConfig);

// update the setpoint 

void writeHeaterSetPoint(uint8_t* data, size_t len){
  // same trick works just as well 
  float setPoint = 0.0F;
  memcpy(&setPoint, data, sizeof setPoint);
  // again 
  heater.setTemperature(setPoint);
}

OSAP_Port_Named heaterSetPoint_port("writeHeaterSetPoint", writeHeaterSetPoint);

// get them states,

size_t getHeaterStates(uint8_t* data, size_t len, uint8_t* reply){
  // get one 
  pid_heater_states_t states = heater.getStates();
  // copy it into the msg, 
  memcpy(reply, &states, sizeof states);
  // reply the len, 
  return sizeof states; 
}

OSAP_Port_Named heaterStates_Port("getHeaterStates", getHeaterStates);

// set PCF output 

void setPCFSpeed(uint8_t* data, size_t len){
  float dutyCycle = 0.0F;
  memcpy(&dutyCycle, data, sizeof dutyCycle);
  analogWrite(PCF_PWM_PIN, dutyCycle * 4096);
}

OSAP_Port_Named setPCFSpeed_Port("setPCFSpeed", setPCFSpeed);

// -------------------------- Arduino Setup 

void setup() {
  // and our debug light
  pinMode(LED_BUILTIN, OUTPUT);

  // our pcf outp
  pinMode(PCF_PWM_PIN, OUTPUT);

  // and setup our tables and hardware 
  heater.begin();

  // and the loadcell... 
  // Serial.begin();
  // while(!Serial);
  // delay(500);
  // ... 
  // loadcell.begin();

  // do the osap setup, 
  osap.begin();
}

// -------------------------- Arduino Loop

uint32_t debugLastTime = 0;
uint32_t debugInterval = 100;
bool debugLightState = false;

void loop() {
  osap.loop();
  heater.loop();
  // loadcell.loop();
  if(debugLastTime + debugInterval < millis()){
    digitalWrite(LED_BUILTIN, debugLightState);
    debugLightState = !debugLightState;
    debugLastTime = millis();
    // pid_heater_states_t states = heater.getStates();
  }
}
