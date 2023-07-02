#include "maxl.h"
#include "maxl-utes.h"

// OSAP is just here for debugs, we should be able to decouple ? 
#include "osap.h"

MAXL_TrackPositionLinear::MAXL_TrackPositionLinear(const char* _name, void (*_followerFunction)(float position, float delta)){
  // register ourselves as a track... 
  MAXL::getInstance()->registerTrack(this);
  // and store our name & follower func
  strncpy(trackName, _name, MAXL_TRACKNAME_MAX_LEN);
  followerFunction = _followerFunction;
  // and assign our track type, 
  trackTypeKey = MAXL_KEY_TRACKTYPE_POSLIN;
}

// so, here's our linear piecewise position chunk 
// ... I suppose we could have ahn .h for this, idk 

typedef struct maxlSegmentPositionLinear_t {
  // system-reckoned start and end times, in micros, 
  uint32_t tStart_us = 0;
  uint32_t tEnd_us = 0;
  // sequencing aid,
  boolean isLastSegment = false;
  // valuuuues:
  // a start position and total distance, 
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
  // now some queue management flags / links; 
  // ready/set, token 
  boolean isOccupied = false;
  // linking 
  maxlSegmentPositionLinear_t* next;
  maxlSegmentPositionLinear_t* previous;
  uint32_t indice = 0;  // track own location, 
} maxlSegmentPositionLinear_t;

// we keep a file-scoped queueue of them 
maxlSegmentPositionLinear_t queue[MAXL_QUEUE_LEN];
maxlSegmentPositionLinear_t* head;
maxlSegmentPositionLinear_t* tail;

#define MAXL_TPL_MODE_NONE 0 
#define MAXL_TPL_MODE_QUEUE 1 

// ... and a queue mode
uint8_t mode = MAXL_TPL_MODE_NONE;

void MAXL_TrackPositionLinear::begin(void){
  // -------------------------------------------- queue needs some setup, 
  for(uint8_t i = 0; i < MAXL_QUEUE_LEN; i ++){
    // each tags own indice, 
    queue[i].indice = i;
    // and we link this -> next, prev <- this 
    if(i != MAXL_QUEUE_LEN - 1) queue[i].next = &(queue[i+1]);
    if(i != 0) queue[i].previous = &(queue[i-1]);
  }
  // and the wraparound cases, 
  queue[0].previous = &(queue[MAXL_QUEUE_LEN - 1]);
  queue[MAXL_QUEUE_LEN - 1].next = &(queue[0]);
  head = &(queue[0]);  // where to write-in, 
  tail = &(queue[0]);  // which is ticking along... 
}

// the actual maths 
// ... wonder if we could boil track abstraction down... to just spec this ?
// ... the track is basically just... the serialization, and the evaluation (?) 
// i.e. generalized code could manage... the queue, etc, but... later, tricky interfaces 
void evalSeg(maxlSegmentPositionLinear_t* seg, fpint32_t now, fpint32_t* _pos, fpint32_t* _vel){
  // we're going to calc a distance-from-segment-start-pt, that's this:
  fpint32_t dist = 0;
  // our current vels & accels will get stored / used, 
  fpint32_t vel = 0; 
  fpint32_t accel = 0;
  // OK: everything is real-units (i.e. units/sec, units/sec/sec, and seconds)
  // but in fixed point ! 
  if(now < seg->tAccelEnd){
    // we're pre-cruise, so are currently accelerating, 
    accel = seg->accel;
    // vel = vi + accel * t 
    vel = seg->vi + fp_mult32x32(seg->accel, now);
    // dist = ((vi + vf) / 2) * t
    dist = fp_mult32x32(((seg->vi + vel) >> 1), now);
  } else if (now < seg->tCruiseEnd){
    // we've been thru accel phase, and are mid-cruise, 
    accel = 0;
    // v = cruise velocity ! 
    vel = seg->vmax;
    // d = previously-calculated-integral + vmax * t 
    dist = seg->distAccelPhase;
    dist += fp_mult32x32(seg->vmax, (now - seg->tAccelEnd));
  } else {
    // we're in the decel phase, 
    accel = - seg->accel;
    // vel = vmax - accel * t 
    // #warning for a performance improvement, it seems likely that these 
    // speed-x-time calcs could avoid the 64bit promotion used in fp_mult32x32() ?
    // ... we could do some scale analysis, if we can limit segment time-sizes, 
    // we could limit rates as well, and this could all be lickedy-split 32-bit 
    vel = seg->vmax - fp_mult32x32(seg->accel, (now - seg->tCruiseEnd));
    // d = both-previously-calculated-integrals + ((vi + vf) / 2) * t
    dist = seg->distAccelPhase + seg->distCruisePhase;
    dist += fp_mult32x32(((seg->vmax + vel) >> 1), (now - seg->tCruiseEnd));
  }
  // so, our position is just the start + our calculated distance at this time, 
  *_pos = seg->start + dist;
  *_vel = vel;
  // we also have the velocity that we could write... 
  // ok we have vels, accels, and distances, we can assign those, 
  // _state->accel = accel;
  // _state->vel = vel;
}

void MAXL_TrackPositionLinear::evaluate(uint32_t time){
  // to track deltas, 
  static fpint32_t lastPos = 0;
  static fpint32_t delta = 0;
  static fpint32_t pos = 0;
  static fpint32_t vel = 0;
  // ... for cleanup, I'm pretty sure we could do this just via 
  // tail-state, i.e. if it's ".ready" or not, we have work 2do (or dont) 
  switch(mode){
    case MAXL_TPL_MODE_NONE:
      break;
    case MAXL_TPL_MODE_QUEUE:
      {
        // start with the tail, 
        maxlSegmentPositionLinear_t* seg = tail;
        // look for an in-band seggy 
        for(uint8_t s = 0; s < MAXL_QUEUE_LEN; s ++){
          if(seg->isOccupied && seg->tStart_us <= time && time < seg->tEnd_us){
            // calculate segment-relative time in fp32 seconds:
            fpint32_t segTime = fp_floatToFixed32(((float)(time - seg->tStart_us)) * 0.000001);
            // do the actual werk, 
            evalSeg(seg, segTime, &pos, &vel);
            delta = pos - lastPos;
            followerFunction(fp_fixed32ToFloat(pos), fp_fixed32ToFloat(delta));
            // and track 
            lastPos = pos; 
            // we're done 
            break; // break the segs-advancing loop 
          } else {
            // that segment wasn't in-band, look ahead:
            seg = seg->next;
          }
        }
      }
      break;
  }
}

size_t MAXL_TrackPositionLinear::addSegment(uint8_t* data, size_t len, uint8_t* reply){
  // str8 from the datagram, 
  if(head->next->isOccupied){
    OSAP_ERROR("tx to over-full motion buffer");
    return 0;
  }
  // it seems like it'd be possible to do something silly fast like 
  // memcpy(void* head, data, ... serializedLen);
  // it's probably even worth trying, but for now the laborious but more-honest:
  // setup the read and check the type, 
  uint16_t rptr = 0;
  uint8_t segmentType = data[rptr ++];
  if(segmentType != trackTypeKey){
    OSAP_ERROR("bad track type : " + String(segmentType) + " to: " + String(trackTypeKey));
    return 0;
  }
  // copy it out, 
  head->tStart_us = ts_readUint32(data, &rptr);
  head->tEnd_us = ts_readUint32(data, &rptr);
  head->isLastSegment = ts_readBoolean(data, &rptr);
  // start and distance 
  head->start = ts_readInt32(data, &rptr);
  // vi, vmax, accel, 
  head->vi = ts_readInt32(data, &rptr);
  head->accel = ts_readInt32(data, &rptr);
  head->vmax = ts_readInt32(data, &rptr);
  head->vf = ts_readInt32(data, &rptr);
  // pre-computed integrals, 
  head->distTotal = ts_readInt32(data, &rptr); 
  head->distAccelPhase = ts_readInt32(data, &rptr);
  head->distCruisePhase = ts_readInt32(data, &rptr);
  // and trapezoid times
  head->tAccelEnd = ts_readInt32(data, &rptr);
  head->tCruiseEnd = ts_readInt32(data, &rptr);
  // and setup to run;
  head->isOccupied = true;
  // now advance the head ptr, 
  head = head->next;
  // now we r queue'en, 
  mode = MAXL_TPL_MODE_QUEUE;
  // we don't have a return message at this moment... 
  return 0;
}

size_t MAXL_TrackPositionLinear::getSegmentCompleteMessage(uint32_t time, uint8_t* msg){
  // we can only rm one-per-call here anyways, and oldest-existing boy is here:
  if(tail->isOccupied && tail->tEnd_us < time){
    // OSAP_DEBUG("up-piping seg " + String(tail->tStart_us));
    uint16_t wptr = 0;
    // we could write return msgs out here, ... 
    // id self & start time, which should be sufficient to ID the segment, 
    // ts_writeUint8(actuatorID, msg, &wptr);
    // ts_writeUint32(tail->tStart_us, msg, &wptr);
    // no longer occupied, 
    tail->isOccupied = false;
    // and advance our tail, 
    tail = tail->next;
    // and ship that pckt, 
    return wptr;
  } else {
    return 0;
  }
}

void MAXL_TrackPositionLinear::halt(void){
  // we're crash stoppen for now, we *could* do some work to write a new trajectory here 
  // and then follow that (i.e. velocity -> zero), but time-being we're just going to rm the queue
  mode = MAXL_TPL_MODE_NONE;
  for(uint8_t s = 0; s < MAXL_QUEUE_LEN; s ++){
    queue[s].isOccupied = false; 
  }
  // and reset these so that our start-up conditions are clean 
  head = &(queue[0]);  // where to write-in, 
  tail = &(queue[0]);  // which is ticking along... 
}