#include <osap.h>

// ---------------------------------------------- Pins
#define PIN_R 14
#define PIN_G 15
#define PIN_B 16
#define PIN_BUT 17

OSAP_Runtime osap;
OSAP_Gateway_USBSerial serLink(&Serial);
OSAP_Port_DeviceNames namePort("rgbb");

boolean lastButtonState = false;

size_t onButtonReq(uint8_t* data, size_t len, uint8_t* reply){
  // then write-into reply:
  lastButtonState ? reply[0] = 1 : reply[0] = 0;
  return 1;
}

OSAP_Port_Named getButtonState("getButtonState", onButtonReq);

void onRGBPacket(uint8_t* data, size_t len){
  analogWrite(PIN_R, data[0]);
  analogWrite(PIN_G, data[1]);
  analogWrite(PIN_B, data[2]);
}

OSAP_Port_Named setRGB("setRGB", onRGBPacket);

void setup() {
  // uuuh... 
  osap.begin();
  // "hardware"
  analogWriteResolution(8);
  pinMode(PIN_R, OUTPUT);
  pinMode(PIN_G, OUTPUT);
  pinMode(PIN_B, OUTPUT);
  analogWrite(PIN_R, 255);
  analogWrite(PIN_G, 255);
  analogWrite(PIN_B, 255);
  pinMode(PIN_BUT, INPUT);
  // pull-down switch, high when pressed
}

uint32_t debounceDelay = 10;
uint32_t lastButtonCheck = 0;

void loop() {
  // do graph stuff
  osap.loop();
  // debounce and set button states, 
  if(lastButtonCheck + debounceDelay < millis()){
    lastButtonCheck = millis();
    boolean newState = digitalRead(PIN_BUT);
    if(newState != lastButtonState){
      lastButtonState = newState;
    }
  }
}

