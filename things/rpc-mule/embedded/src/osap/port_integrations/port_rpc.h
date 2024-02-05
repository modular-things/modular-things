// auto-rpc-rollup port 

#ifndef PORT_RPC_H_
#define PORT_RPC_H_

#include "../structure/ports.h"
#include "../utils/template_serializers.h"
#include <tuple>

// actually, argnames should share one max-char len
// since we anyways will probably pack 'em each into one pack ?
// or perhaps no, each individual len, in case we want to serialize bigboys 
#define PRPC_FUNCNAME_MAX_CHAR 32
#define PRPC_MAX_ARGS 8
#define PRPC_ARGNAME_MAX_CHAR 16

#define PRPC_KEY_SIGREQ 1
#define PRPC_KEY_SIGRES 2
#define PRPC_KEY_FUNCCALL 3
#define PRPC_KEY_FUNCRETURN 4


// OK, this sh* might work, TBD 
// gist is... we rollup a tuple using make_tuple, 
// and it seems briefly like we could do a one line...
  // auto argsTuple = std::make_tuple((..., (deserialize<Args>(data, &rptr))));
// but it ain't so, or maybe it's close but not working
// in either case, the TODO below is just to test it AFAIK, then tidy serializers,
// write a spec, and send it 
// (and test with other hardware: Teensy, D51, D21, D11... a mule for each?)

template<typename... Args, std::size_t... I>
auto deserializeArgsImpl(uint8_t* data, size_t* rptr, std::index_sequence<I...>) {
    return std::make_tuple(deserialize<Args>(data, rptr)...);
}

template<typename... Args>
auto deserializeArgs(uint8_t* data, size_t* rptr) {
    return deserializeArgsImpl<Args...>(data, rptr, std::index_sequence_for<Args...>{});
}

// could move to rpc_utes.h ... 
void argSplitter(const char* input, char output[PRPC_MAX_ARGS][PRPC_ARGNAME_MAX_CHAR]);


template <typename Func>
class OSAP_Port_RPC;

template <typename Ret, typename... Args>
class OSAP_Port_RPC<Ret(*)(Args...)> : public VPort {
  public:
    // -------------------------------- Constructors 
    OSAP_Port_RPC(
      Ret(*funcPtr)(Args...), const char* functionName, const char* argNames
    ) : VPort(OSAP_Runtime::getInstance())
    {
      _funcPtr = funcPtr;
      strncpy(_functionName, functionName, PRPC_FUNCNAME_MAX_CHAR);
      // count args using ... pattern; this is odd to me:
      ((_numArgs ++, sizeof(Args)), ...);
      // and then read-while-copying, and throw some error if we don't have 
      // the right count of args... 
      argSplitter(argNames, _argNames);
    }
  
    // -------------------------------- OSAP-Facing API
    // override the packet handler, 
    void onPacket(uint8_t* data, size_t len, Route* sourceRoute, uint16_t sourcePort) override {
      switch(data[0]){
        case PRPC_KEY_SIGREQ:
          {
            // write response key and msg id 
            size_t wptr = 0;
            _payload[wptr ++] = PRPC_KEY_SIGRES;
            _payload[wptr ++] = data[1];
            // write return type, arg-count, args, 
            _payload[wptr ++] = getTypeKey<Ret>();
            _payload[wptr ++] = _numArgs;
            // add a type key to the payload for each arg in Args...
            // this is a "fold expression" ... 
            (..., (_payload[wptr++] = getTypeKey<Args>())); 
            // now we want to sendy the names, 
            // which will be str, str..., str 
            serialize<char *>(_functionName, _payload, &wptr);
            for(uint8_t a = 0; a < _numArgs; a ++){
              serialize<char *>(_argNames[a], _payload, &wptr);
            }
            // we are done, ship it back: 
            send(_payload, wptr, sourceRoute, sourcePort);
          }
          break;
        case PRPC_KEY_FUNCCALL:
          {
            // response key and msg id 
            size_t wptr = 0;
            _payload[wptr ++] = PRPC_KEY_FUNCRETURN;
            _payload[wptr ++] = data[1];
            // HERE: instantiate one of each Args... and call the function:
            size_t rptr = 2;
            // again, lol 
            // make the ... tuple ? 
            auto argsTuple = deserializeArgs<Args...>(data, &rptr);
            // Call the function with deserialized arguments
            Ret result = std::apply(_funcPtr, argsTuple);
            // we make a tuple w/ them args 
            // std::tuple<Args...> args;
            // // DESERIALIZE
            // Ret result = std::apply(_funcPtr, args);
            // Ret result = CallHelper<sizeof...(Args), Ret(*)(Args...), Ret>::callFunc(_funcPtr, data, len);
            // "args..."
            // bool arg1 = deserialize(data, &rptr);
            // int arg2 = deserialize(data, &rptr);
            // float returnVar = _funcPtr(arg1, arg2);
            // Ret result = callFunc(_funcPtr, data, &rptr);
            // Ret result = callFunc<sizeof...(Args), Ret, Ret(*)(Args...)>(_funcPtr, data + 2);
            // Ret result = _funcPtr();
            // Ret result = callFunc<sizeof...(Args), Ret(*)(Args...), Ret>(_funcPtr, data, len);
          }
        default:
          OSAP_Runtime::error("bad onPacket key to PRPC");
          break;
      }
    }

  private: 
    // the pointer, etc... 
    Ret(*_funcPtr)(Args...) = nullptr;
    uint8_t _numArgs = 0;
    char _functionName[PRPC_FUNCNAME_MAX_CHAR];
    char _argNames[PRPC_MAX_ARGS][PRPC_ARGNAME_MAX_CHAR];
};


// -------------------------- UTES 

// copies from comma-delimited char[] into char[][], 
void argSplitter(const char* input, char output[PRPC_MAX_ARGS][PRPC_ARGNAME_MAX_CHAR]){
  int itemIndex = 0, charIndex = 0;
  const char* p = input;

  while (*p && itemIndex < PRPC_MAX_ARGS) {
    if (*p == ',' || *p == ' ') {
      if (*p == ',' && charIndex > 0) { // End of an item
        output[itemIndex][charIndex] = '\0'; // Null-terminate the current item
        itemIndex++;
        charIndex = 0;
      }
      p++; // Skip the comma or space
    } else {
      if (charIndex < PRPC_ARGNAME_MAX_CHAR - 1) { // Check for max char limit
        output[itemIndex][charIndex++] = *p; // Copy character
      }
      p++; // Move to the next character
    }
  }

  if (charIndex > 0) { // Handle the last item if there's no trailing comma
    output[itemIndex][charIndex] = '\0';
  }
}

#endif 