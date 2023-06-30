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
  PlannedSegment,
} from "./maxl-types"

let MOTION_MAX_DOF = 7

// altho perhaps we should just encode lines on the v-t plot, also ? simpler ? 
// that would be... 

export default function createMAXL(actuators: Array<any>) {
  if (!Array.isArray(actuators)) throw new Error(`MAXL needs [actuators], not ac1, ac2 e.g...`);
  console.log(`MAXL w/ actuators as `, actuators);

  // -------------------------------------------- we'll get a time-base going on each startup, 

  let maxlLocalClockOffset = 0;

  // return a local timestamp in seconds 
  let getLocalTime = () => {
    return (Time.getTimeStamp() - maxlLocalClockOffset) / 1000;
  } 

  let begin = async () => {
    // TODO: should reset all remotes here ... 
    await Promise.all(actuators.map(actu => actu.halt()))
    // get some readings, 
    let count = 10
    let samples = []
    for (let i = 0; i < count; i++) {
      samples.push(await Promise.all(actuators.map((actu => actu.writeMaxlTime(0)))))
    }
    // urm, 
    let res = new Array(actuators.length).fill(0)
    for (let a = 0; a < res.length; a++) {
      for (let i = 0; i < count; i++) {
        res[a] += samples[i][a];
      }
      // avg, and ms -> seconds 
      res[a] = res[a] / count / 1000;
    }
    // let's reset our clock to zero, 
    maxlLocalClockOffset = Time.getTimeStamp();
    // now let's set their clocks... to whence-we-suspect-the-set-packet-will-land, 
    await Promise.all(actuators.map(async (actu, i) => {
      return await actu.writeMaxlTime(getLocalTime() + res[i])
    }))
    console.warn(`MAXL setup OK w/ avg RTTs of: `, res)
  }

  // erm, 
  let defaultDOF = 7

  // -------------------------------------------- queue management 
  // we have a big line of segments, 
  let queue: Array<PlannedSegment> = []
  // it's a linked list; the head is the segment *currently happening*
  // i.e. head->previous is in the past, historical, 
  let head: PlannedSegment;
  // the tail is the most-recently appended segment, 
  let tail: PlannedSegment;

  let QUEUE_START_DELAY = 0.050   // in seconds 
  let QUEUE_REMOTE_MAX_LEN = 16
  let QUEUE_LOCAL_MAX_LEN = 48

  // -------------------------------------------- first up we have the halting code, 
  // this is like a reset... 

  let halt = async () => {
    // shut 'em down, this is the hard stop: 
    await Promise.all(actuators.map(actu => actu.halt()))
    // now we want to fk up / reset our own state:
    queue.length = 0;
    head = null;
    tail = null;
    // we're done now then... AFAIK 
  }

  // get length from head -> end, 
  let getLocalLookaheadLength = () => {
    if (!head) return 0;
    let count = 1;
    let current = head;
    while (current) {
      count++;
      current = current.next;
    }
    // console.warn(`LL: ${count}`)
    return count;
  }

  let checkQueueState = async () => {
    try {
      if (!head) {
        console.warn(`queue state bails on headlessness`)
        return;
      }
      let now = getLocalTime();
      // 1st let's check that head is in the correct place, 
      if (head.explicit.timeEnd < now) {
        head = head.next;
        checkQueueState();
        return;
      }
      // ok, supposing we have a well formed (and tx'd) head, 
      // which is the current segment, then we want to do:
      let current = head;
      for (let s = 0; s < QUEUE_REMOTE_MAX_LEN; s++) {
        // console.log(`HEAD ${head.transmitTime}`)
        // get next ahead, 
        current = current.next;
        // if it's empty, bail, 
        if (!current) {
          console.warn(`eof, bail`)
          return;
        }
        // if it's been tx'd, carry on:
        if (current.transmitTime != 0) continue;
        // otherwise calculate explicit,
        current.explicit = calculateExplicitSegment(current, current.prev.explicit.timeEnd);
        let datagram = writeExplicitSegment(current.explicit);
        // and ship that, 
        current.transmitTime = now;
        let timeUntilComplete = Math.ceil((current.explicit.timeEnd - now) * 1000);
        console.log(`QM: time: ${current.transmitTime.toFixed(3)}, w/ end ${current.explicit.timeEnd.toFixed(3)}, complete in ${timeUntilComplete}ms`);
        console.log(`QM: sending from ${current.explicit.timeStart.toFixed(3)} -> (${(current.explicit.timeTotal).toFixed(3)}s) -> ${current.explicit.timeEnd.toFixed(3)}`);
        // IDK if this takes any time at all - 
        await Promise.all(actuators.map(((actu) => actu.appendMaxlSegment(datagram))));
        // and set a timeout to check on queue states when it's done, 
        setTimeout(checkQueueState, timeUntilComplete);
        // ... then do the next, 
      }
    } catch (err) {
      head = null;
      throw err; 
    }
  }

  let addSegmentToQueue = (end: Array<number>, vmax: number, vlink: number) => {
    return new Promise<void>(async (resolve, reject) => {
      // console.warn(`addMove w/ end pos`, JSON.parse(JSON.stringify(end)), `vmax: `, vmax, `vlink: `, vlink)
      // first, we are tacking this move on the end of a previous segments' end-point, 
      // so let's in-fill any missing DOF, also re-writing `end` arg as `p2` seg property 
      let p1 = new Array(defaultDOF).fill(0);
      if (tail) {
        p1 = tail.p2;
      }
      // infill w/ spare DOF 
      let p2 = p1.map((val, a) => {
        if (end[a] == undefined || isNaN(end[a])) {
          return val
        } else {
          return end[a]
        }
      })
      // evidently this was worth double checking 
      console.warn(`P1: ${p1[0].toFixed(2)}, ${p1[1].toFixed(2)}; P2: ${p2[0].toFixed(2)}, ${p2[1].toFixed(2)}, DIST ${distance(p2, p1).toFixed(2)}`)
      // if distance is very small, rm it, 
      if (distance(p2, p1) < 0.1) {
        console.warn(`REJECTING very tiny move, ${distance(p2, p1).toFixed(3)}...`)
        resolve()
        return
      }
      // so we maybe don't have use for the unplanned type, 
      let seg: PlannedSegment = {
        p1: p1,
        p2: p2,
        vmax: vmax,
        accel: 100,
        vi: vlink,
        vf: vlink,
        transmitTime: 0,
      }
      // do the list linking, 
      if (tail) {
        tail.next = seg;
        seg.prev = tail;
      }
      // always 
      tail = seg;
      // and check...
      if (!head) {
        head = seg;
        head.explicit = calculateExplicitSegment(seg, getLocalTime() + QUEUE_START_DELAY);
        // await setDistributedClock(0);
      }
      // then check our queue states, only ingesting so many... 
      let ingestCheck = () => {
        // and we can dump the segment into our queue, 
        if (getLocalLookaheadLength() < QUEUE_LOCAL_MAX_LEN) {
          queue.push(seg)
          // console.warn(`QUEUE total ${queue.length}`)
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
    begin,
    halt, 
    addSegmentToQueue,
  }

}