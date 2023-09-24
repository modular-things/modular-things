#ifndef MAXL_H_
#define MAXL_H_

#include <Arduino.h>
#include "maxl-utes.h"

// settings 
#define MAXL_TRACKNAME_MAX_LEN 16
#define MAXL_MAX_TRACKS 16 
#define MAXL_QUEUE_LEN 32 

// messages 
#define MAXL_KEY_MSG_TIME_GET 54 
#define MAXL_KEY_MSG_CLK_CONFIG_GET 55
#define MAXL_KEY_MSG_CLK_CONFIG_SET 57
#define MAXL_KEY_MSG_HALT 59
#define MAXL_KEY_MSG_TRACK_ADDSEGMENT 61 
#define MAXL_KEY_MSG_GETINFO_REQ 63 

// track-types 
#define MAXL_KEY_TRACKTYPE_POSLIN 101 
#define MAXL_KEY_TRACKTYPE_EVENT_8BIT 102

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
    void setClockConfig(int32_t offset, float skew);
    int32_t timeOffset;
    float timeSkew = 1.0F;
    // self and self's track collection 
    static MAXL* instance;
    MAXL_Track* tracks[MAXL_MAX_TRACKS];
    uint8_t numTracks = 0;
    // pls ignore 
    uint8_t msgBuffer[256];    
};

// ---------------- linear segment track-type !  

typedef struct maxlSegmentPositionLinear_t {
  // a start position 
  fpint32_t start = 0;
  // start rate, accel slope(s), cruise rate, end rate 
  fpint32_t vi = 0;
  fpint32_t accel = 0;
  fpint32_t vmax = 0;
  fpint32_t vf = 0;
  // pre-calculated phase integrals, 
  fpint32_t distTotal = 0;
  fpint32_t distAccelPhase = 0;
  fpint32_t distCruisePhase = 0;
  // phase times, 
  // i.e. when to stop accelerating, when to start decelerating 
  fpint32_t tAccelEnd = 0;
  fpint32_t tCruiseEnd = 0;
} maxlSegmentPositionLinear_t;

typedef struct maxlQueueItemLinear_t {
  // timing info (serialized)
  // system-reckoned start and end times, in micros, 
  uint32_t tStart_us = 0;
  uint32_t tEnd_us = 0;
  // sequencing aid,
  boolean isLastSegment = false;
  // the queue'en info (not serialized) 
  maxlQueueItemLinear_t* next;
  maxlQueueItemLinear_t* previous;
  uint32_t indice = 0;
  boolean isOccupied = false;
  // the actual obj (serialized) 
  maxlSegmentPositionLinear_t seg;
} maxlQueueItemLinear_t;

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
    // and our queue, per-instance 
    maxlQueueItemLinear_t queue[MAXL_QUEUE_LEN];
    maxlQueueItemLinear_t* head;
    maxlQueueItemLinear_t* tail;  
};

// ---------------- 8bit event type !

// strange multiple-definitions trouble when we 
// try to filescope this stuff, idk man 
typedef struct maxlSegmentEvent8Bit_t {
  uint8_t numEvents = 0;
  uint8_t data[256];
  uint8_t dataLen = 0;
} maxlSegmentEvent8Bit_t;

typedef struct maxlQueueItemEvent_t {
  // timing info (serialized)
  // system-reckoned start and end times, in micros, 
  uint32_t tStart_us = 0;
  uint32_t tEnd_us = 0;
  // sequencing aid,
  boolean isLastSegment = false;
  // the queue'en info (not serialized) 
  maxlQueueItemEvent_t* next;
  maxlQueueItemEvent_t* previous;
  uint32_t indice = 0;
  boolean isOccupied = false;
  // the actual obj (serialized) 
  maxlSegmentEvent8Bit_t seg;
} maxlQueueItemEvent_t;

#define MAXL_EVT8_MODE_NONE 0 
#define MAXL_EVT8_MODE_QUEUE 1 

// and here's some lights-thing, 
class MAXL_TrackEvent8Bit : public MAXL_Track {
  public:
    MAXL_TrackEvent8Bit(const char* _name, void(*_followerFunction)(uint8_t val));
    // interf,
    void begin(void) override;
    void evaluate(uint32_t time) override;
    size_t addSegment(uint8_t* data, size_t len, uint8_t* reply) override;
    size_t getSegmentCompleteMessage(uint32_t time, uint8_t* msg) override;
    void halt(void) override;
  private:
    void (*followerFunction)(uint8_t val) = nullptr;
    uint8_t _lastMask = 0;
    maxlQueueItemEvent_t queue[MAXL_QUEUE_LEN];
    maxlQueueItemEvent_t* head;
    maxlQueueItemEvent_t* tail;
    uint8_t mode = MAXL_EVT8_MODE_NONE;
    void evalEventSegment(maxlSegmentEvent8Bit_t* seg, uint32_t now);
};

#endif 