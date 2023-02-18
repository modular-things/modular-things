#include <osap.h>
#include <vt_rpc.h>
#include <vt_endpoint.h>
#include <vp_arduinoSerial.h>

// ---------------------------------------------- Pins
#define PIN_R 14
#define PIN_G 15
#define PIN_B 16
#define PIN_BUT 17

// message-passing memory allocation 
#define OSAP_STACK_SIZE 10
VPacket messageStack[OSAP_STACK_SIZE];
// ---------------------------------------------- OSAP central-nugget 
OSAP osap("rgbb-rpc", messageStack, OSAP_STACK_SIZE);

// ---------------------------------------------- OSAP USB Serial
VPort_ArduinoSerial vp_arduinoSerial(&osap, "usbSerial", &Serial);

// ---------------------------------------------- RGB Setter 
null_t setRGB(Array<uint8_t, 3> levels){
  analogWrite(PIN_R, 255 - levels.val[0]);
  analogWrite(PIN_G, 255 - levels.val[1]);
  analogWrite(PIN_B, 255 - levels.val[2]);  
  // return 0;
}

RPCVertex<null_t, Array<uint8_t, 3>> setRPC(&osap, "setRGB", "levels", setRGB);

// ---------------------------------------------- Button Getter
uint32_t debounceDelay = 10;
uint32_t lastButtonCheck = 0;
boolean lastButtonState = false;

boolean getButtonState(null_t){
  return lastButtonState;
}

RPCVertex<boolean, null_t> getRPC(&osap, "getButtonState", " ", getButtonState);

void setup() {
  // uuuh... 
  osap.init();
  // run the commos 
  vp_arduinoSerial.begin();
  // "hardware"
  analogWriteResolution(8);
  pinMode(PIN_R, OUTPUT);
  pinMode(PIN_G, OUTPUT);
  pinMode(PIN_B, OUTPUT);
  analogWrite(PIN_R, 255);
  analogWrite(PIN_G, 255);
  analogWrite(PIN_B, 255);
  // pull-down switch, high when pressed
  pinMode(PIN_BUT, INPUT);
}

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
