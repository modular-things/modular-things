#ifndef PID_HEATER_H_
#define PID_HEATER_H_

#include <Arduino.h>

typedef struct pid_heater_states_t {
  // setpoint, current, and efforts:
  float setPoint = 0.0F;
  float tempEstimate = 0.0F;
  // loop internal 
  float errEstimate = 0.0F;
  float errEstimateLast = 0.0F;
  float errIntegral = 0.0F;
  // pid contributions (to output)
  float output = 0.0F;
  float pContrib = 0.0F;
  float iContrib = 0.0F;
  float dContrib = 0.0F;
} pid_heater_states_t;

typedef struct pid_heater_config_t {
  // loop period, (sets timing as-well)
  float delT = 0.01F; 
  // pid values, 
  float pTerm = 0.20F;
  float iTerm = 0.0025F;
  float iLim = 50.0F;
  float dTerm = 0.04F;
  // filter settings 
  float tempAlpha = 0.05F;
} pid_heater_config_t;

class PIDHeater {
  public: 
    PIDHeater(uint32_t _outputPin, uint32_t _adcPin);
    // setup / go 
    void begin(void);
    void loop(void);
    // give'ems 
    void setTemperature(float _temp);
    void setConfig(pid_heater_config_t* _config);
    // gettem's 
    // gets temperature w/ a freshy reading 
    float getTemperature(void);
    // returns current pid-loop states:
    pid_heater_states_t getStates(void);
  private:
    // pins 
    uint32_t outputPin;
    uint32_t adcPin;
    // times 
    uint32_t lastLoop = 0;
    uint32_t loopInterval = 100;
    // states 
    pid_heater_states_t state;
    pid_heater_config_t config;
};

#endif 