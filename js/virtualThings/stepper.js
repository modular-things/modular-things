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
  // the "vt.route" goes to our partner's "root vertex" - but we 
  // want to address relative siblings, so I use this utility:
  let routeToFirmware = PK.VC2VMRoute(vt.route)
  // here we basically write a "mirror" endpoint for each downstream thing, 
  // -------------------------------------------- 1: target data 
  // now I can index to the 1st endpoint (I know it's this one because 
  // I wrote the firmware!) just by adding a .sib() to that route;
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
  // how many steps-per-unit, 
  // this could be included in a machineSpaceToActuatorSpace transform as well, 
  let spu = 20
  // this is a result of our step-ticking machine having some limits (can't make more than 1 step per integration)
  let absMaxVelocity = 4000 / spu
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

  let getAbsMaxVelocity = () => { return absMaxVelocity }

  let setCScale = async (cscale) => {
    try {
      let datagram = new Uint8Array(4)
      let wptr = 0
      wptr += TS.write("float32", cscale, datagram, wptr)  // it's 0-1, firmware checks
      // and we can shippity ship it, 
      await settingsEndpoint.write(datagram, "acked")
    } catch (err) {
      console.error(err)
    }
  }

  // get states
  let getState = async () => {
    try {
      let data = await motionStateQuery.pull()
      return {
        pos: TS.read("float32", data, 0) / spu,
        vel: TS.read("float32", data, 4) / spu,
        accel: TS.read("float32", data, 8) / spu,
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
            console.log(`${states.accel.toFixed(2)}, ${states.vel.toFixed(2)}, ${states.pos.toFixed(2)}`)
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

  // TODO add i.e. position(pos) as a target, w/o awaiting-end... for i.e. streaming posn requests / live-drawing 

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
      // also, warn against zero-velocities...
      if (vel == 0) throw new Error(`y'all are trying to go somewhere, but modal velocity == 0, this won't do...`)
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

  // goto-relative, 
  let relative = async (delta, vel, accel) => {
    try {
      let state = await getState()
      let pos = delta + state.pos
      // that's it my dudes, 
      await absolute(pos, vel, accel)
    } catch (err) {
      console.error(err)
    }
  }

  // goto-this-speed, using optional accel, 
  let velocity = async (vel, accel) => {
    try {
      // modal accel
      accel ? lastAccel = accel : accel = lastAccel;
      // not > absMax, 
      if (vel > absMaxVelocity) vel = absMaxVelocity;
      // hmmm... potential bugfarm as .stop() calls this, sets to zero, then modal restarts w/ zero-vel... 
      // but is consistent with modal-ness elsewhere, 
      // so I have thrown an error if we call .absolute() w/ vel = 0 
      lastVel = vel
      // now write the paquet, 
      let datagram = new Uint8Array(9)
      let wptr = 0
      datagram[wptr++] = 1 // MOTION_MODE_VEL 
      wptr += TS.write("float32", vel * spu, datagram, wptr)  // write max-vel-during
      wptr += TS.write("float32", accel * spu, datagram, wptr)  // write max-accel-during
      // mkheeeey
      await targetDataEndpoint.write(datagram, "acked")
    } catch (err) {
      console.error(err)
    }
  }

  // stop !
  let stop = async () => {
    try {
      await velocity(0)
      await awaitMotionEnd()
    } catch (err) {
      console.error(err)
    }
  }

  // we return fns that user can call, 
  return {
    absolute,
    relative,
    velocity,
    stop,
    awaitMotionEnd,
    getState,
    setCScale,
    setSPU,
    setup,
    vt,
  }
}