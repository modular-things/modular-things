/*

template type-thingy, 
flexble ser/des for human-readable APIs 

*/

#include <Arduino.h>

#ifndef TYPE_HELPERS_H_
#define TYPE_HELPERS_H_ 

#define TYPEKEY_DEFAULT 0
#define TYPEKEY_INT 1
#define TYPEKEY_BOOL 2
#define TYPEKEY_FLOAT 3


// a base / fallback ?
template<typename T>
class TypeHelper{
  public:
  uint8_t getTypeKey(void){ return TYPEKEY_DEFAULT; }
};
// specializing this thing for each type, 
template<>
class TypeHelper<int> {
  public:
  uint8_t getTypeKey(void) { return TYPEKEY_INT; }
};
class TypeHelper<bool> {
  public:
  uint8_t getTypeKey(void) { return TYPEKEY_BOOL; }
};
class TypeHelper<float> {
  public:
  uint8_t getTypeKey(void) { return TYPEKEY_FLOAT; }
}

#endif 