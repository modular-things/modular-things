#include "maxl.h"
#include "osap.h"

MAXL_TrackEvent8Bit::MAXL_TrackEvent8Bit(const char* _name, void(*_followerFunction)(uint8_t mask)){
  MAXL::getInstance()->registerTrack(this);
  strncpy(trackName, _name, MAXL_TRACKNAME_MAX_LEN);
  followerFunction = _followerFunction;
  // and assign our track type, 
  trackTypeKey = MAXL_KEY_TRACKTYPE_EVENT_8BIT;
}

void MAXL_TrackEvent8Bit::begin(void){
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

void MAXL_TrackEvent8Bit::evalEventSegment(maxlSegmentEvent8Bit_t* seg, uint32_t now){
  // now is inter-seg, right?
  // so for...
  uint16_t rptr = 0;
  // OSAP_DEBUG("bts 5, 6: " + String(seg->data[5]) + "," + String(seg->data[6]));
  // so, we packed 'em big (timestamp) to small, to make this easy: 
  for(uint8_t e = 0; e < seg->numEvents - 1; e ++){
    // get a stamp & mask, 
    uint32_t stamp = ts_readUint32(seg->data, &rptr);
    uint8_t mask = ts_readUint8(seg->data, &rptr);
    uint32_t nextStamp = ts_readUint32(seg->data, &rptr);
    rptr -= 4;
    // yarp... 
    // OSAP_DEBUG("rptr: " + String(rptr) + " stamp: " + String(stamp) + " next: " + String(nextStamp) + " mask: " + String(mask) + " now: " + String(now));
    // monotonic, so:
    if(stamp < now && now < nextStamp){
      // OSAP_DEBUG(String(e));
      if(mask != _lastMask){
        followerFunction(mask);
        _lastMask = mask;
      }
      return;
    }
  }
}

void MAXL_TrackEvent8Bit::evaluate(uint32_t time){
  switch(mode){
    case MAXL_EVT8_MODE_NONE:
      break;
    case MAXL_EVT8_MODE_QUEUE:
      {
        // see, like most of this kit can be re-used across tracks...
        // maybe it's template code oclock ? 
        maxlSegmentEvent8Bit_t* seg = tail;
        for(uint8_t s = 0; s < MAXL_QUEUE_LEN; s ++){
          if(seg->isOccupied && seg->tStart_us <= time && time < seg->tEnd_us){
            // these are all timestamped on str8 uint32, right? so... 
            uint32_t segTime = time - seg->tStart_us;
            // OSAP_DEBUG("ST " + String(segTime));
            evalEventSegment(seg, segTime);
            break; // break the segment-walker 
          } else {
            seg = seg->next;
          }
        }
      }
      break;
  }
}

size_t MAXL_TrackEvent8Bit::addSegment(uint8_t* data, size_t len, uint8_t* reply){
  if(head->next->isOccupied){
    OSAP_ERROR("tx to over-full buffer on event chain");
    return 0;
  }
  uint16_t rptr = 0;
  uint8_t segmentType = data[rptr ++];
  if(segmentType != trackTypeKey){
    OSAP_ERROR("bad track type : " + String(segmentType) + " to: " + String(trackTypeKey));
    return 0;
  }
  // ok we copy pasta
  head->tStart_us = ts_readUint32(data, &rptr);
  head->tEnd_us = ts_readUint32(data, &rptr);
  head->numEvents = data[rptr ++];
  // then... the rest ?
  memcpy(head->data, data + rptr, len - rptr);
  head->dataLen = len - rptr;
  head->isOccupied = true;
  // oot 
  OSAP_DEBUG("rx seg w/ numEvents: " + String(head->numEvents) + " start: " + String(head->tStart_us) + " end: " + String(head->tEnd_us) + " data: " + String(len - rptr));
  // and advance la ringo 
  head = head->next;
  mode = MAXL_EVT8_MODE_QUEUE;
  // no ack 4 us... 
  return 0;
}


size_t MAXL_TrackEvent8Bit::getSegmentCompleteMessage(uint32_t time, uint8_t* msg){
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

void MAXL_TrackEvent8Bit::halt(void){
  // we're crash stoppen for now, we *could* do some work to write a new trajectory here 
  // and then follow that (i.e. velocity -> zero), but time-being we're just going to rm the queue
  mode = MAXL_EVT8_MODE_NONE;
  for(uint8_t s = 0; s < MAXL_QUEUE_LEN; s ++){
    queue[s].isOccupied = false; 
  }
  // and reset these so that our start-up conditions are clean 
  head = &(queue[0]);  // where to write-in, 
  tail = &(queue[0]);  // which is ticking along... 
  // and let's reset our stateful position-tracking things, 
  _lastMask = 0;
}