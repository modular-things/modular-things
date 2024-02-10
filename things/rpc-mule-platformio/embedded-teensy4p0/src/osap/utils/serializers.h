// serializers 
#ifndef SERIALIZERS_H_
#define SERIALIZERS_H_

#include <Arduino.h>

// wptr is ptr 
void serializers_writeUint16(uint8_t* buf, uint16_t* wptr, uint16_t val);
// offset / direct, 
void serializers_writeUint16(uint8_t* buf, uint16_t offset, uint16_t val);
// read 
uint16_t serializers_readUint16(uint8_t* buf, uint16_t offset);
// read w/ ptr passalong 

// write 
void serializers_writeString(uint8_t* buf, uint16_t* wptr, char* val);
// read from buf[offset], into to dest, to at most <maxLen>
// returns the length of the string as-read 
size_t serializers_readString(uint8_t* buf, uint16_t offset, char* dest, size_t maxLen);

#endif 