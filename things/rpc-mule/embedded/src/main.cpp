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
  - can compile, but does the protocol work for this ?
  - ... pls finish writing up the proto before you bounce along 
- make a more compelling mule-demo, as a device, for that vidya 
- can it compile on teensy, d51, d21, d11 ... 
- is there a simple soln' for no-fancy-compiler 
- then... got-2 write this shit up and send it someplace, and move modular-things to modular-things.com 
- do not miss that part of the exercise, ffs ! 
- ... then onto the bigger skeletor rework since we are making a mess of it with these two types of things 
- and we aught to get a list of deadlines also ! 
*/

// (3) we test a few, let's make these actually representative... 

// one functo with two args, one return, 
float testFunction(bool state, int num){
  return 0.1F;
}

OSAP_Port_RPC<decltype(&testFunction)> rpcMuleOne(&testFunction, "testFunction", "state, num");


// no-return, 
void voidTwo(bool state, float num){
  state = !state;
}

OSAP_Port_RPC<decltype(&voidTwo)> rpcMuleTwo(&voidTwo, "voidTwo", "state, num");


// no-args 
bool oneVoid(void){
  return true;
}

OSAP_Port_RPC<decltype(&oneVoid)> rpcMuleThree(&oneVoid, "oneVoid");


// void void 
void functo(void){
  // does something, idk, it's a trigger babey 
}

OSAP_Port_RPC<decltype(&functo)> rpcMuleFour(&functo, "functo");

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