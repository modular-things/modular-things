/*

maxl.ts

motion control coordinator / synchronizer 

Jake Read at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2023

*/

import { osap } from "../../osapjs/osap"
import Serializers from "../../osapjs/utils/serializers"
import Time from "../../osapjs/utils/time"

import testPath from "./maxl-test-paths"

import {
  distance,
  unitVector,
  // floatToFixed, 
  // floatToUint32Micros, 
  writeExplicitSegment,
  calculateExplicitSegment
} from "./maxl-utes"

import {
  UnplannedSegment,
  PlannedSegment,
  ExplicitSegment
} from "./maxl-types"

let MOTION_MAX_DOF = 7

// altho perhaps we should just encode lines on the v-t plot, also ? simpler ? 
// that would be... 

export default function createMAXL(actuators: Array<any>) {
  if(!Array.isArray(actuators)) throw new Error(`MAXL needs [actuators], not ac1, ac2 e.g...`);
  console.log(`MAXL w/ actuators as `, actuators);

  // -------------------------------------------- core communication utes 
  let setAllRemoteClocks = async (time: number) => {
    // on queue startup... we want to reset the remote clocks to zero... 
    await Promise.all(actuators.map((actu => actu.writeMaxlTime(time))))
  }

  // -------------------------------------------- sync ours & their, 

  let maxlLocalClockOffset = 0;

  // set the clock in... units (?) 
  let setDistributedClock = async (time: number) => {
    // basically always sets to 'zero' so beware bugs elsewise 
    maxlLocalClockOffset = Time.getTimeStamp();
    // and set remotes - doesn't do anything about delay atm, that's to come... 
    // we would set clocks, per each, w/ a time in the future when we expect 
    // the msg to arrive... 
    await setAllRemoteClocks(0);
  }

  // return a local timestamp in seconds 
  let getLocalTime = () => {
    return (Time.getTimeStamp() - maxlLocalClockOffset) / 1000;
  }


  // -------------------------------------------- queue management 
  // of... segments, not the explicit type 
  let queue: Array<PlannedSegment> = []
  let QUEUE_START_DELAY = 250
  let QUEUE_STATE_EMPTY = 0
  let QUEUE_STATE_AWAITING_START = 1
  let QUEUE_STATE_RUNNING = 2
  let QUEUE_REMOTE_MAX_LEN = 16
  let QUEUE_LOCAL_MAX_LEN = 32
  let queueState = QUEUE_STATE_EMPTY
  // we track our most-recently-tacked-on-position, 
  let queueHeadPosition = new Array(MOTION_MAX_DOF).fill(0)

  // TODO is... make this a-la the paper ? 
  // i.e. think about time more carefully... 
  let checkQueueState = async () => {
    try {
      switch (queueState) {
        case QUEUE_STATE_EMPTY:
          if (queue.length > 0) {
            queueState = QUEUE_STATE_AWAITING_START
            setTimeout(async () => {
              await setDistributedClock(0);
              // await setAllRemoteClocks(0);
              console.log(`queue begin...`, JSON.parse(JSON.stringify(queue)));
              // calculate the first starter ? 
              queue[0].explicit = calculateExplicitSegment(queue[0], 0.050)
              queueState = QUEUE_STATE_RUNNING;
              checkQueueState();
            }, QUEUE_START_DELAY)
          }
          break;
        case QUEUE_STATE_AWAITING_START:
          // noop, awaiting... 
          break;
        case QUEUE_STATE_RUNNING:
          // tx them-which-we-can, 
          for (let s = 0; s < QUEUE_REMOTE_MAX_LEN; s++) {
            // don't eval non-existent queue items 
            if (!queue[s]) break;
            // if we haven't tx'd it, do so, 
            if (queue[s].transmitTime == 0) {
              queue[s].transmitTime = getLocalTime()
              // we need to calculate the explicit seg here, 
              // and that relies on the last-thing, 
              // and ... we should have guarantee that the 1st is already calc'd 
              if(s != 0){
                queue[s].explicit = calculateExplicitSegment(queue[s], queue[s-1].explicit.timeEnd);
              }
              // we need to figure out when to post this as complete, 
              // and we're just doing it time-based at the moment, so:
              let timeUntilComplete = Math.ceil((queue[s].explicit.timeEnd - queue[s].transmitTime) * 1000)
              // tracking... 
              console.log(`QM: time: ${queue[s].transmitTime.toFixed(3)}, w/ end ${queue[s].explicit.timeEnd.toFixed(3)}, complete in ${timeUntilComplete}ms`);
              console.log(`QM: sending from ${queue[s].explicit.timeStart.toFixed(3)} -> (${(queue[s].explicit.timeTotal).toFixed(3)}s) -> ${queue[s].explicit.timeEnd.toFixed(3)}`);
              // and transmitting each, 
              let datagram = writeExplicitSegment(queue[s].explicit);
              await Promise.all(actuators.map((actu => actu.appendMaxlSegment(datagram))));
              // now... let's set that timeout, 
              setTimeout(checkQueueState, timeUntilComplete);
            }
          }
          break;
      }
    } catch (err) {
      throw err
    }
  }

  let addSegmentToQueue = (end: Array<number>, vmax: number, vlink: number) => {
    return new Promise<void>((resolve, reject) => {
      console.warn(`addMove w/ end pos`, JSON.parse(JSON.stringify(end)), `vmax: `, vmax, `vlink: `, vlink)
      // first, we are tacking this move on the end of a previous segments' end-point, 
      // so let's in-fill any missing DOF, also re-writing `end` arg as `p2` seg property 
      let p2 = queueHeadPosition.map((val, a) => {
        if (end[a] == undefined || isNaN(end[a])) {
          return val
        } else {
          return end[a]
        }
      })
      // evidently this was worth double checking 
      console.warn(`QueueHeadPosition ${queueHeadPosition[0].toFixed(2)}, ${queueHeadPosition[1].toFixed(2)}`)
      console.warn(`P2 ${p2[0].toFixed(2)}, ${p2[1].toFixed(2)}`)
      console.warn(`DIST`, distance(p2, queueHeadPosition))
      // if distance is very small, rm it, 
      if (distance(p2, queueHeadPosition) < 0.1) {
        console.warn(`REJECTING very tiny move, ${distance(p2, queueHeadPosition).toFixed(3)}...`)
        resolve()
        return
      }
      // so we maybe don't have use for the unplanned type, 
      let seg: PlannedSegment = {
        p1: JSON.parse(JSON.stringify(queueHeadPosition)),
        p2: p2, 
        vmax: vmax, 
        accel: 100,
        vi: vlink, 
        vf: vlink, 
        transmitTime: 0,
      }
      // upd8 this ... 
      queueHeadPosition = JSON.parse(JSON.stringify(seg.p2))
      // then check our queue states, only ingesting so many... 
      let ingestCheck = () => {
        // and we can dump the segment into our queue, 
        if (queue.length < QUEUE_LOCAL_MAX_LEN) {
          queue.push(seg)
          checkQueueState()
          resolve()
        } else {
          setTimeout(ingestCheck, 1)
        }
      }
      // kickoff
      ingestCheck()
    })
  }
  
  // erp, expose this also ? 
  let tp = []
  for (let reps = 0; reps < 6; reps++) {
    tp = tp.concat(testPath)
  }

  return {
    testPath: tp, 
    actuators,
    addSegmentToQueue,
  }

}