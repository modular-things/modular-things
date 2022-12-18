#include <osap.h>
#include <vt_endpoint.h>
#include <vp_arduinoSerial.h>
#include <core/ts.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128 // OLED display width, in pixels
#define SCREEN_HEIGHT 64 // OLED display height, in pixels

#define X_POS 0
#define Y_POS 0
#define TXT_SIZE 1 //Define Size 

#define SCREEN_ADDRESS 0x3C
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT);

// message-passing memory allocation 
#define OSAP_STACK_SIZE 10
VPacket messageStack[OSAP_STACK_SIZE];
// type of board (firmware name)
OSAP osap("oled", messageStack, OSAP_STACK_SIZE);

// ---------------------------------------------- 0th Vertex: OSAP USB Serial
VPort_ArduinoSerial vp_arduinoSerial(&osap, "usbSerial", &Serial);

// ---------------------------------------------- 1th Vertex: String input Endpoint 
EP_ONDATA_RESPONSES onStringData(uint8_t* data, uint16_t len) {
  // first byte is the text size
  uint8_t txt_size = data[0];
  // the rest is the text
  // add null terminator
  char* txt = (char*) malloc(len);
  memcpy(txt, data+1, len-1);
  txt[len-1] = '\0';
  
  display.clearDisplay();
  display.setCursor(X_POS, Y_POS);
  display.setTextSize(txt_size);
  display.print(txt);
  display.display();

  return EP_ONDATA_ACCEPT;
}

Endpoint stringEndpoint(&osap, "stringEndpoint", onStringData);

void setup() {
  osap.init();
  vp_arduinoSerial.begin();

  display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS);

  display.clearDisplay();
  display.display();

  display.clearDisplay();
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextWrap(true);
}

void loop() {
  osap.loop();
}
