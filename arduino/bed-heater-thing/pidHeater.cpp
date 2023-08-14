#include "pidHeater.h"
#include "pidHeaterConfig.h"

PIDHeater::PIDHeater(uint32_t _outputPin, uint32_t _adcPin){
  outputPin = _outputPin;
  adcPin = _adcPin;
}

void PIDHeater::begin(void){
  // so, we're going to re-write that table so that the second value represents 
  // the ADC reading we'd expect to see at that temperature, 
  // so, 
  for(uint8_t t = 0; t < THERM_TABLE_LEN; t ++){
    // here's the resistance, 
    float resistance = thermTable[t][1];
    // the voltage we would expect, given that r is per 
    // the voltage divider, where v_out = (v_in * r2) / (r1 + r2)
    // where r1 is the "top", and r2 is... this changing one 
    float voltage = (THERM_VIN_VAL * resistance) / (THERM_R1_VAL + resistance);
    // that's rad, but we're going to read our ADC in bits, so we 
    // additionally want to scale it as such: 
    float reading = voltage * ((float)THERM_ADC_RANGE / THERM_VIN_VAL);
    // and we want to store that in-place; 
    thermTable[t][1] = reading;
    // debug !
    // Serial.println("t: " + String(thermTable[t][0], 1) + " rd: " + String(thermTable[t][1], 1));
    // delay(10);
  }

  // we should also setup the hardware... 
  // do 0-4096 analog readings 
  analogReadResolution(12);
  // oddly, ADC pins don't need a setup: they do that on-the-fly, sheesh 
  // setup our output to 1kHz / 12 bit:
  analogWriteFreq(1000);
  analogWriteResolution(12);
  // and it'll be an output:
  pinMode(adcPin, OUTPUT);

  loopInterval = config.delT * 1000;
}

float PIDHeater::getTemperature(void){
  // get le reading: 
  uint32_t reading = analogRead(adcPin);
  // the table ends up trending monotonic-down, so we can do 
  for(uint8_t t = 0; t < THERM_TABLE_LEN - 1; t ++){
    if(thermTable[t][1] > reading && reading > thermTable[t + 1][1]){
      // we are betwixt [t]:[t + 1]
      // let's get sensible labels and then calc
      float y1 = thermTable[t][0];
      float y2 = thermTable[t + 1][0];
      float x1 = thermTable[t][1];
      float x2 = thermTable[t + 1][1];
      // okay, then interpolate: 
      float y = y1 + ((reading - x1) * (y2 - y1)) / (x2 - x1);
      return y;
    }
  }
  // if we never found a match, 
  // report big temps (safety!)
  return 9000.0F;
}

pid_heater_states_t PIDHeater::getStates(void){
  return state;
}

void PIDHeater::loop(void){
  // we loop on the interval, yah ?
  if(lastLoop + loopInterval > millis()) return;
  lastLoop = millis();

  // get le-temp, 
  float reading = getTemperature();
  // ... and filter it 
  state.tempEstimate = reading * config.tempAlpha + state.tempEstimate * (1.0F - config.tempAlpha);

  // error... 
  state.errEstimate = state.setPoint - state.tempEstimate;

  // track a derivative of the error, 
  float errDerivative = (state.errEstimateLast - state.errEstimate) * (1 / config.delT);
  state.errEstimateLast = state.errEstimate;

  // and track-and-cap the integral, 
  state.errIntegral += state.errEstimate * config.delT;
  if(state.errIntegral > config.iLim){
    state.errIntegral = config.iLim;
  }
  if(state.errIntegral < - config.iLim){
    state.errIntegral = - config.iLim;
  }

  // now we can do:

  state.pContrib = state.errEstimate * config.pTerm;
  state.iContrib = state.errIntegral * config.iTerm;
  state.dContrib = errDerivative * config.dTerm;
  state.output = state.pContrib + state.iContrib + state.dContrib;

  // write that to the pin:
  if(state.output < 0.0F) state.output = 0.0F;
  if(state.output > THERM_PWM_RANGE) state.output = THERM_PWM_RANGE;
  analogWrite(outputPin, state.output * THERM_PWM_RANGE);
}