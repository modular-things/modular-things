#include <PIDController.h>
#include <osap.h>
#include <vt_endpoint.h>
#include <vp_arduinoSerial.h>
#include <core/ts.h>

#define PORTA_IN PORT->Group[PORTA].IN

#define READ_FAST(pin) ((PORTA_IN.reg & (1 << pin)) > 0)

#define PIN_IN1 30
#define PIN_IN2 31
#define PIN_BPWM 8
#define PIN_BIN1 9
#define PIN_BIN2 10

//#define STEPS_PER_TURN 384

int state_now = 0b00;
int state_prev = 0b00;

//  new new old old
int lookup_move[] = {0,1,-1,2,-1,0,-2,1,1,-2,0,-1,2,-1,1,0};
int pos = 0;
int pos_target = 0;

PIDController pidcontroller;

// message-passing memory allocation 
#define OSAP_STACK_SIZE 10
VPacket messageStack[OSAP_STACK_SIZE];
// type of board (firmware name)
OSAP osap("dcencoder", messageStack, OSAP_STACK_SIZE);

VPort_ArduinoSerial vp_arduinoSerial(&osap, "usbSerial", &Serial);

// ---------------------------------------------- 1 Vertex
EP_ONDATA_RESPONSES setTarget(uint8_t* data, uint16_t len) {
  pos_target = ts_readUint16(data, 0);
  pidcontroller.setpoint(pos_target);

  return EP_ONDATA_ACCEPT;
}

Endpoint targetEndpoint(&osap, "setTarget", setTarget);


// ---------------------------------------------- 2nd Vertex
EP_ONDATA_RESPONSES setPID(uint8_t* data, uint16_t len) {
  uint16_t pt = 0;
  float p_val = ts_readFloat32(data, &pt);
  float i_val = ts_readFloat32(data, &pt);
  float d_val = ts_readFloat32(data, &pt);

  pidcontroller.tune(p_val, i_val, d_val); // Tune the PID, arguments: kP, kI, kD

  return EP_ONDATA_ACCEPT;
}

Endpoint pidEndpoint(&osap, "setPID", setPID);

void setup() {
  osap.init();
  vp_arduinoSerial.begin();

  pinMode(PIN_BPWM, OUTPUT);
  pinMode(PIN_BIN1, OUTPUT);
  pinMode(PIN_BIN2, OUTPUT);

  state_now = READ_FAST(PIN_IN1) | (READ_FAST(PIN_IN2) << 1);
  state_prev = state_now;

  attachInterrupt(digitalPinToInterrupt(PIN_IN1), pin1_change, CHANGE);
  attachInterrupt(digitalPinToInterrupt(PIN_IN2), pin2_change, CHANGE);

  pidcontroller.begin();
  pidcontroller.tune(20, 1, 0); // Tune the PID, arguments: kP, kI, kD
  pidcontroller.limit(-255, 255);

  pidcontroller.setpoint(pos_target);
}


void update_pos() {
  int key = (state_now << 2) | state_prev;
  pos += lookup_move[key];
  state_prev = state_now;
}


void pin1_change() {
  if (READ_FAST(PIN_IN1)) {
    state_now |= 0b01;
  } else {
    state_now &= 0b10;
  }
  update_pos();
}


void pin2_change() {
  if (READ_FAST(PIN_IN2)) {
    state_now |= 0b10;
  } else {
    state_now &= 0b01;
  }
  update_pos();
}


int map_pwm(int pwm) {
  return map(pwm, 0, 255, 32, 255);
}

void loop() {
  int output = pidcontroller.compute(pos);

  if (output == 0) {
    digitalWrite(PIN_BIN1, LOW);
    digitalWrite(PIN_BIN2, LOW);
  } else if (output > 0) {
    digitalWrite(PIN_BIN1, HIGH);
    digitalWrite(PIN_BIN2, LOW);
    analogWrite(PIN_BPWM, map_pwm(output));
  } else {
    digitalWrite(PIN_BIN1, LOW);
    digitalWrite(PIN_BIN2, HIGH);
    analogWrite(PIN_BPWM, -map_pwm(output));
  }

  delay(1);
  osap.loop();
}
