/*
synchronizer.js

a "virtual machine" - of course

Jake Read, Leo McElroy and Quentin Bolsee at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2022

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the open systems assembly protocol (OSAP) and modular-things projects.
Copyright is retained and must be preserved. The work is provided as is;
no warranty is provided, and users accept all liability.
*/

/*
const machine = createSynchronizer(
  [motor1, motor2, motor3],
  (targetCoordinates) => { return transformedCoords },
  (motorCoordinates) => { return targetCoordinates }
)

machine.setMaxAccel(accel)
machine.setMaxVelocity(rate)
machine.absolute([x,y,z], rate = last, accel = last)
machine.relative([x,y,z], rate = last, accel = last)
machine.setPosition([x,y,z])
machine.stop()

// my thoughts / modifications:
- am I doing the factory correctly here? I would return an object, rather than the machine.fn everywhere...
- we can do without .setMaxAccel and .setMaxVelocity, those are user-impositions,
  - rather use .absolute and .relative to have (..., rate, accel) arguments
  - and let those args be modal: if they aren't supplied, use the most-recently-used,
- how do we throw / catch errors, since machines call motors ?
  - can we do a higher-level wrap so that we can throw 'em always all the way up to user code ?
- also... .setPosition / etc, is a function of the transform, innit ?
- transforms for *position* are not identical to *velocity* transforms,
  - if the transform is linear, we should be able to just use a delta transform...
  - nonlinear (i.e. angular) transforms leave us fully beached for velocities, etc (?)
- this is complex in surprising ways...
*/

import PK from "../osapjs/core/packets.js"
import { TS, EP } from "../osapjs/core/ts.js"
import testPath from "../../test/pathTest.js"
import TIME from "../osapjs/core/time.js"

// addition...
let vectorAddition = (A, B) => {
  return A.map((a, i) => { return A[i] + B[i] })
}

// distances from a-to-b,
let vectorDeltas = (A, B) => {
  return A.map((a, i) => { return A[i] - B[i] })
}

// between A and B
let distance = (A, B) => {
  let numDof = A.length
  let sum = 0
  for (let a = 0; a < numDof; a++) {
    sum += Math.pow((A[a] - B[a]), 2)
  }
  return Math.sqrt(sum)
}

// from A to B
let unitVector = (A, B) => {
  let numDof = A.length
  let dist = distance(A, B)
  let unit = new Array(numDof)
  for (let a = 0; a < numDof; a++) {
    unit[a] = (B[a] - A[a]) / dist
  }
  return unit
}

let MOTION_MAX_DOF = 7

/*
// a "move" with implicit point-before, and no rate info 
let move = {
  end: <ndov posns>,
  vmax: <rate> 
}

// the properly-constrained, high-level segment 
let seg = {
  p1: <ndof posns>,
  p2: <ndof posns>,
  vi: <vel>,
  accel: <vel>,
  vmax: <vel>,
  vf: <vel>,
}
*/

/*
// the over-constrained, very-explicit, low-level-evaluate-able, segment 
let exSeg = {
  // sequencing
  tStart: <uint microseconds>,
  tEnd: <uint microseconds>,
  isLastSegment: <bool>,
  // position-al 
  start: <ndof posns>,
  unit: <ndof dirns>,
  distance: <num>,
  // velocities, rate
  vi: <vel>,
  accel: <rate>,
  vmax: <vel>,
  vf: <vel>,
  // integrals 
  distAccelPhase: <num>,
  distCruisePhase: <num>,
  // times
  tAccelEnd: <time>,
  tCruiseEnd: <time>
}
*/

let floatToFixed = (flt) => {
  if (isNaN(flt)) { throw new Error(`NaN in floatToFixed`) }
  let fixed = Math.round(flt * (2 ** 17))
  // let float = fixed / (2 ** 17)
  // console.log(flt, fixed, float)
  return fixed
}

let floatToUint32Micros = (flt) => {
  if (isNaN(flt)) { throw new Error(`NaN in floatToUint32Micros`) }
  // seconds to microseconds, 
  let micros = Math.round(flt * 1000000)
  // console.warn(flt, micros)
  return micros
}

export default async function createSynchronizer(actuators) {
  if (!Array.isArray(actuators)) throw new Error(`pls, an array of actuators`)
  // we need the osap instance, can steal it from the actuators, 
  let osap = actuators[0].osap
  console.log(osap)
  // we want to do some plumbing, I think... 
  // yeah: it'll be pretty simple; for each actuator, we should just plumb its seg-complete 
  // pipe back up to some endpoint here... 
  console.warn(`SYNC w/ actuators as `, actuators)
  console.log(actuators[0].vt)

  // we'll plumb ourselves out to 'em 
  let segmentsOut = osap.endpoint(`segmentsOutput`)
  // timewise, also
  let clockSyncOut = osap.endpoint(`clockSyncOut`)
  // and one to get back up to us,
  let segCompleteName = `segmentsComplete_${Math.round((Math.random() * 1000))}`
  let segmentsComplete = osap.endpoint(segCompleteName)
  // and one to pipe halt codes down,
  let haltOut = osap.endpoint(`haltOut`)
  // now we do a little setup... 
  // collect a freshy graph, 
  let graph = await osap.nr.sweep()
  // find our own tail, 
  let completeInVVT = await osap.nr.find(`ep_${segCompleteName}`, graph)
  // for each, add... 
  for (let a in actuators) {
    try {
      // add a route down, 
      let deviceRoute = PK.VC2VMRoute(actuators[a].vt.route)
      console.warn(`adding a route for segments down to ${actuators[a].vt.name}`)
      clockSyncOut.addRoute(PK.route(deviceRoute).sib(3).end())
      segmentsOut.addRoute(PK.route(deviceRoute).sib(4).end())
      haltOut.addRoute(PK.route(deviceRoute).sib(6).end())
      // console.warn(`device route`, deviceRoute)
      // and the same back up, 
      let completeOutVVT = await osap.nr.findWithin("ep_segmentComplete", actuators[a].vt.name, graph) //actuators[a].vt.children[5]
      let connectingRoute = await osap.nr.findRoute(completeOutVVT, completeInVVT)
      connectingRoute.ttl = 3000
      connectingRoute.mode = EP.ROUTEMODE_ACKED//EP.ROUTEMODE_ACKLESS
      connectingRoute.segSize = 256
      // console.warn(`got a route?`, connectingRoute)
      // if an old route exists, rm it,
      try {
        await osap.mvc.removeEndpointRoute(completeOutVVT.route, 0)
      } catch (err) {
        console.warn(`normal err on remove-non-existing route: first-time setup`)
        // console.error(err)
      }
      // implement the route, 
      await osap.mvc.setEndpointRoute(completeOutVVT.route, connectingRoute)
      console.warn(`plumbed segComplete up from ${actuators[a].vt.name}...`)
      // and we set each ID, which is index... 
      actuators[a].settings.actuatorID = parseInt(a)
      // also the axis-pick, use the array posn by default
      actuators[a].settings.axis = parseInt(a)
      await actuators[a].pushSettings()
      // now let's push states to 0,0,0,0 for each, 
      await actuators[a].pushStates({
        pos: new Array(MOTION_MAX_DOF).fill(0),
        unit: new Array(MOTION_MAX_DOF).fill(0),
        vel: 0, 
        accel: 0,
      })
      // we done 
    } catch (err) {
      console.error(`failed to setup actuator ${a} in sync...`)
      throw err
    }
  }

  // at the lowest level we have trapezoids to write... 
  // this writes 'em into a buffer, all fixed-point-ified, 
  let writeExplicitSegment = (exSeg) => {
    let datagram = new Uint8Array(MOTION_MAX_DOF * 4 * 2 + 11 * 4 + 1)
    let wptr = 0
    // sequencing data 
    wptr += TS.write('int32', floatToUint32Micros(exSeg.tStart), datagram, wptr)
    wptr += TS.write('int32', floatToUint32Micros(exSeg.tEnd), datagram, wptr)
    wptr += TS.write('boolean', exSeg.isLastSegment, datagram, wptr)
    // start, dir, 
    for (let a = 0; a < MOTION_MAX_DOF; a++) {
      wptr += TS.write('int32', floatToFixed(exSeg.start[a]), datagram, wptr)
    }
    for (let a = 0; a < MOTION_MAX_DOF; a++) {
      wptr += TS.write('int32', floatToFixed(exSeg.unit[a]), datagram, wptr)
    }
    // size, 
    wptr += TS.write('int32', floatToFixed(exSeg.dist), datagram, wptr)
    // rates, 
    wptr += TS.write('int32', floatToFixed(exSeg.vi), datagram, wptr)
    wptr += TS.write('int32', floatToFixed(exSeg.accel), datagram, wptr)
    wptr += TS.write('int32', floatToFixed(exSeg.vmax), datagram, wptr)
    wptr += TS.write('int32', floatToFixed(exSeg.vf), datagram, wptr)
    // integrals, 
    wptr += TS.write('int32', floatToFixed(exSeg.distAccelPhase), datagram, wptr)
    wptr += TS.write('int32', floatToFixed(exSeg.distCruisePhase), datagram, wptr)
    // trapezoid times 
    wptr += TS.write('int32', floatToFixed(exSeg.tAccelEnd), datagram, wptr)
    wptr += TS.write('int32', floatToFixed(exSeg.tCruiseEnd), datagram, wptr)
    // that's it, 
    return datagram
  }

  // we write segments... from a more properly constrained set of info, 
  // takes vi, vf, vmax, accel, p1, p2, and writes exSeg, 
  let calculateExplicitSegment = (seg) => {
    // we're buildingout this object, from that... 
    let exSeg = {
      // sequencing info
      tStart: seg.startTime,                      // tbd
      tEnd: 0,                                    // tbd
      isLastSegment: false,                       // sequencing, 
      // geo-metric info
      start: JSON.parse(JSON.stringify(seg.p1)),  // copypasta this, just-in-case,  
      unit: unitVector(seg.p1, seg.p2),           // unit vector 
      dist: distance(seg.p1, seg.p2),             // distance 
      // rates
      vi: seg.vi,                                 // already available
      accel: seg.accel,                            // already available
      vmax: seg.vmax,                             // already available
      vf: seg.vf,                                 // already available
      // integrals, 
      distAccelPhase: 0,
      distCruisePhase: 0,
      // times 
      tAccelEnd: 0,
      tCruiseEnd: 0,
      time: 0,                                    // in real-seconds, 
    }
    // now we can look at what our max entry (given exit) and max exit (given entry) are, 
    let maxVi = Math.sqrt(seg.vi * seg.vi + 2 * seg.accel * exSeg.dist)
    let maxVf = Math.sqrt(seg.vf * seg.vf + 2 * seg.accel * exSeg.dist)
    // since we are with-big-cpu, we could do ~ handfuls of maths up front ? i.e. phase lengths... 
    // and we can do some trapezoid binning... 
    if (maxVf <= seg.vf) {
      // seg is `//`
      console.log(`seg: // ${exSeg.unit[0].toFixed(2)}`)
      console.error(JSON.parse(JSON.stringify(seg)))
      exSeg.distAccelPhase = seg.dist
      exSeg.distCruisePhase = 0
      // d = v * t 
      // d / t = v 
      // d / v = t 
      // d = ((vi + vf) / 2) * t
      // t = d / ((vi + vf) / 2)
      exSeg.tAccelEnd = exSeg.dist / (0.5 * (exSeg.vi + exSeg.vf))
      exSeg.tCruiseEnd = exSeg.tAccelEnd
      exSeg.time = exSeg.tAccelEnd
    } else if (maxVi <= seg.vi) {
      // seg is `\\` 
      console.log(`seg: \\\\ ${exSeg.unit[0].toFixed(2)}`)
      exSeg.distAccelPhase = 0
      exSeg.distCruisePhase = 0
      exSeg.tAccelEnd = 0
      exSeg.tCruiseEnd = 0
      // t = d / ((vi + vf) / 2)
      exSeg.time = exSeg.dist / (0.5 * (exSeg.vi + exSeg.vf))
    } else if (seg.vi == seg.vmax && seg.vmax == seg.vf) {
      // seg is `---`
      console.log(`seg: --- ${exSeg.unit[0].toFixed(2)}`)
      exSeg.distAccelPhase = 0
      exSeg.distCruisePhase = exSeg.dist
      exSeg.tAccelEnd = 0
      // t = d / v 
      exSeg.time = exSeg.dist / exSeg.vmax
      exSeg.tCruiseEnd = exSeg.time
    } else if (seg.vi == seg.vmax) {
      // seg is `---\\`
      console.log(`seg: ---\\\\ ${exSeg.unit[0].toFixed(2)}`)
      // vf^2 = vi^2 + 2ad 
      // d = (vf^2 - vi^2) / (2a)
      let decelDist = (seg.vmax * seg.vmax - seg.vf * seg.vf) / (2 * seg.accel)
      let decelTime = decelDist / (0.5 * (exSeg.vmax + exSeg.vf))
      exSeg.distAccelPhase = 0
      exSeg.distCruisePhase = exSeg.dist - decelDist
      exSeg.tAccelEnd = 0
      exSeg.tCruiseEnd = exSeg.distCruisePhase / exSeg.vmax
      exSeg.time = exSeg.tCruiseEnd + decelTime
    } else if (seg.vf == seg.vmax) {
      // seg is `//---`
      console.log(`seg: //--\\\\ ${exSeg.unit[0].toFixed(2)}`)
      exSeg.distAccelPhase = (seg.vmax * seg.vmax - seg.vi * seg.vi) / (2 * seg.accel)
      exSeg.distCruisePhase = exSeg.dist - exSeg.distAccelPhase
      exSeg.tAccelEnd = exSeg.distAccelPhase / (0.5 * (exSeg.vmax + exSeg.vi))
      exSeg.time = exSeg.tAccelEnd + exSeg.distCruisePhase / exSeg.vmax
      exSeg.tCruiseEnd = exSeg.time
    } else {
      // seg is either `//\\` or `//---\\`
      let accelDist = (seg.vmax * seg.vmax - seg.vi * seg.vi) / (2 * seg.accel)
      let decelDist = (seg.vmax * seg.vmax - seg.vf * seg.vf) / (2 * seg.accel)
      if (accelDist + decelDist >= exSeg.dist) {
        // seg is `//\\`
        console.log(`seg: //\\\\ ${exSeg.unit[0].toFixed(2)}`)
        // we need to figure when in time / or dist / the crossover happens, 
        // we know velocities at the peak are equal, 
        // vpeak^2 = vi^2 + 2ad_accel
        // vpeak^2 = vf^2 + 2ad_decel 
        //
        // and that these two distance add up... 
        // d = d_accel + d_decel 
        // 
        // so we can do the equality and pull out the d's
        // vi^2 + 2ad_accel = vf^2 + 2ad_decel
        // vi^2 - vf^2 = 2ad_decel - 2ad_accel 
        // (vi^2 - vf^2)/(2ad) = d_decel - d_accel 
        //
        // then sub in the distance-sum and pull out one of the distances: 
        // vi^2 + 2ad_accel = vf^2 + 2a(d-d_accel)
        // vi^2 - vf^2 = 2a(d-d_accel) - 2ad_accel
        // vi^2 - vf^2 = 2a(d-d_accel-d_accel)
        // (vi^2 - vf^2)/(2a) = d-2d_accel
        // (((vi^2 - vf^2)/(2a)) - d)/(-2) = d_accel
        // 
        // AFAIK this works, tbd: 
        exSeg.distAccelPhase = (((exSeg.vi * exSeg.vi - exSeg.vf * exSeg.vf) / (2 * exSeg.accel)) - exSeg.dist) / (-2)
        exSeg.distCruisePhase = 0
        // need that peak velocity, 
        // vf^2 = vi^2 + 2ad
        let vPeak = Math.sqrt(exSeg.vi * exSeg.vi + 2 * exSeg.accel * exSeg.distAccelPhase)
        // console.warn(`vPeak ${vPeak.toFixed(3)}`)
        exSeg.vmax = vPeak
        // vf = vi + at 
        // (vf - vi) / a = t
        exSeg.tAccelEnd = (vPeak - exSeg.vi) / exSeg.accel
        exSeg.tCruiseEnd = exSeg.tAccelEnd
        exSeg.time = exSeg.tAccelEnd + (vPeak - exSeg.vf) / exSeg.accel
        // that's it, innit ? 
      } else {
        // seg is `//---\\`
        console.log(`seg: //--\\\\ ${exSeg.unit[0].toFixed(2)}`)
        exSeg.distAccelPhase = accelDist
        exSeg.distCruisePhase = exSeg.dist - accelDist - decelDist
        exSeg.tAccelEnd = accelDist / (0.5 * (exSeg.vmax + exSeg.vi))
        exSeg.tCruiseEnd = exSeg.tAccelEnd + exSeg.distCruisePhase / exSeg.vmax
        exSeg.time = exSeg.tCruiseEnd + decelDist / (0.5 * (exSeg.vmax + exSeg.vf))
      }
    }
    exSeg.tEnd = exSeg.tStart + exSeg.time
    // console.warn(exSeg.tEnd - exSeg.tStart, exSeg.tStart, exSeg.tEnd)
    return exSeg
  } // end calculateExplicitSegment 

  let queueHeadPosition = new Array(MOTION_MAX_DOF).fill(0)

  // -------------------------------------------- queue management 
  // of... segments, not the explicit type 
  let queue = []
  let QUEUE_START_DELAY = 250
  let QUEUE_STATE_EMPTY = 0
  let QUEUE_STATE_AWAITING_START = 1
  let QUEUE_STATE_RUNNING = 2
  let QUEUE_REMOTE_MAX_LEN = 16
  let QUEUE_LOCAL_MAX_LEN = 32
  let queueState = QUEUE_STATE_EMPTY

  segmentsComplete.onData = (data) => {
    let actuatorID = TS.read('uint8', data, 0)
    let segStartTime = TS.read('uint32', data, 1)
    // console.warn(`RX'd ${actuatorID} for ${segStartTime}...`)
    // find in our queue... 
    let found = false 
    outer: for (let s = 0; s < queue.length; s++) {
      if (queue[s].micros == segStartTime) {
        queue[s].segCompleteRXTime[actuatorID] = TIME.getTimeStamp()
        for (let a = 0; a < queue[s].segCompleteRXTime.length; a++) {
          if (queue[s].segCompleteRXTime[a] == 0) {
            // console.log(`QM: at least id ${a} still remaining w/o rx'd seg for ${segStartTime}`)
            break outer;
          } 
        }
        queue.splice(s, 1)
        found = true 
        break outer;
      }
    }
    if(found) console.log(`QM: cleared ${segStartTime}, queue has len ${queue.length}`)
    if(queue.length == 0){
      queueState = QUEUE_STATE_EMPTY
    }
    // throw new Error(`rx'd some data here, pls write handler!`, actuatorID, segStartTime)
    checkQueueState()
  }

  let checkQueueState = async () => {
    try {
      switch (queueState) {
        case QUEUE_STATE_EMPTY:
          if (queue.length > 0) {
            queueState = QUEUE_STATE_AWAITING_START
            setTimeout(async () => {
              try {
                // on queue startup... we want to reset the remote clocks to zero... 
                let datagram = new Uint8Array(4)
                TS.write('uint32', 0, datagram, 0)
                await clockSyncOut.write(datagram)
                // now we can correct our queue times accordingly... 
                // the first will start here... 
                // and its end time will be calculated when the next is tx'd, 
                console.log(`queue...`, JSON.parse(JSON.stringify(queue)))
                queue[0].startTime = 0.050 // seconds! from now ? 
                // and then... re-write times in our queue (?) 
                queueState = QUEUE_STATE_RUNNING
                checkQueueState()
              } catch (err) {
                console.error(err)
              }
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
              queue[s].transmitTime = TIME.getTimeStamp()
              // let's check about start times, 
              if (!queue[s].startTime) {
                // no info, can we find last?
                if (!queue[s - 1]) throw new Error(`queue'en badness: no start time, no prev.`)
                // else can do, 
                queue[s].startTime = queue[s - 1].endTime
              }
              let exSeg = calculateExplicitSegment(queue[s])
              // now we have time info & can do... 
              queue[s].endTime = queue[s].startTime + exSeg.time
              // and track-la, to de-pop, 
              queue[s].micros = Math.round(queue[s].startTime * 1000000)
              console.log(`QM: sending ${queue[s].micros} ... ${(queue[s].endTime - queue[s].startTime).toFixed(3)}s: ${queue[s].startTime.toFixed(3)} -> ${queue[s].endTime.toFixed(3)}`)
              let datagram = writeExplicitSegment(exSeg)
              console.warn(`TX queue ${s} w/ seg time ${exSeg.time}`)
              await segmentsOut.write(datagram)
            }
          }
          break;
      }
    } catch (err) {
      throw err
    }
  }


  let addMoveToQueue = (move) => {
    return new Promise((resolve, reject) => {
      console.warn(`addMove`, JSON.parse(JSON.stringify(move)))
      // make end-pos full dof, 
      let p2 = queueHeadPosition.map((val, a) => {
        if (move.end[a] == undefined || isNaN(move.end[a])) {
          return val
        } else {
          return move.end[a]
        }
      })
      console.warn(`QueueHeadPosition ${queueHeadPosition[0].toFixed(2)}, ${queueHeadPosition[1].toFixed(2)}`)
      console.warn(`P2 ${p2[0].toFixed(2)}, ${p2[1].toFixed(2)}`)
      console.warn(`DIST`, distance(p2, queueHeadPosition))
      // if distance is very small, rm it, 
      if(distance(p2, queueHeadPosition) < 0.1){
        console.warn(`REJECTING very tiny move, ${distance(p2, queueHeadPosition).toFixed(3)}...`)
        resolve()
        return 
      }
      // ??
      console.log(`ingesting move to`, p2)
      // if no accel / vmax provided, in-fill, 
      if (!move.accel) move.accel = 1000;
      if (!move.vmax) move.vmax = 100;
      // invent a linking speed, 
      let vlink = Math.min(move.vmax * 0.25, 10)
      // report it.. 
      console.log(`using vlink ${vlink} with vmax ${move.vmax}`)
      // we're just going to write 'em unlinked, 
      let seg = {
        p1: JSON.parse(JSON.stringify(queueHeadPosition)),
        p2: p2,
        vi: vlink, //move.vmax * 0.25,
        accel: Math.abs(move.accel), // units/sec/sec 
        vmax: move.vmax,
        vf: vlink, //move.vmax * 0.25
        transmitTime: 0,  // queue'en ute
        startTime: 0,     // when to begin executing... 
        segCompleteRXTime: new Array(actuators.length).fill(0)
      }
      // upd8 this ... 
      queueHeadPosition = JSON.parse(JSON.stringify(seg.p2))
      // looping queue-clear'en fn 
      // could instead do on-queue-state-upd8, run 
      // some callback into here, or ~ some other structures, 
      // this is lazy for now 
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

  let awaitMotionEnd = () => {
    return new Promise((resolve, reject) => {
      let checkEnd = () => {
        if(queueState == QUEUE_STATE_EMPTY){
          resolve()
        } else {
          setTimeout(checkEnd, 50)
        }
      }
      checkEnd()
    })
  }

  // halt ! 
  let halt = async () => {
    try {
      await haltOut.write(new Uint8Array([0]))
      // we also need to... remove our own queue, 
      queue = [] 
      // should be it then, more-fancier-halting-codes to come... 
      queueState = QUEUE_STATE_EMPTY
    } catch (err) {
      throw err
    }
  }

  // set posns, 
  let setPosition = async (pos) => {
    try {
      // TODO: guard against ~ is-moving-or-not 
      console.warn(`SHOULD DO a guard here for not-moving-ness...`)
      // infill 7-dof w/ not-provided dof, 
      let posns = queueHeadPosition.map((val, a) => {
        if (pos[a] == undefined || isNaN(pos[a])) {
          return val
        } else {
          return pos[a]
        }
      })
      // unit vec, vel, accel are zeroes, 
      let state = {
        pos: posns,
        unit: new Array(posns.length).fill(0),
        vel: 0,
        accel: 0
      }
      // push it out to each, 
      for (let a in actuators) {
        await actuators[a].pushStates(state)
      }
      // and don't forget ourselves ! 
      queueHeadPosition = posns 
    } catch (err) {
      throw err
    }
  }

  // goto this absolute actuator-position
  // let absolute = async (pos, vel, accel) => {
  //   try {
  //     // modal vel-and-accels,
  //     vel ? lastVel = vel : vel = lastVel;
  //     accel ? lastAccel = accel : accel = lastAccel;
  //     // if we don't know the lastest machine position, grab it...
  //     if (!lastAbsolute) lastAbsolute = await getPosition()
  //     // where we're going...
  //     let nextAbsolute = pos
  //     // we're also going to need to know about each motor's abs-max velocities:
  //     let absMaxVelocities = actuators.map(actu => actu.getAbsMaxVelocity())
  //     let absMaxAccels = actuators.map(actu => actu.getAbsMaxAccel())
  //     // and a unit vector... I know this should be explicit unitize-an-existing-vector, alas,
  //     let unit = unitVector(lastAbsolute, nextAbsolute)
  //     // these are our candidate vels & accels for the move,
  //     let velocities = unit.map((u, i) => { return Math.abs(unit[i] * vel) })
  //     let accels = unit.map((u, i) => { return Math.abs(unit[i] * accel) })
  //     // but some vels or accels might be too large, check thru and assign the biggest-squish to everything,
  //     let scaleFactor = 1.0
  //     for (let a in actuators) {
  //       if (velocities[a] > absMaxVelocities[a]) {
  //         let candidateScale = absMaxVelocities[a] / velocities[a]
  //         if (candidateScale < scaleFactor) scaleFactor = candidateScale;
  //       }
  //       if (accels[a] > absMaxAccels[a]) {
  //         let candidateScale = absMaxAccels[a] / accels[a]
  //         if (candidateScale < scaleFactor) scaleFactor = candidateScale;
  //       }
  //     }
  //     // apply that factor to *both* vels and accels,
  //     velocities = velocities.map(v => v * scaleFactor)
  //     accels = accels.map(a => a * scaleFactor)
  //     // ok, sheesh, I think we can write 'em, do this with promise.all so that
  //     // each message dispatches ~ at the same time, thusly arriving ~ at the same time, to get-sync'd
  //     await Promise.all(actuators.map((actu, i) => {
  //       return actu.absolute(nextAbsolute[i], velocities[i], accels[i])
  //     }))
  //     // motors each await-motion-end, when we await-all .absolute, so by this point we have made the move... can do
  //     lastAbsolute = pos
  //   } catch (err) {
  //     console.error(err)
  //   }
  // }

  let tp = []
  for (let reps = 0; reps < 6; reps++) {
    tp = tp.concat(testPath)
  }

  return {
    // scud 
    testPath: tp,
    // listicle,
    actuators,
    // add to front 
    addMoveToQueue,
    halt,
    // set, 
    setPosition,
    // operate w/
    // target,
    // absolute,
    // relative,
    // velocity,
    // stop,
    awaitMotionEnd,
    // setters
    // setPosition,
    // setVelocity,
    // setAccel,
    // getters,
    // getPosition,
    // getVelocity,
  }
}