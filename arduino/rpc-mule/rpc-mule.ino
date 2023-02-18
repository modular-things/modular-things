// ATM this runs only on SAMD21 cores w/ GCC 2017 !
#include <osap.h>
#include <vt_endpoint.h>
#include <vt_rpc.h>
#include <vp_arduinoSerial.h>

// message-passing memory allocation 
// TODO: template-it 
#define OSAP_STACK_SIZE 10
VPacket messageStack[OSAP_STACK_SIZE];
// ---------------------------------------------- OSAP central-nugget 
OSAP osap("rgbb-rpc-mule", messageStack, OSAP_STACK_SIZE);

// ---------------------------------------------- 0th Vertex: OSAP USB Serial
VPort_ArduinoSerial vp_arduinoSerial(&osap, "usbSerial", &Serial);

// ---------------------------------------------- 1th Vertex: RPC

// singular args, singular return:
float singleThingFunc(uint16_t arg){
  // TT<float> ret;
  // ret.val = arg.val + 0.1F;
  return 0.22F;
}

RPCVertex<float, uint16_t> rpcOne(&osap, "singleThingFunc", singleThingFunc);

/*
... little demos for leo 
size_t replyLen vertexHandler(char* msg, size_t len, char* reply){

}

Vertex vt("name", vertexHandler);

void handler(Message msg){
  if(msg.data[0] != "1") onRGBData();
}

Vertex vt("name", handler);

// "just routing" 

Array<char, 256> basicShit(Array<char, 256> input){
  // ... 
  switch(input[0]){
    case MY_KEY_ZERO:
      break;
  }
}

RPCVertex<Array<char, 256>, Array<char, 256>> rpcOne(&osap, "name", singleThingFunc);
*/

// ---------------------------------------------- 2th Vertex: RPC two

// list args, list return:
Array<uint16_t, 10> multipleThingsFunc(Array<boolean, 2> arg){
  Array<uint16_t, 10> ret;
  ret.val[1] = 11;
  ret.val[2] = 12;
  return ret;
}

RPCVertex<Array<uint16_t, 10>, Array<boolean, 2>> rpcTwo(&osap, "multipleThingsFunc", multipleThingsFunc);

// ---------------------------------------------- 3th Vertex: RPC three

// single return, list arg
int32_t singleMultiple(Array<boolean, 3> arg){
  return 65000;
}

RPCVertex<int32_t, Array<boolean, 3>> rpcThree(&osap, "singleMultiple", singleMultiple);

// ---------------------------------------------- 4th Vertex: RPC four

// list return, single arg 
Array<int32_t, 8> multiSingle(float arg){
  Array<int32_t, 8> ret;
  ret.val[0] = 0;
  ret.val[2] = 12;
  ret.val[1] = 11;
  return ret;
}

RPCVertex<Array<int32_t, 8>, float> rpcFour(&osap, "multiSingle", multiSingle);

// OK i'd like to forwards w/ an args-type definition... 
// float myFunc(int16_t arg){
//   OSAP::debug("fn is called...");
//   return 12.1F;
// }
// RPCVertex<float, int16_t> rpcOne(&osap, "myFunc", myFunc);

// mt<float> myFunc(mt<int16_t> arg){
//   // can use 'em like 
//   arg.val;
//   // and write em like 
//   mt<float> retVal; 
//   retVal.val = 12.1F;
//   return retVal;
//   // it ain't pretty 
// }

// arr<int32_t, 12> myList;

// uint16_t myNextFunc(uint16_t arg){
//   return 10;
// }
// RPCVertex<uint16_t, uint16_t> rpcTwo(&osap, "myOtherFunc", myNextFunc);

// we can have RPC containt the RPCVertex class (?) or sth, to avoid an API like this: 
// RPCWrap<float (*)(int16_t)> rpcWrap(myFunc);
// RPC rpcOne(&osap, "name", rpcWrap);

// ----------------------------------------------

// float myRPCFunc(uint8_t arg);
// RPC myRPC(&osap, "a-name", makeRPC(myRPCFunc));

// makeRPC wraps a function into some RPCFunc class, 
// which is templated... and has common methods like .getArgKeys(), getRetKeys(), etc... 
// so the RPC-Vertex is not itself templated, 
// makeRPC writes ...

// reinterpret_cast ... "trust me, these bytes are this..."

// uint32_t inLike;
// double outLike;
// RPC<uint32_t, double> rpcTwo(&osap, "rpc-testTwo", inLike, outLike);

void setup() {
  pinMode(13, OUTPUT);
  osap.init();
  vp_arduinoSerial.begin();
}

uint32_t lastBlink = 0;
uint32_t blinkInterval = 100;

void loop() {
  // run osap system
  osap.loop();
  // flip leds, etc 
  if(lastBlink + blinkInterval < millis()){
    lastBlink = millis();
    digitalWrite(13, !digitalRead(13));
  }
}
