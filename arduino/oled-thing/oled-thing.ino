#include <osap.h>
#include <vt_endpoint.h>
#include <vp_arduinoSerial.h>
#include <core/ts.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128 // OLED display width, in pixels
#define SCREEN_HEIGHT 64 // OLED display height, in pixels

#define Y_POS 16 //Defines the starting position in height
#define TXT_SIZE 3 //Define Size 

#define OLED_RESET     4 // Reset pin # (or -1 if sharing Arduino reset pin)
#define SCREEN_ADDRESS 0x3C ///< See datasheet for Address; 0x3D for 128x64, 0x3C for 128x32 - Here - 0x3C
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

void setup() {
  display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS);

  display.clearDisplay();
  display.display();

  display.clearDisplay();
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextWrap(true);
}

void loop() {
  display.clearDisplay();
  display.setCursor(x, Y_POS);
  display.setTextSize(TXT_SIZE);
  display.print(txt);
  display.display();

  x-=3;

  if (x < x_min) {
    x = SCREEN_WIDTH;
  }
}


LSM6 imu;

// type of board (firmware name)
OSAP osap("accelerometer");

// ---------------------------------------------- 0th Vertex: OSAP USB Serial
VPort_ArduinoSerial vp_arduinoSerial(&osap, "usbSerial", &Serial);

// ---------------------------------------------- 1 Vertex
boolean preQuery(void);

Endpoint stringEndpoint(&osap, "stringEndpoint", preQuery);

boolean preQuery(void) {
  imu.read();

  uint8_t* ptr;

  uint8_t buf[2 * 6];

  buf[0] = imu.a.x & 0xFF;
  buf[1] = imu.a.x >> 8 & 0xFF;

  buf[2] = imu.a.y & 0xFF;
  buf[3] = imu.a.y >> 8 & 0xFF;

  buf[4] = imu.a.z & 0xFF;
  buf[5] = imu.a.z >> 8 & 0xFF;

  buf[6] = imu.g.x & 0xFF;
  buf[7] = imu.g.x >> 8 & 0xFF;

  buf[8] = imu.g.y & 0xFF;
  buf[9] = imu.g.y >> 8 & 0xFF;

  buf[10] = imu.g.z & 0xFF;
  buf[11] = imu.g.z >> 8 & 0xFF;

  accelerometerEndpoint.write(buf, 2 * 6);
  return true;
}

void setup() {
  osap.init();
  vp_arduinoSerial.begin();

  Wire.begin();
  imu.init();
  imu.enableDefault();
}

void loop() {
  osap.loop();
}
