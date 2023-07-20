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
}

// ---------------------------------------------- runtime 

void MAXL::loop(void){
  uint32_t now = getSystemTime();
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

void MAXL::setSystemTime(uint32_t time){
  // current underlying time, 
  // uint32_t us = micros();
  // we do now = micros() + timeOffset;
  // so setTime = micros() + timeOffset; at this instant, 
  timeOffset = time - micros();
  // just for the debug ? 
  uint32_t nowTime = getSystemTime();
  // OSAP_DEBUG("set time... " + String(time) + " -> " + String(nowTime));
}

uint32_t MAXL::getSystemTime(void){
  return micros() + timeOffset;
}

// ---------------------------------------------- message ingest 

size_t MAXL::messageHandler(uint8_t* data, size_t len, uint8_t* reply){
  // init reply-write and message-read ptrs, 
  uint16_t wptr = 0;
  uint16_t rptr = 0;
  // same old same old 
  switch(data[rptr ++]){
    case MAXL_KEY_MSG_TIME_REQ:
      ts_writeUint32(getSystemTime(), reply, &wptr);
      break;
    case MAXL_KEY_MSG_TIME_SET:
      setSystemTime(ts_readUint32(data, &rptr));
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