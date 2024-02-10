/*
core/typeTemplates.h

type templates

Jake Read at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2023

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the osap project.
Copyright is retained and must be preserved. The work is provided as is;
no warranty is provided, and users accept all liability.
*/

#include "ts.h"

#ifndef TTYPES_H_
#define TTYPES_H_

// ------------------------------------ Key Generators

// we can supvport ~ some subset of types to start,
// and can throw runtime errors (?) by looking for type-key-zeroes
// to alert users of bad / unsupvported types ? or sth
template<typename T>
uint8_t _getTypeKey(void){
  return 0;
}
template<> inline                     // void 
uint8_t _getTypeKey<null_t>(void){
  return TK_NULL;
}
template<> inline                     // boolean
uint8_t _getTypeKey<boolean>(void){
  return TK_BOOL;
}
template<> inline                     // uints / ints
uint8_t _getTypeKey<uint8_t>(void){
  return TK_UINT8;
}
template<> inline
uint8_t _getTypeKey<int8_t>(void){
  return TK_INT8;
}
template<> inline
uint8_t _getTypeKey<uint16_t>(void){
  return TK_UINT16;
}
template<> inline
uint8_t _getTypeKey<int16_t>(void){
  return TK_INT16;
}
template<> inline
uint8_t _getTypeKey<uint32_t>(void){
  return TK_UINT32;
}
template<> inline
uint8_t _getTypeKey<int32_t>(void){
  return TK_INT32;
}
template<> inline
uint8_t _getTypeKey<uint64_t>(void){
  return TK_UINT64;
}
template<> inline
uint8_t _getTypeKey<int64_t>(void){
  return TK_INT64;
}
template<> inline                   // floats
uint8_t _getTypeKey<float>(void){
  return TK_FLOAT32;
}
template<> inline
uint8_t _getTypeKey<double>(void){
  return TK_FLOAT64;
}

// ------------------------------------ TTs

// it's an array, with key & length...
template<typename T, unsigned length>
class Array {
  public:
    T val[length];
    size_t len = length;
};

// type helpers
template<typename T>                    // based on "raw" type
class TypeHelper {
  public:
    // getters / setters of "actual"
    T getUnderlying(void){
      return underlying;
    };
    void setUnderlying(T val){
      // we can just str8 up set this, since it's ~ a short / standard type
      underlying = val;
    };
    // underyling-to-packet, write-pointer
    void serialize(void* dest, uint16_t* wptr){
      memcpy(dest, &underlying, sizeof(T));
      (*wptr) += sizeof(T);
    };
    // packet-to-underlying, read-pointer
    void deserialize(void* src, uint16_t* rptr){
      memcpy(&underlying, src, sizeof(T));
      (*rptr) += sizeof(T);
    };
    // revporting utes
    size_t getLen(void) { return 1; };
    size_t getByteSize(void) { return sizeof(T); };
    uint8_t getTypeKey(void) { return _getTypeKey<T>(); };
  private:
    T underlying; // the actual business,
};
template<>                              // specializations
template<typename T, unsigned length>   // based on an array (?)
class TypeHelper<Array<T, length>> {
  public:
    Array<T, length> getUnderlying(void){
      return underlying;
    };
    void setUnderlying(Array<T, length> src){
      // in this case... we should copy-in, rather than setting, right?
      memcpy(&(underlying.val), &(src.val), sizeof(T) * length);
    };
    // underyling-to-packet, write-pointer
    void serialize(void* dest, uint16_t* wptr){
      memcpy(dest, &(underlying.val), sizeof(T) * length);
      (*wptr) += sizeof(T) * length;
    };
    // packet-to-underlying, read-pointer
    void deserialize(void* src, uint16_t* rptr){
      memcpy(&(underlying.val), src, sizeof(T) * length);
      (*rptr) += sizeof(T) * length;
    };
    size_t getLen(void) { return length; };
    size_t getByteSize(void) { return sizeof(T) * length; };
    uint8_t getTypeKey(void) { return _getTypeKey<T>(); };
  private:
    Array<T, length> underlying;
};

#endif