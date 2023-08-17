#include "cs5530.h"
#include <SPI.h>

#define CIRRUS_DEFAULT_SPI_BAUD     8E6

// commands 
#define CIRRUS_SYNC1                0xFF
#define CIRRUS_SYNC0                0xFE
#define CIRRUS_CONFIG_READ          0x0B
#define CIRRUS_CONFIG_WRITE         0x03

// registers 
#define CIRRUS_CONFIG_RESET         (1 << 29)
#define CIRRUS_CONFIG_RESET_VALID   (1 << 28)

#define SPI_START                   SPI.beginTransaction(settings); digitalWrite(csPin, LOW)
#define SPI_END                     digitalWrite(csPin, HIGH); SPI.endTransaction()

// we are MSBFirst and Mode 0,
SPISettings settings(CIRRUS_DEFAULT_SPI_BAUD, MSBFIRST, SPI_MODE0);

CS5530_Loadcell::CS5530_Loadcell(uint32_t _csPin, uint32_t _clkPin, uint32_t _mosiPin, uint32_t _misoPin){
  csPin = _csPin;
  clkPin = _clkPin;
  mosiPin = _mosiPin;
  misoPin = _misoPin;
}

void CS5530_Loadcell::begin(void){
  SPI.setRX(misoPin);
  SPI.setTX(mosiPin);
  SPI.setSCK(clkPin);
  SPI.begin(false);
  pinMode(csPin, OUTPUT);
  digitalWrite(csPin, HIGH);
  // (1) to init we send 
  Serial.println("resync...");
  // "15 SYNC1 command bytes (0xFF hex) followed by one SYNC0 command"
  // might need to start / stop each byte ? 
  for(uint8_t i = 0; i < 15; i ++){
    SPI_START;
    SPI.transfer(CIRRUS_SYNC1);
    SPI_END;
  }
  SPI_START;
  SPI.transfer(CIRRUS_SYNC0);
  SPI_END;
  // should read-and-check 
  // if(reg && CIRRUS_CONFIG_RESET_VALID){
  //   // sync and setup OK so far,
  // } else {
  //   // sth has gone wrong 
  // }
}

uint32_t timeLast = 0;
uint32_t timeInterval = 100;

void CS5530_Loadcell::loop(void){
  if(timeLast + timeInterval < millis()){
    timeLast = millis();
    getReading();
  }
}

int32_t CS5530_Loadcell::getReading(void){
  // (2) reset 
  Serial.println("reset...");
  // and then we "write a logic 1 into the RS bit of the configuration register"
  writeConfigurationRegister(CIRRUS_CONFIG_RESET);
  delayMicroseconds(50);
  // and then we wait 8 clock cycles and write a 0 back into this register, 
  writeConfigurationRegister(0);
  delayMicroseconds(50);
  // now we can check if the reset was valid 
  // by reading the config register... 
  uint32_t reg = readConfigurationRegister();
  Serial.println("reg: " + String(reg, BIN));

  // digitalWrite(csPin, LOW);
  // SPI.beginTransaction(settings);
  // uint8_t data = SPI.transfer(0b01010101);
  // SPI.endTransaction();
  // digitalWrite(csPin, HIGH);
  return 0;
}

void CS5530_Loadcell::writeConfigurationRegister(uint32_t word){
  SPI_START;
  SPI.transfer(CIRRUS_CONFIG_WRITE);
  SPI_END;
  SPI_START;
  for(int8_t i = 3; i >= 0; i --){
    SPI.transfer(word >> (8 * i));
  }
  SPI_END;
}

uint32_t CS5530_Loadcell::readConfigurationRegister(void){
  uint32_t reg = 0;
  SPI_START;
  SPI.transfer(CIRRUS_CONFIG_READ);
  SPI_END;
  SPI_START;
  for(uint8_t i = 0; i < 4; i ++){
    reg |= SPI.transfer(0) << (8 * i);
  }
  SPI_END;
  return reg;
}