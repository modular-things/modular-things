// template oddities, b-sides and remixes for the auto rpc class 

#ifndef PORT_RPC_HELPER_H_
#define PORT_RPC_HELPER_H_

#include <Arduino.h>
#include "../utils/template_serializers.h"
#include <tuple>

#define PRPC_FUNCNAME_MAX_CHAR 32
#define PRPC_MAX_ARGS 8
#define PRPC_ARGNAME_MAX_CHAR 16

// ------------------------------------ 
// A helper type trait to check if a type is void and provide a suitable return type
template<typename T>
struct ReturnType {
    using Type = T;
};

template<>
struct ReturnType<void> {
    using Type = Unit;
};

// ------------------------------------ 
// Storage for non-void return types
template<typename Ret, bool isVoid>
struct ResultStorage {
    Ret result;
};

// Specialization for void return types that does not have a 'result' member
template<typename Ret>
struct ResultStorage<Ret, true> { };


// ------------------------------------ 
// one last trick for args storage ? 
template<typename... Args>
struct ArgStorage {
  std::tuple<Args...> tuple;
};

// specialization for funcs with no args, 
template<>
struct ArgStorage<>{ };


// ------------------------------------ recursive deserializer for Args... pack 
template<typename... Args, std::size_t... I>
auto deserializeArgsImpl(uint8_t* data, size_t* rptr, std::index_sequence<I...>) {
    return std::make_tuple(deserialize<Args>(data, rptr)...);
}

template<typename... Args>
auto deserializeArgs(uint8_t* data, size_t* rptr) {
    return deserializeArgsImpl<Args...>(data, rptr, std::index_sequence_for<Args...>{});
}


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