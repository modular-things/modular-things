#include <osap.h>
#include <vt_endpoint.h>
#include <vp_arduinoSerial.h>
#include <core/ts.h>

// type of board (firmware name)
OSAP osap("timeOfFlight");

// ---------------------------------------------- 0th Vertex: OSAP USB Serial
VPort_ArduinoSerial vp_arduinoSerial(&osap, "usbSerial", &Serial);

// ---------------------------------------------- 1 Vertex
boolean preTOFQuery(void);

Endpoint tofEndpoint(&osap, "tofQuery", preTOFQuery);

boolean preTOFQuery(void) {
  uint8_t buf[N_PAD * 2];
  uint16_t wptr = 0;
  for(uint8_t p = 0; p < N_PAD; p ++){
    ts_writeUint16(qt_array[p].measure(), buf, &wptr);
  }
  tofEndpoint.write(buf, N_PAD * 2);
  return true;
}

void setup() {
  osap.init();
  vp_arduinoSerial.begin();
}

void loop() {
  osap.loop();
}