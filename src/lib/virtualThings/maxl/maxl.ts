/*

maxl.ts

motion control coordinator / synchronizer 

Jake Read at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2023

*/

import { osap } from "../../osapjs/osap"
import Serializers from "../../osapjs/utils/serializers"
import { keyToString } from "../../osapjs/utils/keys"
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
  MAXL_KEYS,
  ExplicitSegment,
} from "./maxl-types"

let MOTION_MAX_DOF = 7

// altho perhaps we should just encode lines on the v-t plot, also ? simpler ? 
// that would be... 

type MaxlSubscription = {
  actuator: string,
  track: string,
  reader: string,
}

type MaxlTrackInfo = {
  type: string,
  reader: string
}

type MaxlActuatorInfo = {
  name: string,
  tracks: Array<MaxlTrackInfo>,
}

type MaxlConfig = {
  motionAxes: Array<string>,              // set
  subscriptions: Array<MaxlSubscription>, // set
  actuators?: Array<MaxlActuatorInfo>,    // discovered / matched 
  // transformedAxes?: Array<string>,
  // transformForwards?: Function,
  // transformBackwards?: Function, 
}

export default function createMAXL(config: MaxlConfig) {

  // -------------------------------------------- we'll get a time-base going on each startup, 

  let maxlLocalClockOffset = 0;

  // return a local timestamp in seconds 
  let getLocalTime = () => {
    return (Time.getTimeStamp() - maxlLocalClockOffset) / 1000;
  }

  // sets our local clock, 
  let writeLocalTime = (time: number) => {
    maxlLocalClockOffset = time - Time.getTimeStamp();
  }

  // writes a new time out to a string-id'd actuator 
  let writeRemoteTime = async (time: number, actu: string) => {
    // time is handed over here in *seconds* - we write microseconds as unsigned int, 
    let micros = Math.ceil(time * 1000000);
    let datagram = new Uint8Array([MAXL_KEYS.MSG_TIME_SET, 0, 0, 0, 0]);
    Serializers.writeUint32(datagram, 1, micros);
    let outTime = Time.getTimeStamp()
    await osap.send(actu, "maxlMessages", datagram);
    let pingTime = Time.getTimeStamp() - outTime;
    return pingTime;
  }

  // halts all acutators *and* our own state 
  let halt = async () => {
    // shut each of our actuators down, this is the hard stop: 
    await Promise.all(config.actuators.map(actu => {
      return osap.send(actu.name, "maxlMessages", new Uint8Array([MAXL_KEYS.MSG_HALT]))
    }))
    // and reset / wipe our own state, 
    queue.length = 0;
    head = null;
    tail = null;
  }

  let begin = async () => {
    // (1) gather info about our remotes so that we can build subs 
    config.actuators = [];
    let actuatorNames: Set<string> = new Set();
    config.subscriptions.forEach(sub => actuatorNames.add(sub.actuator));
    console.log(`we have actu`, actuatorNames)
    // ... flesh 'em out, 
    for (let actu of actuatorNames) {
      let res = await osap.send(actu, "maxlMessages", new Uint8Array([MAXL_KEYS.MSG_GETINFO_REQ]));
      let numTracks = res[0];
      let tracks = [];
      let offset = 1;
      for (let t = 0; t < numTracks; t++) {
        let type = keyToString(res[offset], MAXL_KEYS);
        let reader = Serializers.readString(res, offset + 1);
        offset += reader.length + 2;
        tracks.push({ type, reader });
      }
      config.actuators.push({
        name: actu, 
        tracks: tracks
      })
    }
    // heres's our config now:
    console.warn(`after setup, this MAXL has config: `, config)
    // and we can halt 'em out in case we are restarting mid-strem, 
    await halt();
    // (2) now let's check that our subscriptions make sense, yeah ? 
    for(let sub of config.subscriptions){
      // check that we have this motion axes,
      // *or* that some other exists, like "speed" or event axes... yonder... from the future 
      let axis = config.motionAxes.findIndex(ax => ax == sub.track);
      if(axis < 0) throw new Error(`couldn't find a motion axes for this subscription: ` + JSON.stringify(sub));
      // check that we have this actuator, 
      let actu = config.actuators.findIndex(a => a.name == sub.actuator);
      if(actu < 0) throw new Error(`couldn't find an actuator for this subscription:` + JSON.stringify(sub));
      // check that ... readers match, 
      let reader = config.actuators[actu].tracks.findIndex(t => t.reader == sub.reader);
      if(reader < 0) throw new Error(`couldn't find a track reader for this subscription:` + JSON.stringify(sub));
    }
    // (3) do time setup 
    // get some readings, 
    let count = 10
    let samples = []
    // for <count>, get a ping time per actuator 
    for (let i = 0; i < count; i++) {
      samples.push(await Promise.all(config.actuators.map((actu) => {
        return writeRemoteTime(0, actu.name);
      })))
    }
    // urm, 
    let res = new Array(config.actuators.length).fill(0)
    for (let a = 0; a < res.length; a++) {
      for (let i = 0; i < count; i++) {
        res[a] += samples[i][a];
      }
      // avg, and ms -> seconds 
      res[a] = res[a] / count / 1000;
    }
    // let's reset our clock to zero, 
    writeLocalTime(0);
    // now let's set their clocks... to whence-we-suspect-the-set-packet-will-land, 
    // WARNING: not 100% sure about this promise.all(), if we should return the 
    // result of the async call, or should do i.e. "return await" 
    await Promise.all(config.actuators.map((actu, i) => {
      return writeRemoteTime(getLocalTime() + res[i], actu.name);
    }))
    console.warn(`MAXL setup OK w/ avg RTTs of: `, res)
  }

  // erm, dummy dof 
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
  let QUEUE_LOCAL_MAX_LEN = 64

  // get length from head -> end by traversing linked list 
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

  let transmitSegment = async (segment: ExplicitSegment) => {
    // we'd like to parse out... actuators-configs to tracks... 
    // and we've already checked their viability, so this should be all good? 
    let outputs = [];
    for (let pipe of config.subscriptions) {
      // ... we know the name (pipe.name) of the actuator, 
      // TODO: we should diagram how this multiplexing works when we have 
      // various track types... none of which are done yet ! 
      // we want also to know the motion index we're going to pull:
      let motionIndex = config.motionAxes.indexOf(pipe.track);
      // and the index of the track, within the actuator:
      let actuator = config.actuators.findIndex(actu => actu.name == pipe.actuator);
      let trackIndex = config.actuators[actuator].tracks.findIndex(t => t.reader == pipe.reader);
      // now we can stash this serialized message, 
      outputs.push({
        actuator: pipe.actuator,
        datagram: writeExplicitSegment(segment, motionIndex, trackIndex),
      })
    }
    // then simultaneously stuff 'em each into our buffer, 
    // OSAP will make best effort to deliver each 
    let promises = []
    for (let output of outputs) {
      promises.push(osap.send(output.actuator, "maxlMessages", output.datagram));
    }
    // and resolve them all, 
    await Promise.all(promises);
  }

  // checks whether / not to transmit a segment, and does so 
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
        // and ship that, 
        current.transmitTime = now;
        let timeUntilComplete = Math.ceil((current.explicit.timeEnd - now) * 1000);
        // console.log(`QM: time: ${current.transmitTime.toFixed(3)}, w/ end ${current.explicit.timeEnd.toFixed(3)}, complete in ${timeUntilComplete}ms`);
        console.log(`QM: sending from ${current.explicit.timeStart.toFixed(3)} -> (${(current.explicit.timeTotal).toFixed(3)}s) -> ${current.explicit.timeEnd.toFixed(3)}`);
        // tx this 
        await transmitSegment(current.explicit);
        // and set a timeout to check on queue states when it's done, 
        setTimeout(checkQueueState, timeUntilComplete);
        // ... then do the next, 
      }
    } catch (err) {
      head = null;
      throw err;
    }
  }

  // user-facing segment ingestion 
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
        writeLocalTime(0);
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

  // test path returnal 
  // erp, expose this also ? 
  // also... a library of difficult paths would be rad 
  let tp = []
  for (let reps = 0; reps < 3; reps++) {
    tp = tp.concat(testPath)
  }

  return {
    testPath: tp,
    // config, // maybe don't expose 
    begin,
    halt,
    addSegmentToQueue,
  }

}