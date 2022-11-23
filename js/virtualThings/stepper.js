/*
stepper.js

a "virtual thing" - of course 

Jake Read, Leo McElroy and Quentin Bolsee at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2022

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the open systems assembly protocol (OSAP) and modular-things projects.
Copyright is retained and must be preserved. The work is provided as is;
no warranty is provided, and users accept all liability.
*/

import PK from "../osapjs/core/packets.js"
import { TS } from "../osapjs/core/ts.js"

export default function stepper(osap, vt, name) {
  // erp 
  let routeToFirmware = PK.VC2VMRoute(vt.route)
  // here we basically write a "mirror" endpoint for each downstream thing, 
  // -------------------------------------------- 1: target data 
  let targetDataEndpoint = osap.endpoint(`targetDataMirror_${name}`)
  targetDataEndpoint.addRoute(PK.route(routeToFirmware).sib(1).end())
  // -------------------------------------------- 2: motion state is a query object:
  let motionStateQuery = osap.query(PK.route(routeToFirmware).sib(2).end())
  // -------------------------------------------- 3: set current position 
  let positionSetEndpoint = osap.endpoint(`setPositionMirror_${name}`)
  positionSetEndpoint.addRoute(PK.route(routeToFirmware).sib(3).end())
  // -------------------------------------------- 4: settings, 
  let settingsEndpoint = osap.endpoint(`settingsMirror_${name}`)
  settingsEndpoint.addRoute(PK.route(routeToFirmware).sib(4).end())
  // -------------------------------------------- 5: a button, not yet programmed 

  // -------------------------------------------- we need a setup, 
  const setup = async () => {
    // erp, but this firmware actually is all direct-write, nothing streams back 
  }

  // -------------------------------------------- we have some state... ?? 
  let spu = 20
  let absMaxVelocity = 4000 / 20
  let lastVel = absMaxVelocity
  let lastAccel = 100             // units / sec 

  // tell me about your steps-per-unit, 
  // note that FW currently does 1/4 stepping: 800 steps / revolution 
  let setSPU = (_spu) => {
    spu = _spu
    absMaxVelocity = 4000 / spu
    // we know that we have a maximum steps-per-second of 4000, so we can say 
    console.warn(`w/ spu of ${spu}, this ${name} has a new abs-max velocity ${absMaxVelocity}`)
  }

  // get states
  let getState = async () => {
    try {
      let data = await motionStateQuery.pull()
      return {
        pos: TS.read("float32", data, 0),
        vel: TS.read("float32", data, 4),
        accel: TS.read("float32", data, 8),
      }
      // deserialize... 
    } catch (err) {
      console.error(err)
    }
  }

  // await no motion, 
  let awaitMotionEnd = async () => {
    try {
      return new Promise(async (resolve, reject) => {
        let check = () => {
          getState().then((states) => {
            console.log(states.vel)
            if (states.vel < 0.001 && states.vel > -0.001) {
              resolve()
            } else {
              setTimeout(check, 10)
            }
          }).catch((err) => { throw err })
        }
        check()
      })
    } catch (err) {
      console.error(err)
    }
  }

  // goto-this-posn, using optional vel, accel 
  let absolute = async (pos, vel, accel) => {
    try {
      // modal vel-and-accels,
      vel ? lastVel = vel : vel = lastVel;
      accel ? lastAccel = accel : accel = lastAccel;
      // don't go too fast, pls lort
      if (vel > absMaxVelocity) {
        vel = absMaxVelocity;
        lastVel = vel;
      }
      // stuff a packet, 
      let datagram = new Uint8Array(13)
      let wptr = 0
      datagram[wptr++] = 0 // MOTION_MODE_POS 
      // write pos, vel, accel *every time* and convert-w-spu on the way out, 
      wptr += TS.write("float32", pos * spu, datagram, wptr)  // write posn
      wptr += TS.write("float32", vel * spu, datagram, wptr)  // write max-vel-during
      wptr += TS.write("float32", accel * spu, datagram, wptr)  // write max-accel-during
      // and we can shippity ship it, 
      await targetDataEndpoint.write(datagram, "acked")
      // then we could do... await-move-done ? 
      await awaitMotionEnd()
      console.log(`abs move to ${pos} done`)
    } catch (err) {
      console.error(err)
    }
  } // end absolute 

  // we return fns that user can call, 
  return {
    setSPU,
    getState,
    awaitMotionEnd,
    absolute,
    setup,
    vt,
  }
}