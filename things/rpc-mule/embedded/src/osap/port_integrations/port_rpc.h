// auto-rpc-rollup port 

#ifndef PORT_RPC_H_
#define PORT_RPC_H_

#include "../structure/ports.h"

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
    void onPacket(uint8_t* data, size_t len, Route* route, uint16_t sourcePort) override {
      return;
    }

  private: 
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