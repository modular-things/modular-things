#ifndef CS5530_H_
#define CS5530_H_

#include <Arduino.h>

class CS5530_Loadcell {
  public: 
    CS5530_Loadcell(uint32_t _csPin, uint32_t _clkPin, uint32_t _mosiPin, uint32_t _misoPin);
    void begin(void);
    void loop(void);
    int32_t getReading(void);
  private:
    void writeConfigurationRegister(uint32_t word);
    uint32_t readConfigurationRegister(void);
    uint32_t csPin;
    uint32_t clkPin;
    uint32_t mosiPin;
    uint32_t misoPin;
};

#endif 