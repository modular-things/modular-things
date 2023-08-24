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

import testPaths from "./maxl-test-paths"

import {
  distance,
  unitVector,
  // floatToFixed, 
  floatToUint32Micros, 
  writeExplicitSegment,
  transformExplicitSegment, 
  calculateExplicitSegment,
  getStatesInExplicitSegment
} from "./maxl-utes"

import {
  PlannedSegment,
  MAXL_KEYS,
  ExplicitSegment,
  TransformFunction,
} from "./maxl-types"

let MOTION_MAX_DOF = 7

// altho perhaps we should just encode lines on the v-t plot, also ? simpler ? 
// that would be... 

type MaxlSubscription = {
  device: string,
  track: string,
  listener: string,
}

type MaxlTrackInfo = {
  type: string,
  listener: string
}

type MaxldeviceInfo = {
  name: string,
  tracks: Array<MaxlTrackInfo>,
}

type MaxlConfig = {
  motionAxes: Array<string>,              // set
  subscriptions: Array<MaxlSubscription>, // set
  devices?: Array<MaxldeviceInfo>,    // discovered / matched 
  auxiliaryDevices?: Array<string>,
  transformedAxes?: Array<string>,
  transformForwards?: TransformFunction,
  transformBackwards?: TransformFunction, 
}

export default function createMAXL(config: MaxlConfig) {

  // -------------------------------------------- we'll get a time-base going on each startup, 

  let maxlLocalClockOffset = 0;

  // return a local timestamp in seconds 
  let getLocalTime = () => {
    // console.log(`offset is`, maxlLocalClockOffset, 'stamp at', Time.getTimeStamp())
    return (Time.getTimeStamp() + maxlLocalClockOffset) / 1000;
  }

  // sets our local clock, 
  let writeLocalTime = (time: number) => {
    maxlLocalClockOffset = time - Time.getTimeStamp();
  }

  // writes a new time out to a string-id'd device 
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
    // (0) cancel all of our timers
    for (let timer of timers) {
      console.warn(`clearing...`, timer);
      clearTimeout(timer);
    }
    timers = [];
    // shut each of our devices down, this is the hard stop: 
    await Promise.all(config.devices.map(actu => {
      return osap.send(actu.name, "maxlMessages", new Uint8Array([MAXL_KEYS.MSG_HALT]))
    }))
    // and reset / wipe our own state, 
    queue.length = 0;
    head = null;
    tail = null;
  }

  let begin = async () => {
    // if ! transforms in config, supply an empty dummy 
    if(!config.transformedAxes) config.transformedAxes; 
    // (1) gather info about our remotes so that we can build subs 
    config.devices = [];
    let deviceNames: Set<string> = new Set();
    config.subscriptions.forEach(sub => deviceNames.add(sub.device));
    // and add aux devices here... 
    if (config.auxiliaryDevices) config.auxiliaryDevices.forEach(dev => deviceNames.add(dev));
    console.log(`we have actu`, deviceNames)
    // ... flesh 'em out, 
    for (let actu of deviceNames) {
      let res = await osap.send(actu, "maxlMessages", new Uint8Array([MAXL_KEYS.MSG_GETINFO_REQ]));
      let numTracks = res[0];
      let tracks = [];
      let offset = 1;
      for (let t = 0; t < numTracks; t++) {
        let type = keyToString(res[offset], MAXL_KEYS);
        let listener = Serializers.readString(res, offset + 1);
        offset += listener.length + 2;
        tracks.push({ type, listener });
      }
      config.devices.push({
        name: actu,
        tracks: tracks
      })
    }
    // heres's our config now:
    console.warn(`after setup, this MAXL has config: `, config)
    // and we can halt 'em out in case we are restarting mid-strem, 
    await halt();
    // (2) now let's check that our subscriptions make sense, yeah ? 
    for (let sub of config.subscriptions) {
      // check that we have this motion axes,
      // *or* that some other exists, like "speed" or event axes... yonder... from the future 
      let axis = (config.motionAxes.concat(config.transformedAxes)).findIndex(ax => ax == sub.track);
      if (axis < 0) throw new Error(`couldn't find a motion axes for this subscription: ` + JSON.stringify(sub));
      // check that we have this device, 
      let actu = config.devices.findIndex(a => a.name == sub.device);
      if (actu < 0) throw new Error(`couldn't find an device for this subscription:` + JSON.stringify(sub));
      // check that ... listeners match, 
      let listener = config.devices[actu].tracks.findIndex(t => t.listener == sub.listener);
      if (listener < 0) throw new Error(`couldn't find a track listener for this subscription:` + JSON.stringify(sub));
    }
    // (3) do time setup 
    // get some readings, 
    let count = 10
    let samples = []
    // for <count>, get a ping time per device 
    for (let i = 0; i < count; i++) {
      samples.push(await Promise.all(config.devices.map((actu) => {
        return writeRemoteTime(0, actu.name);
      })))
    }
    // urm, 
    let res = new Array(config.devices.length).fill(0)
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
    await Promise.all(config.devices.map((actu, i) => {
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

  let QUEUE_START_DELAY = 0.500   // in seconds 
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
    // we'd like to parse out... devices-configs to tracks... 
    // and we've already checked their viability, so this should be all good? 
    let outputs = [];
    for (let pipe of config.subscriptions) {
      // we collect the device and the listener (== track) ... 
      let device = config.devices.findIndex(actu => actu.name == pipe.device);
      let trackIndex = config.devices[device].tracks.findIndex(t => t.listener == pipe.listener);
      // it's via-the transform, or it aint, 
      // we want also to know the motion index we're going to pull:
      let motionIndex = config.motionAxes.indexOf(pipe.track);
      // or it's a transformed axis ? 
      let transformedIndex = config.transformedAxes.indexOf(pipe.track);
      // but it should only be one, eh ? 
      if(motionIndex > -1){
        // now we can stash this serialized message, 
        outputs.push({
          device: pipe.device,
          datagram: writeExplicitSegment(segment, motionIndex, trackIndex),
        })
      } else if (transformedIndex > -1){
        // we need to tf the seggo first, innit ?
        // console.log(segment)
        let transformedSegment = transformExplicitSegment(segment, config.transformForwards)
        // now pick that... per transformed index, 
        outputs.push({
          device: pipe.device, 
          datagram: writeExplicitSegment(transformedSegment, transformedIndex, trackIndex),
        })
      }
    }
    // then simultaneously stuff 'em each into our buffer, 
    // OSAP will make best effort to deliver each 
    let promises = []
    for (let output of outputs) {
      promises.push(osap.send(output.device, "maxlMessages", output.datagram));
    }
    // and resolve them all, 
    await Promise.all(promises);
  }

  // we track these, so that we can cancel them... 
  let timers = []

  // and... hurm... 
  // let history = []

  let getStatesInSegment = (time: number, seg: PlannedSegment) => {
    // console.log(`would pop for ${seg.explicit.timeStart}`)
    return getStatesInExplicitSegment(time, seg.explicit);
  }

  // then let's see if we can pull samples at some given time...
  // time in.. seconds ? 
  let getStatesAtTime = (time: number) => {
    // seg is either in-history or in-current, 
    // tho... history not needed, we have infinite queue 
    // check in-history, 
    // if (history.length != 0) {
    //   if (time < history[0].explicit.timeStart && time < history[history.length - 1].timeEnd) {
    //     for (let seg of history) {
    //       if (seg.explicit.timeStart < time && time < seg.explicit.timeEnd) {
    //         console.warn(`would pop historical seg`, seg)
    //         return getStatesInSegment(time, seg);
    //       }
    //     }
    //   }
    // }
    // queue is eternal, innit ?
    for (let seg of queue) {
      if (!seg.explicit) continue;
      if (seg.explicit.timeStart < time && time < seg.explicit.timeEnd) {
        return getStatesInSegment(time, seg);
      }
    }
    // else 
    return ({ accel: 0 })
  }

  // checks whether / not to transmit a segment, and does so 
  let checkQueueState = async () => {
    try {
      // bail if no head... 
      if (!head) {
        console.warn(`queue state bails on headlessness`)
        return;
      }
      // or if no explicit at the head ?
      if (!head.explicit) {
        console.warn(`no explicit here...`, head)
        return;
      }
      // ... 
      let now = getLocalTime();
      // 1st let's check that head is in the correct place, 
      while (head.explicit.timeEnd < now) {
        // console.warn(`WALK FWDS to ${head.explicit.timeEnd}`)
        head = head.next;
        // head.next can be undefined also, 
        if(!head) {
          console.warn(`bail on headless advance...`);
          return;
        }
      }
      // ok, supposing we have a well formed (and tx'd) head, 
      // which is the current segment, then we want to do:
      let current = head;
      // then roll thru the queue, 
      for (let s = 0; s < QUEUE_REMOTE_MAX_LEN; s++) {
        // if it's empty, bail, 
        if (!current) {
          console.warn(`eof, bail`);
          return;
        }
        // console.log(`W / HEAD ${head.transmitTime}, CUR ${current.transmitTime}`)
        // if it's been tx'd, carry on:
        if (current.transmitTime != 0) {
          current = current.next;
          continue;
        }
        // otherwise calculate explicit, unless we already have it ?
        if (!current.explicit) current.explicit = calculateExplicitSegment(current, current.prev.explicit.timeEnd);
        // and ship that, 
        current.transmitTime = now;
        let timeUntilComplete = Math.ceil((current.explicit.timeEnd - now) * 1000);
        // console.log(`QM: time: ${current.transmitTime.toFixed(3)}, w/ end ${current.explicit.timeEnd.toFixed(3)}, complete in ${timeUntilComplete}ms`);
        console.log(`QM: sending from ${current.explicit.timeStart.toFixed(3)} -> (${(current.explicit.timeTotal).toFixed(3)}s) -> ${current.explicit.timeEnd.toFixed(3)}`);
        // tx this 
        await transmitSegment(current.explicit);
        // and those... 
        // TODO: we should be able to do each maxl track-type as a separate ts file, 
        // instead of this chaos 
        // also bringing decent types into this world... 
        if (current.eventObject) {
          // so, let's get a little evaluator functo in here ? 
          let start = Time.getTimeStamp();
          // and start a datagram, 
          let datagram = new Uint8Array(4096);
          let wptr = 1; // we'll start writing at this posn, 
          let numEvents = 1;
          // start with 0, at time zero, 
          wptr += Serializers.writeUint32(datagram, wptr, 0);
          wptr += Serializers.writeUint8(datagram, wptr, 0);
          let lastMask = 0;
          // ok ok 
          for(let t = current.explicit.timeStart; t < current.explicit.timeEnd; t += current.eventObject.evaluationPrecision / 1000){
            // ok ok... 
            let states = getStatesInExplicitSegment(t, current.explicit);
            // and use that... to eval w/ the func... 
            let mask = current.eventObject.evaluationFunction(states);
            if(mask != lastMask){
              lastMask = mask;
              let interSegTime = Math.ceil((t - current.explicit.timeStart) * 1000000);
              // console.warn(`IST`, t, current.explicit.timeStart, interSegTime);
              wptr += Serializers.writeUint32(datagram, wptr, interSegTime);
              wptr += Serializers.writeUint8(datagram, wptr, mask);
              numEvents ++;
            }
            // console.warn(`time... ${t.toFixed(2)} d: \t ${states.dist.toFixed(2)}, ${mask}`);
            // ok, let's do edge-detect and then stuffage ? 
            // this wuz some debug 
            // if(states.accel == 0){
            //   let binaryStr = mask.toString(2).padStart(8, '0');
            //   console.log(binaryStr);  
            // }
            // then we could use that... in a step-function manner, to author the event track ? 
            // so, finish eval, then write tracks 
          }
          // last buffer event for time-stamp reading / to turn off 
          // NOT CODE TO KEEP, FIX IIIIT 
          wptr += Serializers.writeUint32(datagram, wptr, Math.ceil((current.explicit.timeEnd - current.explicit.timeStart) * 1000000));
          wptr += Serializers.writeUint8(datagram, wptr, 0);
          numEvents ++;
          // now record final info,
          datagram[0] = numEvents;  // count of events, 
          // and truncate,
          // ok, here's our 
          datagram = datagram.slice(0, wptr);
          console.warn(datagram);
          // ... shit broh, we need this also:
          let header = new Uint8Array(4 * 2 + 4 + datagram.length);
          wptr = 0;
          wptr += Serializers.writeUint8(header, wptr, MAXL_KEYS.MSG_TRACK_ADDSEGMENT);
          // track index, of which we know (for this demo!) that lights will be 0 on that mcu... 
          wptr += Serializers.writeUint8(header, wptr, 0);
          wptr += Serializers.writeUint8(header, wptr, MAXL_KEYS.TRACKTYPE_EVENT_8BIT);
          // times, 
          wptr += Serializers.writeInt32(header, wptr, floatToUint32Micros(current.explicit.timeStart));  
          wptr += Serializers.writeInt32(header, wptr, floatToUint32Micros(current.explicit.timeEnd));
          // this is where we set "isLastSegment" flag, which we are (for now) not using; 
          header[wptr] = 0;
          // and to combine, 
          header.set(datagram, 12);
          // console.warn(floatToUint32Micros(current.explicit.timeEnd));
          // console.warn(header);
          console.warn(`EVT EVAL TOOK ${(Time.getTimeStamp() - start).toFixed(3)} ms`)
          // and believe it or not, we are going to bypass all of the routing shit also,
          if(current.eventObject.sendy){
            console.warn(`SENDY gram w/ len ${header.length}, evts: ${numEvents}`)
            await osap.send("pixOutput", "maxlMessages", header);
          }
        } // END SKETCHY EVENTOBJECT CODE ! 
        // and set a timeout to check on queue states when it's done, 
        timers.push(setTimeout(checkQueueState, timeUntilComplete));
        // ... then do the next, 
        // get next ahead, 
        current = current.next;
      }
    } catch (err) {
      head = null;
      throw err;
    }
  }

  // user-facing segment ingestion 
  let addSegmentToQueue = (move) => {
    return new Promise<void>(async (resolve, reject) => {
      // should have move.endPos, move.velocity, move.junction, 
      let end = move.endPos;
      let vmax = move.velocity;
      let vlink = move.junction;
      // first, no action until we have space:
      await awaitQueueSpace();
      // first, we are tacking this move on the end of a previous segments' end-point, 
      // so let's in-fill any missing DOF, also re-writing `end` arg as `p2` seg property 
      let p1 = new Array(defaultDOF).fill(0);
      if (tail) {
        p1 = tail.p2;
      }
      // infill w/ spare DOF 
      let p2 = p1.map((val, a) => {
        if (end[a] == undefined || isNaN(end[a])) {
          return val;
        } else {
          return end[a];
        }
      })
      // evidently this was worth double checking 
      console.warn(`P1: ${p1[0].toFixed(2)}, ${p1[1].toFixed(2)}; P2: ${p2[0].toFixed(2)}, ${p2[1].toFixed(2)}, DIST ${distance(p2, p1).toFixed(2)}`);
      // if distance is very small, rm it, 
      if (distance(p2, p1) < 0.1) {
        console.warn(`REJECTING very tiny move, ${distance(p2, p1).toFixed(3)}...`);
        resolve();
        return;
      }
      // so we maybe don't have use for the unplanned type, 
      let seg: PlannedSegment = {
        p1: p1,
        p2: p2,
        vmax: vmax,
        accel: 1000,
        vi: vlink,
        vf: vlink,
        transmitTime: 0,
      }
      // tack this on, lol, 
      // we're going back to unformed spaghetti-type js for the crash stop, 
      // sorry future jake! 
      if (move.eventObject) seg.eventObject = move.eventObject;
      // do the list linking, 
      if (tail) {
        tail.next = seg;
        seg.prev = tail;
      }
      // always 
      tail = seg;
      // and check...
      if (!head) {
        console.warn(`CALC NEW HEAD at ${getLocalTime()}`)
        head = seg;
        head.explicit = calculateExplicitSegment(seg, getLocalTime() + QUEUE_START_DELAY);
      }
      // then ingest 
      queue.push(seg);
      checkQueueState();
      resolve();
    })
  }

  let awaitQueueSpace = async () => {
    return new Promise<void>((resolve, reject) => {
      let check = () => {
        if (getLocalLookaheadLength() < QUEUE_LOCAL_MAX_LEN) {
          resolve()
        } else {
          setTimeout(check, 1)
        }
      }
      check();
    })
  }

  let awaitMotionEnd = async () => {
    return new Promise<void>((resolve, reject) => {
      let check = () => {
        if (!head) {
          resolve()
        } else {
          setTimeout(check, 10)
        }
      } //
      check()
    })
  }

  return {
    testPaths,
    begin,
    halt,
    addSegmentToQueue,
    awaitMotionEnd,
    getStatesAtTime,
  }

}