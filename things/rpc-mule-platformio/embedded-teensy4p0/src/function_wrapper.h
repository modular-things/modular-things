#include <Arduino.h>

// --------------------------  Key Codes 
// (1) inline templates for printing, 

#define TYPEKEY_VOID 0 
#define TYPEKEY_INT 1
#define TYPEKEY_BOOL 2
#define TYPEKEY_FLOAT 3

template<typename T>
uint8_t getTypeKey(void){
  return 0;
}
template<> inline 
uint8_t getTypeKey<int>(void){
  return TYPEKEY_INT;
}
template<> inline                     // boolean
uint8_t getTypeKey<boolean>(void){
  return TYPEKEY_BOOL;
}
template<> inline                   // floats
uint8_t getTypeKey<float>(void){
  return TYPEKEY_FLOAT;
}

// -------------------------- Function Thingy 
// (2) use a traits-thing to unwrap calls to printArgs, printRet, 

#define FT_NAME_MAX_CHAR 32
#define FT_MAX_ARGS 8

void argSplitter(const char* input, char output[FT_MAX_ARGS][FT_NAME_MAX_CHAR]);

template <typename Func>
struct FunctionTraits;

template <typename Ret, typename... Args>
class FunctionTraits<Ret(*)(Args...)>{
  public:
  // constructor should ingest const char* for the function name and arg names,
  // the second will be comma-delimited, so that we don't have to deal 
  // with variadic bs in the constructor as well (maybe a TODO for API cleanliness)
  FunctionTraits(Ret(*funcPtr)(Args...), const char* functionName, const char* argNames){
    _funcPtr = funcPtr;
    // actually just copy-pasta the function name, 
    strncpy(_functionName, functionName, FT_NAME_MAX_CHAR);
    // count them args: 
    ((_numArgs ++, sizeof(Args)), ...);
    // and then read-while-copying, and throw some error if we don't have 
    // the right count of args... 
    argSplitter(argNames, _argNames);
  }

  // we want to write function signatures w/ this, 
  size_t serializeFunctionSignature(uint8_t* dest){
    // it's a write-pointer / size-pointer, 
    size_t wptr = 0;
    // return-type-byte, 
    dest[wptr ++] = getTypeKey<Ret>();
    // arg-count, and arg-bytes, 
    dest[wptr ++] = _numArgs;
    ((dest[wptr ++] = getTypeKey<Args>()), ...);
    // deser the function name, 
    strcpy((char*)(dest + wptr), _functionName);
    wptr += strlen(_functionName) + 1;
    // and each arg, 
    for(uint8_t a = 0; a < _numArgs; a ++){
      strcpy((char*)(dest + wptr), _argNames[a]);
      wptr += strlen(_argNames[a]) + 1;
    }
    // that's it for mini-sig, 
    return wptr; 
  }
  
  private:
    // the fp, 
    Ret(*_funcPtr)(Args...) = nullptr;
    // count 'em (during constructor)
    uint8_t _numArgs = 0;
    // names-stash, 
    char _functionName[FT_NAME_MAX_CHAR];
    char _argNames[FT_MAX_ARGS][FT_NAME_MAX_CHAR];
};


// -------------------------- UTES 

// copies from comma-delimited char[] into char[][], 
void argSplitter(const char* input, char output[FT_MAX_ARGS][FT_NAME_MAX_CHAR]){
    int itemIndex = 0, charIndex = 0;
    const char* p = input;

    while (*p && itemIndex < FT_MAX_ARGS) {
        if (*p == ',' || *p == ' ') {
            if (*p == ',' && charIndex > 0) { // End of an item
                output[itemIndex][charIndex] = '\0'; // Null-terminate the current item
                itemIndex++;
                charIndex = 0;
            }
            p++; // Skip the comma or space
        } else {
            if (charIndex < FT_NAME_MAX_CHAR - 1) { // Check for max char limit
                output[itemIndex][charIndex++] = *p; // Copy character
            }
            p++; // Move to the next character
        }
    }

    if (charIndex > 0) { // Handle the last item if there's no trailing comma
        output[itemIndex][charIndex] = '\0';
    }
}