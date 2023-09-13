#include "maxl.h"
#include "osap.h"

// ---------------------------------------------- singleton stuff 

MAXL* MAXL::instance = nullptr;

MAXL::MAXL(void){
  if(instance == nullptr){
    instance = this;
  }
}

MAXL* MAXL::getInstance(void){
  return instance;
}

// ---------------------------------------------- track registration 

void MAXL::registerTrack(MAXL_Track* track){
  if(numTracks >= MAXL_MAX_TRACKS){
    // she borked, should throw some error 
    // point me at the project that deploys 16 tracks in one module 
    // and I will come up with a way to escape this error 
  } else {
    tracks[numTracks] = track;
    numTracks ++;
  }
}

// ---------------------------------------------- startup 

void MAXL::begin(void){
  for(uint8_t t = 0; t < numTracks; t ++){
    tracks[t]->begin();
  }
  // (clock-scope-debugging-code)
  // we additionally are going to setup to debug 
  // out of the backpack pins (time being):
  // pinMode(D10, OUTPUT);
}

// ---------------------------------------------- runtime 

// (clock-scope-debugging-code)
// bool plot = false;
// #define TEST_MODULO 14
// #define TEST_PRINT 32 
// #define TEST_BIT_TIME 125

void MAXL::loop(void){
  uint32_t now = getSystemTime();

  // (clock-scope-debugging-code)
  // if(now & (1 << TEST_MODULO) && !plot){
  //   // set edge, 
  //   plot = true;
  //   // do action 
  //   // start bit, 
  //   digitalWrite(D10, HIGH);
  //   delayMicroseconds(TEST_BIT_TIME);
  //   digitalWrite(D10, LOW);
  //   delayMicroseconds(TEST_BIT_TIME);
  //   // plot bits, lower 16 
  //   for(uint8_t i = 0; i < TEST_PRINT; i ++){
  //     digitalWrite(D10, (now & (uint32_t)(1 << (TEST_PRINT - i)) ? HIGH : LOW));
  //     delayMicroseconds(TEST_BIT_TIME);
  //   }    
  //   digitalWrite(D10, HIGH);
  //   delayMicroseconds(TEST_BIT_TIME);
  //   digitalWrite(D10, LOW);
  //   delayMicroseconds(TEST_BIT_TIME);
  // } else if (!(now & (1 << TEST_MODULO)) && plot){
  //   // reset edge, 
  //   plot = false;
  //   // do action 
  //   // digitalWrite(D10, LOW);
  // }

  for(uint8_t t = 0; t < numTracks; t ++){
    tracks[t]->evaluate(now);
    // we have interfaces to get messages on segment completion, 
    // but not currently using them: 
    size_t len = tracks[t]->getSegmentCompleteMessage(now, msgBuffer);
  }
}

// ---------------------------------------------- halt 

void MAXL::halt(void){
  for(uint8_t t = 0; t < numTracks; t ++){
    tracks[t]->halt();
  }
}

// ---------------------------------------------- time utes 

void MAXL::setClockConfig(int32_t offset, float skew){
  // no unlikely skews, 
  if(skew > 1.1F) skew = 1.1F;
  if(skew < 0.9F) skew = 0.9F;
  // current underlying time, 
  // uint32_t us = micros();
  // we do now = micros() + timeOffset;
  // so setTime = micros() + timeOffset; at this instant, 
  // timeOffset = time - micros();
  // just for the debug ? 
  timeOffset = offset; 
  timeSkew = skew;
  uint32_t nowTime = getSystemTime();
  // OSAP_DEBUG("CLK offset: " + String(timeOffset) + ", skew: " + String(timeSkew, 6) + ", time: " + String(nowTime));
}

uint32_t MAXL::getSystemTime(void){
  return (micros() + timeOffset) * timeSkew;
}

// ---------------------------------------------- message ingest 

size_t MAXL::messageHandler(uint8_t* data, size_t len, uint8_t* reply){
  // init reply-write and message-read ptrs, 
  uint16_t wptr = 0;
  uint16_t rptr = 0;
  // same old same old 
  switch(data[rptr ++]){
    case MAXL_KEY_MSG_TIME_GET:
      ts_writeUint32(getSystemTime(), reply, &wptr);
      ts_writeUint32(micros(), reply, &wptr);
      break;
    case MAXL_KEY_MSG_CLK_CONFIG_SET:
      {
        int32_t offset = ts_readInt32(data, &rptr);
        float skew = ts_readFloat32(data, &rptr);
        setClockConfig(offset, skew);
      }
      break;
    case MAXL_KEY_MSG_CLK_CONFIG_GET:
      ts_writeInt32(timeOffset, reply, &wptr);
      ts_writeFloat32(timeSkew, reply, &wptr);
      break;
    case MAXL_KEY_MSG_HALT:
      halt();
      break;
    case MAXL_KEY_MSG_TRACK_ADDSEGMENT: 
      {
        uint8_t trackIndex = data[rptr ++];
        if(trackIndex >= numTracks){
          OSAP_ERROR("oob track index: " + String(data[1]) + " to MAXL");
        } else {
          // pass it (and the reply channel) along 
          return tracks[trackIndex]->addSegment(&(data[rptr]), len - rptr, reply);
        }
      }
      break;
    case MAXL_KEY_MSG_GETINFO_REQ:
      reply[wptr ++] = numTracks;
      for(uint8_t t = 0; t < numTracks; t ++){
        reply[wptr ++] = tracks[t]->trackTypeKey;
        ts_writeString(tracks[t]->trackName, reply, &wptr);
      }
      break;
    default:
      OSAP_ERROR("bad msg key: " + String(data[0]) + " to MAXL");
      break;
  }
  // return reply len 
  return wptr;
}