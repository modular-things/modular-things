#include <osap.h>

#define PIN_LED 27
#define PIN_THERM 28 
#define PIN_GATE 29

OSAP_Runtime osap;
OSAP_Gateway_USBSerial serLink(&Serial);
OSAP_Port_DeviceNames namePort("mosfet");


void setGate(uint8_t* data, size_t len){
  // we did the float -> int conversion in js 
  uint8_t duty = data[0];
  analogWrite(PIN_GATE, duty);
  digitalWrite(PIN_LED, duty > 0 ? HIGH : LOW);
}

OSAP_Port_Named setGate_port("setGate", setGate);


uint32_t pulseStart = 0;
uint32_t pulseDuration = 0;
uint32_t pulseDuty = 0;

void pulseGate(uint8_t* data, size_t len){
  // duty (0-255), duration (0-255 ms)
  pulseDuty = data[0];
  pulseDuration = data[1];
  // and begin, 
  pulseStart = millis();
  analogWrite(PIN_GATE, pulseDuty);
  digitalWrite(PIN_LED, pulseDuty > 0 ? HIGH : LOW);
}

OSAP_Port_Named pulseGate_port("pulseGate", pulseGate);


void setup() {
  osap.begin();
  analogWriteResolution(8);
  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_GATE, OUTPUT);
}


void loop() {
  osap.loop();
  if(pulseStart != 0){
    if(pulseStart + pulseDuration < millis()){
      analogWrite(PIN_GATE, 0);
      digitalWrite(PIN_LED, LOW);
      pulseStart = 0;
    }
  }
}
