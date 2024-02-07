// #include "function_wrapper.h"
#include "osap/osap.h"

#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// we setup the display 

#define SCREEN_WIDTH 128 // OLED display width, in pixels
#define SCREEN_HEIGHT 64 // OLED display height, in pixels
#define SCREEN_ADDRESS 0x3C
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT);

// we setup osap 

OSAP_Runtime osap;

OSAP_Gateway_USBSerial serLink(&Serial);

OSAP_Port_DeviceNames namePort("rpc-mule");

// TODO
/*
 - can it work with void return or void args ?
 - can it compile on teensy, d51, d21, d11 ... 
 - is there a simple soln' for no-fancy-compiler 
*/

// (3) we test a few, 

float testFunction(bool state, int num){
  return 0.1F;
}

// FunctionTraits<decltype(&oneTwo)> traitsOneTwo(&oneTwo, "oneTwo", "state, num");

OSAP_Port_RPC<decltype(&testFunction)> rpcOneTwo(&testFunction, "testFunction", "state, num");

// void voidTwo(bool state, float num){
//   state = !state;
// }

// FunctionTraits<decltype(&voidTwo)> traitsVoidTwo;


// bool oneVoid(void){
//   return true;
// }

// FunctionTraits<decltype(&oneVoid)> traitsOneVoid;


// (4) we run a demo code to blink an LED, 
// (that makes sure we aren't hanging the cpu), and 
// to print those functo-descriptors: 

void printToScreen(String msg);

void setup() {
  osap.begin();
  osap.attachDebugFunction(printToScreen);
  // display setup 
  display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS);

  display.clearDisplay();
  display.display();

  display.clearDisplay();
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextWrap(false);

  printToScreen("bonjour");

  // other stuff 
  pinMode(PIN_LED_G, OUTPUT);
  Serial.begin();
}

uint32_t lastBlink = 0;
uint32_t intervalBlink = 100;

uint8_t sigDump[256];

void loop() {
  osap.loop();
  
  if(lastBlink + intervalBlink < millis()){
    digitalWrite(PIN_LED_G, !digitalRead(PIN_LED_G));
    lastBlink = millis();
    // let's print the signature, 
    // size_t len = traitsOneTwo.serializeFunctionSignature(sigDump);
    // Serial.println("SIGLEN: " + String(len));
    // for(uint8_t b = 0; b < len; b ++){
    //   Serial.println(String(sigDump[b]) + ", ");
    // }
  }
}

void printToScreen(String msg){
  display.clearDisplay();
  display.setCursor(0, 0);
  display.setTextSize(1);
  display.print(msg);
  display.display();
}