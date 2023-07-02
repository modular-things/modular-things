// let's define... an unplanned move-type? 
// and an explicit (planned) type ? 

/*
size_t MAXL::messageHandler(uint8_t* data, size_t len, uint8_t* reply){
  // init reply-write and message-read ptrs, 
  uint16_t wptr = 0;
  uint16_t rptr = 0;
  // same old same old 
  switch(data[rptr ++]){
    case MAXL_MSGKEY_TIME_REQ:
      ts_writeUint32(getSystemTime(), reply, &wptr);
      break;
    case MAXL_MSGKEY_TIME_SET:
      setSystemTime(ts_readUint32(data, &rptr));
      break;
    case MAXL_MSGKEY_HALT:
      halt();
      break;
    case MAXL_MSGKEY_TRACK_ADDSEGMENT: 
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
    case MAXL_MSGKEY_GETINFO_REQ:
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
*/

export type UnplannedSegment = {
  p1: Array<number>,
  p2: Array<number>,
  vmax: number,
  accel: number,
}

export type PlannedSegment = UnplannedSegment & {
  vi: number,
  vf: number,
  explicit?: ExplicitSegment,
  transmitTime: number,
  next?: PlannedSegment,
  prev?: PlannedSegment,
}

// it does seem as though... there could be some simpler representation ? 
// think about describing time-vs-position *and* time-vs-rate ? 

export type ExplicitSegment = {
  // time-wise, 
  timeStart: number,
  timeEnd: number,
  isLastSegment: boolean,
  // positional 
  p1: Array<number>,
  unit: Array<number>,
  // rates, 
  vi: number,
  accel: number,
  vmax: number,
  vf: number,
  // pre-calc'd times (seconds):
  timeTotal: number,
  timeAccelEnd: number,
  timeCruiseEnd: number,
  // pre-calc'd integrals:
  distTotal: number,
  distAccelPhase: number,
  distCruisePhase: number,
}

export type SingleDOFExplicitSegment = {
  // time-wise, 
  timeStart: number,
  timeEnd: number,
  isLastSegment: boolean,
  // positional 
  start: number,
  // rates, 
  vi: number,
  accel: number,
  vmax: number,
  vf: number,
  // pre-calc'd times (seconds):
  timeTotal: number,
  timeAccelEnd: number,
  timeCruiseEnd: number,
  // pre-calc'd integrals:
  distTotal: number,
  distAccelPhase: number,
  distCruisePhase: number,
}

let MAXL_KEYS = {
  MSG_TIME_REQ: 55, 
  MSG_TIME_SET: 57, 
  MSG_HALT: 59,
  MSG_TRACK_ADDSEGMENT: 61,
  MSG_GETINFO_REQ: 63,
  TRACKTYPE_POSLIN: 101,
}

export {
  MAXL_KEYS
}