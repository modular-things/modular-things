#include <osap.h>
#include "pidHeater.h"

#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128 // OLED display width, in pixels
#define SCREEN_HEIGHT 64 // OLED display height, in pixels

#define X_POS 0
#define Y_POS 0

#define SCREEN_ADDRESS 0x3C
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT);

OSAP_Runtime osap;
OSAP_Gateway_USBSerial serLink(&Serial);
OSAP_Port_DeviceNames namePort("bedHeater");

// the hardware config... i.e. pins 

#define THERM_ADC_PIN     27
#define THERM_PWM_PIN     28

PIDHeater heater(THERM_PWM_PIN, THERM_ADC_PIN);

// -------------------------- Coupla OSAP Hookups 

// write a new config 

void writeHeaterConfig(uint8_t* data, size_t len){
  // it's the hot new extraction technique 
  pid_heater_config_t config;
  memcpy(&config, data, sizeof config);
  // hand that off 
  heater.setConfig(&config);
}

OSAP_Port_Named heaterConfig_port("writeHeaterConfig", writeHeaterConfig);

// update the setpoint 

void writeHeaterSetPoint(uint8_t* data, size_t len){
  // same trick works just as well 
  float setPoint = 0.0F;
  memcpy(&setPoint, data, sizeof setPoint);
  // again 
  heater.setTemperature(setPoint);
}

OSAP_Port_Named heaterSetPoint_port("writeHeaterSetPoint", writeHeaterSetPoint);

// get them states,

size_t getHeaterStates(uint8_t* data, size_t len, uint8_t* reply){
  // get one 
  pid_heater_states_t states = heater.getStates();
  // copy it into the msg, 
  memcpy(reply, &states, sizeof states);
  // reply the len, 
  return sizeof states; 
}

OSAP_Port_Named heaterStates_Port("getHeaterStates", getHeaterStates);

// -------------------------- Arduino Setup 

void setup() {
  // fer debuggen 
  // Serial.begin();
  // while(!Serial);
  // setup the display... 
  display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS);

  display.clearDisplay();
  display.display();

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextWrap(true);
  display.setRotation(1);

  // and our debug light
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);

  // demo-worlds, 
  display.setCursor(0,0);
  display.setTextSize(1);
  display.println("BONJOUR...");

  // and setup our tables and hardware 
  heater.begin();

  // do the osap setup, 
  osap.begin();
}

// -------------------------- Arduino Loop

uint32_t debugLastTime = 0;
uint32_t debugInterval = 100;

void loop() {
  osap.loop();
  heater.loop();
  if(debugLastTime + debugInterval < millis()){
    pid_heater_states_t states = heater.getStates();
    // every once-and-a-while:
    display.clearDisplay();
    display.setCursor(0,0);
    display.setTextSize(2);
    display.println(String(states.tempEstimate, 1));
    display.println("");
    display.setTextSize(1);
    display.println("SP:  " + String(states.setPoint, 1));
    display.println("PW:  " + String(states.output, 2));
    display.println("---------");
    // oddity is for bouncy -ve signs 
    states.pContrib < 0 ? display.print("P:  ") : display.print("P:   ");  display.println(states.pContrib, 2);
    states.iContrib < 0 ? display.print("I:  ") : display.print("I:   ");  display.println(states.iContrib, 2);
    states.dContrib < 0 ? display.print("D:  ") : display.print("D:   ");  display.println(states.dContrib, 2);
    display.display();
  }
}
