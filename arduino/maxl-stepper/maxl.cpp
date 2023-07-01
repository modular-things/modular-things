#include "maxl.h"
#include <osap.h>
// TODO: decouple maxl from the stepper via callback-attach for deltas, other tracks,
#include "stepper-driver.h"

// ---------------------------------------------- stateful stuff 
// states (units are steps, 1=1 ?) 
volatile uint8_t mode = MOTION_MODE_QUEUE;            // operative mode 

// time offset
int32_t timeOffset = 0;

// ---------------------------------------------- we have a queue 
// TODO: queue should be able to hold... various segment types... 

// maxlSegmentLinearMotion_t theSegment;
maxlSegmentLinearMotion_t queue[MAXL_QUEUE_LEN];
// // and our own head, tail for the queue 
maxlSegmentLinearMotion_t* head;  // write moves into here, 
maxlSegmentLinearMotion_t* tail;  // operate from here, 

void maxl_init(void){
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

// ... temporary, for deltas, 
fpint32_t next = 0;
fpint32_t delta = 0;
fpint32_t state = 0;
fpint32_t velocityState = 0;

void maxl_loop(boolean log){
  // system time... 
  uint32_t time = micros();// + timeOffset;
  // OSAP_DEBUG("time is... " + String(time));
  // modal, 
  switch(mode){
    case MOTION_MODE_NONE:
      break;
    case MOTION_MODE_VEL:
      // tbd;
      break;
    case MOTION_MODE_QUEUE:
      {
        // PORT->Group[0].OUTSET.reg = (uint32_t)(1 << PIN_TICK);  // marks interrupt entry, to debug 
        // time now is... 
        uint32_t time = micros() + timeOffset;
        // we'll go a-sweeping through the links, 
        maxlSegmentLinearMotion_t* seg = tail;
        // looking for an in-band segment, 
        for(uint8_t s = 0; s < MAXL_QUEUE_LEN; s ++){
          // if it's prepped and we are in band... 
          if(seg->isOccupied && seg->tStart_us <= time && seg->tEnd_us > time){
            // find a segment-relative time, fp32 seconds, 
            fpint32_t segTime = fp_floatToFixed32(((float)(time - seg->tStart_us)) * 0.000001);
            // evalutate the "next" state at this point, 
            // ... we can also pull out a velocity, 
            maxl_evalSegment(&next, &velocityState, seg, segTime, log);
            // calc deltas, we ~ need these (?) for the hardware abstraction (?) or do we, lol 
            delta = next - state;
            // OSAP_DEBUG("delta: " + String(deltas.axis[0]));
            if(log){
              OSAP_DEBUG("start, time, time(fp), end, delta: " + 
                String(seg->tStart_us) + " " + 
                String(time) + " " + 
                String(fp_fixed32ToFloat(segTime)) +  " " + 
                String(seg->tEnd_us) + " " + 
                String(fp_fixed32ToFloat(delta)));
            }
            // copy pasta ?
            state = next;
            // operate deltas, 
            maxl_tickHardware(next, delta);
            break; // break queue-advancing loop, 
          } else {
            // wasn't that one, look next... 
            seg = seg->next;
          }
        }
        // PORT->Group[0].OUTCLR.reg = (uint32_t)(1 << PIN_TICK);  // marks exit 
      }
      break;
  }
}

// into state goes posn, rate, vel, accel, per trajectory... 
// "now" is fixed point *seconds*, segment starts at t = 0 
void maxl_evalSegment(fpint32_t* _pos, fpint32_t* _vel, maxlSegmentLinearMotion_t* seg, fpint32_t now, boolean log){
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

    // a potential and not-unlikely fuckup;
    // if(vel < fp_int32ToFixed32(0)){
    //   if(log) OSAP_ERROR("-ve velocity during deccel phase; " + String(fp_fixed32ToFloat(vel)));
    //   vel = fp_int32ToFixed32(1);
    // }

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

// -------------------------- adding segments, 

void maxl_addSegmentToQueue(maxlSegmentLinearMotion_t* seg){
  // if true, bad fullness:
  if(head->next->isOccupied){
    OSAP_ERROR("tx to over-full motion buffer");
    return;
  }
  // we're copying trajectory segments in at the head, 
  OSAP_DEBUG("seg for us: " + String(seg->tStart_us));
  // basically copy-pasta, 
  head->tStart_us = seg->tStart_us;
  head->tEnd_us = seg->tEnd_us;
  head->isLastSegment = seg->isLastSegment; 
  //
  head->start = seg->start;
  //
  head->vi = seg->vi;
  head->accel = seg->accel;
  head->vmax = seg->vmax;
  head->vf = seg->vf;
  //
  head->distTotal = seg->distTotal;
  head->distAccelPhase = seg->distAccelPhase;
  head->distCruisePhase = seg->distCruisePhase;
  //
  head->tAccelEnd = seg->tAccelEnd;
  head->tCruiseEnd = seg->tCruiseEnd;
  // and setup to run;
  head->isOccupied = true;
  // now advance the head ptr, 
  head = head->next;
  // now we r queue'en, 
  mode = MOTION_MODE_QUEUE;
}

void maxl_halt(void){
  // it's a crash stop! 
  // lettuce swap modes, 
  mode = MOTION_MODE_NONE;
  // and rm all codes, 
  for(uint8_t s = 0; s < MAXL_QUEUE_LEN; s ++){
    queue[s].isOccupied = false;
  }
}

// -------------------------- time management ? 

void maxl_setSystemTime(uint32_t setTime){
  // this is our system time, 
  uint32_t us = micros();
  // we do now = micros() + timeOffset;
  // so setTime = micros() + timeOffset; at this instant, 
  timeOffset = setTime - micros();
  OSAP_DEBUG("time offset is " + String(timeOffset));
}

uint32_t maxl_getSystemTime(void){
  return micros() + timeOffset;
}

// -------------------------- queue-complete-checks, 

// *also* does the lift of clearing out the back of our queue 
size_t maxl_getSegmentCompleteMsg(uint8_t* msg){
  // we can only rm one-per-call here anyways, and oldest-existing boy is here:
  if(tail->isOccupied && tail->tEnd_us < maxl_getSystemTime()){
    OSAP_DEBUG("up-piping seg " + String(tail->tStart_us));
    uint16_t wptr = 0;
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

// -------------------------- items below ~ should become user codes

// I'll stash this here for now, though it should be... like, "user code"
// we'll operate the x motor, 
fpint32_t stepModulo = fp_int32ToFixed32(0);

// soooo _deltas is real-units, fpint32... 
// we have phase-angle pointing, 0-63... 0-63 does us one/quarter 
// of an electrical phase, which is four "steps" IIRC
// so 0-15 goes through one step, etc
// so we have 16*200=3200 of these in one revolution, 
// and we have 32 millimeters of travel every time we make 200 steps, 
// so we have (for one unit), 100 of these steps, beautifully (and serindipitously)
// time being, I'm just going to bake that in here... 

void maxl_tickHardware(fpint32_t _state, fpint32_t _delta){
  // simple... to debug if anything happening ?
  // if(_delta > 0){
  //   stepper_step(1, true);
  // } else if (_delta < 0){
  //   stepper_step(1, false);
  // }

  // this does this... step-increment independent, i.e. so-long as we are 
  // not more than 180' out of phase (from last step) it should be gucci
  // ... means we can crikety crank the microsteps but not worry about tick rates 
  // increment... second val is SPU, IIRC 
  stepModulo += fp_mult32x32(_delta, fp_int32ToFixed32(100));
  // OSAP_DEBUG(String(fp_fixed32ToFloat(_deltas->axis[0]), 5) + " " + String(fp_fixed32ToInt32(stepModulo)));
  // wrap around...
  if(stepModulo > fp_int32ToFixed32(63)){
    stepModulo -= fp_int32ToFixed32(63);
  } else if(stepModulo < fp_int32ToFixed32(0)){
    stepModulo += fp_int32ToFixed32(63);
  }
  // point a-la, 
  stepper_point(fp_fixed32ToInt32(stepModulo));

  // if(stepModulo > fp_int32ToFixed32(1)){
  //   stepper_step(4, true);
  //   stepModulo -= fp_int32ToFixed32(1);
  // } else if (stepModulo < fp_int32ToFixed32(-1)){
  //   stepper_step(4, false);
  //   stepModulo += fp_int32ToFixed32(1);    
  // }
}

void maxl_printDebug(void){
  // we should check if these worked, 
}