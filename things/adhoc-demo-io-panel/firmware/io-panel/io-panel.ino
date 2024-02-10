#include <osap.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>


// display setup, which is wired to the XIAO's labelled SCL/SDA pins 
#define SCREEN_WIDTH 128 // OLED display width, in pixels
#define SCREEN_HEIGHT 64 // OLED display height, in pixels
#define SCREEN_ADDRESS 0x3C
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT);


// a potentiometer and a button 
// the pot is on XIAO D2/A2, which is GPIO num 28
// the button is on XIAO D3, which is GPIO num 29 (and will need a pullup)
#define PIN_POTENTIOMETER 28 
#define PIN_BUTTON 29 
#define PIN_LED_BLINK PIN_LED_R 
#define PIN_LED_WD PIN_LED_G 


// we instantiate an OSAP runtime, give it a serialport and a name: 
OSAP_Runtime osap;
OSAP_Gateway_USBSerial serLink(&Serial);
OSAP_Port_DeviceNames namePort("xylo-io-panel");


// now we want to author some functions as interfaces to our device,
// and we'll attach those as RPC's using templated OSAP_Port_RPC<> class instances 


float getPotentiometerReading(void){
  int reading = analogRead(PIN_POTENTIOMETER);
  float duty = (float)reading / 4096.0F;
  return duty; 
}

OSAP_Port_RPC<decltype(&getPotentiometerReading)> getPotRPC(&getPotentiometerReading, "getPotentiometerReading", "index");


bool getButtonState(void){
  // we're not going to debounce anything, 
  // and our button is wired up such that it's logic high when it's not pressed, 
  // so we invert this, 
  return !(digitalRead(PIN_BUTTON));
}

OSAP_Port_RPC<decltype(&getButtonState)> rpcMuleThree(&getButtonState, "getButtonState");


uint32_t blinkOnTime = 0;

void blinkLED(void){
  // we turn an LED on and record the time, 
  // we'll check that in the loop to turn it back off, 
  // note that LEDs are wired such that logic-low is "on"
  digitalWrite(PIN_LED, LOW);
  blinkOnTime = millis();
}

OSAP_Port_RPC<decltype(&blinkLED)> rpcMuleFour(&blinkLED, "blinkLED");


// this one would maybe take the most TODO-ing 
// but also... people will appreciate the most ? 
// let's see how it goes 
// void printToScreen(char* message){
//   display.clearDisplay();
//   display.setCursor(0, 0);
//   display.setTextSize(1);
//   display.print(message);
//   display.display();
// }

// OSAP_Port_RPC<decltype(&printToScreen)> rpcMuleTwo(&printToScreen, "printToScreen", "message");

void printToScreen(String message){
  display.clearDisplay();
  display.setCursor(0, 0);
  display.setTextSize(1);
  display.print(message);
  display.display();
}

void setup() {
  // setup our LEDs,
  pinMode(PIN_LED_BLINK, OUTPUT);
  pinMode(PIN_LED_WD, OUTPUT);
  digitalWrite(PIN_LED_BLINK, HIGH);

  // the button needs to have a pullup
  pinMode(PIN_BUTTON, INPUT_PULLUP);
  
  // afaik, arduino sets up ADCs just by calling analogRead, 
  // and we also want to set the resolution, 
  analogReadResolution(12);
  int dummy = analogRead(PIN_POTENTIOMETER);

  // we also need to setup the display: 
  display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS);
  display.clearDisplay();
  display.display();
  display.setTextColor(SSD1306_WHITE);
  display.setTextWrap(false);

  printToScreen("bonjour");

  // finally, setup OSAP,
  osap.begin();
}

const uint32_t wdInterval = 100;
uint32_t lastWd = 0;

void loop() {
  // osap runs an event loop, 
  osap.loop();

  // and we want to check in on our blinking states, 
  if(blinkOnTime){
    if(blinkOnTime + 250 < millis()){
      blinkOnTime = 0;
      digitalWrite(PIN_LED_BLINK, HIGH);
    }
  }

  // finally, we want to blink the green LED as a watchdog 
  if(lastWd + wdInterval < millis()){
    lastWd = millis();
    digitalWrite(PIN_LED_WD, !digitalRead(PIN_LED_WD));
  }
}
