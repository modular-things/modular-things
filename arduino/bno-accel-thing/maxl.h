#ifndef MAXL_H_
#define MAXL_H_

#include <Arduino.h>
#include "maxl-utes.h"

// settings 
#define MAXL_TRACKNAME_MAX_LEN 16
#define MAXL_MAX_TRACKS 16 
#define MAXL_QUEUE_LEN 32 

// messages 
#define MAXL_KEY_MSG_TIME_REQ 55
#define MAXL_KEY_MSG_TIME_SET 57
#define MAXL_KEY_MSG_HALT 59
#define MAXL_KEY_MSG_TRACK_ADDSEGMENT 61 
#define MAXL_KEY_MSG_GETINFO_REQ 63 

// track-types 
#define MAXL_KEY_TRACKTYPE_POSLIN 101 

// and a queue-thing interface, 
// a purely virtual class 
class MAXL_Track {
  public: 
    // every1 has 2 begin 
    virtual void begin(void) = 0;
    // the main runtime for this track, 
    virtual void evaluate(uint32_t time) = 0;
    // track-segments ingester (with a reply) and w/ an optional on-completion (?) 
    virtual size_t addSegment(uint8_t* data, size_t len, uint8_t* reply) = 0;
    virtual size_t getSegmentCompleteMessage(uint32_t time, uint8_t* msg) = 0;
    // track-resetter, 
    virtual void halt(void) = 0;
    // and... 
    uint8_t trackTypeKey = 0;
    char trackName[MAXL_TRACKNAME_MAX_LEN];
};

class MAXL {
  public:
    // init / runtime, 
    void begin(void);
    void loop(void);
    // and shutdown 
    void halt(void);
    // ingest... all messages ? 
    size_t messageHandler(uint8_t* data, size_t len, uint8_t* reply);
    // register a track... 
    void registerTrack(MAXL_Track* track);
    // and we need to singleton this thing, 
    MAXL(void);
    static MAXL* getInstance(void);
    // this aught to be useful to others besides ourselves 
    uint32_t getSystemTime(void);
  private:
    // time trackers 
    void setSystemTime(uint32_t time);
    int32_t timeOffset;
    // self and self's track collection 
    static MAXL* instance;
    MAXL_Track* tracks[MAXL_MAX_TRACKS];
    uint8_t numTracks = 0;
    // pls ignore 
    uint8_t msgBuffer[256];
};

// let's try a basic... one of these:
class MAXL_TrackPositionLinear : public MAXL_Track {
  public:
    // ahn unique constructor, 
    MAXL_TrackPositionLinear(const char* _name, void (*_followerFunction)(float position, float delta));
    // and the overriden interface funcs 
    void begin(void) override; 
    void evaluate(uint32_t time) override;
    size_t addSegment(uint8_t* data, size_t len, uint8_t* reply) override;
    size_t getSegmentCompleteMessage(uint32_t time, uint8_t* msg) override;
    // track-resetter, 
    void halt(void) override;
  private:
    // the funko to call, 
    void (*followerFunction)(float position, float delta) = nullptr;
    // we keep a few variables... 
    fpint32_t _lastPos = 0;
};

/*
// ---------------- setup 

void maxl_init(void);

// ---------------- run, AFAP

// run the loop code as often as possible, w/ log option 
void maxl_loop(boolean log);

// ---------------- config... motor pickins 

void maxl_pushSettings(uint8_t _actuatorID, uint8_t _axisPick, float _spu);

// ---------------- queue management

// void maxl_addSegmentToQueue(maxlSegmentPositionLinear_t* seg);

void maxl_addSegment(uint8_t* data, size_t len);

size_t maxl_getSegmentCompleteMsg(uint8_t* msg);

void maxl_evalSegment(fpint32_t* _pos, fpint32_t* _vel, maxlSegmentPositionLinear_t* seg, fpint32_t now, boolean log);

void maxl_halt(void);

// ---------------- time management

void maxl_setSystemTime(uint32_t now);

uint32_t maxl_getSystemTime(void);

// ---------------- "user code"

void maxl_tickHardware(fpint32_t _state, fpint32_t _delta);

// ---------------- debuggen 

void maxl_printDebug(void);
*/

#endif 