// auto-rpc-rollup port 

#ifndef PORT_RPC_H_
#define PORT_RPC_H_

#include "../structure/ports.h"
#include "../utils/template_serializers.h"
#include "./port_rpc_helpers.h"
#include <tuple>

#define PRPC_KEY_SIGREQ 1
#define PRPC_KEY_SIGRES 2
#define PRPC_KEY_FUNCCALL 3
#define PRPC_KEY_FUNCRETURN 4

// see ./port_rpc_helpers.h for much of the wizardry required, 
// ------------------------------------ the actual class 
template <typename Func>
class OSAP_Port_RPC;

template <typename Ret, typename... Args>
class OSAP_Port_RPC<Ret(*)(Args...)> : public VPort {
  public:
    // to diff void-returners, 
    using ResultType = typename ReturnType<Ret>::Type;

    // -------------------------------- Constructors 
    // base constructor 
    OSAP_Port_RPC(
      Ret(*funcPtr)(Args...), const char* functionName, const char* argNames
    ) : VPort(OSAP_Runtime::getInstance())
    {
      // upd8 our type key,
      typeKey = PTYPEKEY_AUTO_RPC_IMPLEMENTER;
      // stash names and the functo 
      _funcPtr = funcPtr;
      strncpy(_functionName, functionName, PRPC_FUNCNAME_MAX_CHAR);
      // count args using ... pattern; this is odd to me:
      ((_numArgs ++, sizeof(Args)), ...);
      // and then read-while-copying, and throw some error if we don't have 
      // the right count of args... 
      argSplitter(argNames, _argNames);
    }
    // deferring constructor for whence we have no args, 
    OSAP_Port_RPC(
      Ret(*funcPtr)(Args...), const char* functionName
    ) : OSAP_Port_RPC(funcPtr, functionName, "") {}
  
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
            serialize<char*>(_functionName, _payload, &wptr);
            // wptr += 1;
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
            // we'll be reading starting at [2] in the packet, 
            size_t rptr = 2;
            // we have four cases to deal with: void-void, void-args, ret-void, ret-args, 
            if constexpr (sizeof...(Args) == 0){
              if constexpr (std::is_same<Ret, void>::value){
                // we are void-void, 
                _funcPtr();
              } else {
                // ret-void, 
                resultStorage.result = _funcPtr();
              }
            } else {
              // each of the following conditions has args, so deserialize those:
              argStorage.tuple = deserializeArgs<Args...>(data, &rptr);
              if constexpr (std::is_same<Ret, void>::value) {
                // this is void-args, we use 'apply' but there is no storage 
                std::apply(_funcPtr, argStorage.tuple);
              } else {
                // this is ret-args, we use 'apply' and stash the result, 
                resultStorage.result = std::apply(_funcPtr, argStorage.tuple);
              }               
            }
            // in both cases where we have some result, we serialize:
            if constexpr (!(std::is_same<Ret, void>::value)){
              serialize<Ret>(resultStorage.result, _payload, &wptr);
            }
            // currently void returners simply donot serialize anything on the way up,  
            // so that'd be it, we can sendy:
            send(_payload, wptr, sourceRoute, sourcePort);
          }
          break;
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
    // we allocate storage for the function results and args here to avoid stack overflow, 
    // and these both use template helpers that simply store nothing when no args or no return type is present 
    ResultStorage<Ret, std::is_same<Ret, void>::value> resultStorage;
    ArgStorage<Args...> argStorage;
};


#endif 