#ifndef TEMPLATE_SERIALIZERS_H_
#define TEMPLATE_SERIALIZERS_H_

#include <Arduino.h>

// --------------------------  Key Codes 

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


// --------------------------  Unions (serdes utes) 

union chunk_float32 {
  uint8_t bytes[4];
  float f;
};

// --------------------------  Serializing 
// TODO: do they write keys, or not ? we could have serialize_tight() and serialize_safe()
// ... TODO: it's just overloaded function calls anyways, innit ? 

template<typename T>
void serialize(T var, uint8_t* buffer, size_t* wptr){}

template<>inline
void serialize<int>(int var, uint8_t* buffer, size_t* wptr){
  buffer[(*wptr) ++] = var & 255;
  buffer[(*wptr) ++] = (var >> 8) & 255;
  buffer[(*wptr) ++] = (var >> 16) & 255;
  buffer[(*wptr) ++] = (var >> 24) & 255;
}

template<>inline 
void serialize<bool>(bool var, uint8_t* buffer, size_t* wptr){
  buffer[(*wptr) ++] = var ? 1 : 0;
}

template<>inline
void serialize<float>(float var, uint8_t* buffer, size_t* wptr){
  chunk_float32 chunk;
  chunk.f = var;
  buffer[(*wptr ++)] = chunk.bytes[0]; 
  buffer[(*wptr ++)] = chunk.bytes[1]; 
  buffer[(*wptr ++)] = chunk.bytes[2]; 
  buffer[(*wptr ++)] = chunk.bytes[3]; 
}

template<>inline 
void serialize<char*>(char * var, uint8_t* buffer, size_t* wptr){
  // TODO: author this... and do KEY, LEN, ... chars ?
}

// --------------------------  Deserializing 

template<typename T>
T deserialize(uint8_t* buffer, size_t* rptr){}

template<>inline 
int deserialize<int>(uint8_t* buffer, size_t* rptr){
  int val = 0;
  val |= buffer[(*rptr ++)];
  val |= buffer[(*rptr ++)] << 8;
  val |= buffer[(*rptr ++)] << 16;
  val |= buffer[(*rptr ++)] << 24;
  return val; 
}

template<>inline 
bool deserialize<bool>(uint8_t* buffer, size_t* rptr){
  return buffer[(*rptr ++)];
}

template<>inline 
float deserialize<float>(uint8_t* buffer, size_t* rptr){
  chunk_float32 chunk = {
    .bytes = {
      buffer[(*rptr ++)],
      buffer[(*rptr ++)],
      buffer[(*rptr ++)],
      buffer[(*rptr ++)],
    }
  };
  return chunk.f;
}

#endif 