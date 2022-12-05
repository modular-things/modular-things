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
  // local state
  let onButtonStateChangeHandler = (state) => {
    console.warn(`default button state change in ${name}, to ${state}`);
  }

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
  let buttonRxEndpoint = osap.endpoint(`buttonCatcher_${name}`)
  buttonRxEndpoint.onData = (data) => {
    onButtonStateChangeHandler(data[0] > 0 ? true : false);
  }
  // -------------------------------------------- we need a setup,
  const setup = async () => {
    // erp, but this firmware actually is all direct-write, nothing streams back
    try {
      // we want to hook i.e. our button (in embedded, at index 2) to our button rx endpoint,
      // whose index we can know...
      // given that we know ~ what the topology looks like in these cases (browser...node...usb-embedded)
      // we should be able to dead-reckon the route up:
      let routeUp = PK.route().sib(0).pfwd().sib(0).pfwd().sib(buttonRxEndpoint.indice).end()
      // the source of our button presses is here... the 2nd endpoint at our remote thing
      let source = vt.children[5]
      // rm any previous,
      try {
        await osap.mvc.removeEndpointRoute(source.route, 0)
      } catch (err) {
        // this is chill, we get an error if we try to delete and nothing is there, can ignore...
        // console.error(err)
      }
      // so we build a route from that thing (the source) to us, using this mvc-api:
      await osap.mvc.setEndpointRoute(source.route, routeUp)
    } catch (err) {
      throw err
    }
  }

  // -------------------------------------------- Setters
  // how many steps-per-unit,
  // this could be included in a machineSpaceToActuatorSpace transform as well,
  let spu = 20
  // each has a max-max velocity and acceleration, which are user settings,
  // but velocity is also abs-abs-max'd at our tick rate...
  let absMaxVelocity = 4000 / spu
  let absMaxAccel = 10000
  let lastVel = absMaxVelocity
  let lastAccel = 100             // units / sec

  let setPosition = async (pos) => {
    try {
      // halt... this also mode-swaps to VEL, so when we set a new posn'
      // the motor won't slew to it
      await stop()
      // write up a new-position-paquet,
      let datagram = new Uint8Array(4)
      let wptr = 0
      wptr += TS.write("float32", pos, datagram, wptr)
      await positionSetEndpoint.write(datagram, "acked")
    } catch (err) {
      console.error(err)
    }
  }

  let setVelocity = async (vel) => {
    if (vel > absMaxVelocity) vel = absMaxVelocity
    lastVel = vel
  }

  let setAccel = async (accel) => {
    if (accel > absMaxAccel) accel = absMaxAccel
    lastAccel = accel
  }

  let setAbsMaxAccel = (maxAccel) => { absMaxAccel = maxAccel }

  let setAbsMaxVelocity = (maxVel) => {
    // not beyond this tick-based limit,
    if (maxVel > 4000 / spu) {
      maxVel = 4000 / spu
    }
    absMaxVelocity = maxVel
  }

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

  // tell me about your steps-per-unit,
  // note that FW currently does 1/4 stepping: 800 steps / revolution
  let setSPU = (_spu) => {
    spu = _spu
    if (absMaxVelocity > 4000 / spu) { absMaxVelocity = 4000 / spu }
    // we know that we have a maximum steps-per-second of 4000, so we can say
    console.warn(`w/ spu of ${spu}, this ${name} has a new abs-max velocity ${absMaxVelocity}`)
  }

  // -------------------------------------------- Getters

  // get states
  let getState = async () => {
    try {
      let data = await motionStateQuery.pull()
      // deserialize...
      return {
        pos: TS.read("float32", data, 0) / spu,
        vel: TS.read("float32", data, 4) / spu,
        accel: TS.read("float32", data, 8) / spu,
      }
    } catch (err) {
      console.error(err)
    }
  }


  let getPosition = async () => {
    try {
      let state = await getState()
      return state.pos
    } catch (err) {
      console.error(err)
    }
  }

  let getVelocity = async () => {
    try {
      let state = await getState()
      return state.vel
    } catch (err) {
      console.error(err)
    }
  }

  let getAbsMaxVelocity = () => { return absMaxVelocity }
  let getAbsMaxAccel = () => { return absMaxAccel }

  // -------------------------------------------- Operative

  // await no motion,
  let awaitMotionEnd = async () => {
    try {
      return new Promise(async (resolve, reject) => {
        let check = () => {
          getState().then((states) => {
            console.log(`${name}\t acc ${states.accel.toFixed(4)},\t vel ${states.vel.toFixed(4)},\t pos ${states.pos.toFixed(4)}`)
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

  // sets the position-target, and delivers rates, accels to use while slewing-to
  let target = async (pos, vel, accel) => {
    try {
      // modal vel-and-accels, and guards
      vel ? lastVel = vel : vel = lastVel;
      accel ? lastAccel = accel : accel = lastAccel;
      if (accel > absMaxAccel) { accel = absMaxAccel; lastAccel = accel; }
      if (vel > absMaxVelocity) { vel = absMaxVelocity; lastVel = vel; }
      // also, warn against zero-or-negative velocities & accelerations
      if (vel <= 0 || accel <= 0) throw new Error(`y'all are trying to go somewhere, but modal velocity or accel are negative, this won't do...`)
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
    } catch (err) {
      console.error(err)
    }
  }

  // goto-this-posn, using optional vel, accel, and wait for machine to get there
  let absolute = async (pos, vel, accel) => {
    try {
      // sets motion target,
      await target(pos, vel, accel)
      // then we could do... await-move-done ?
      await awaitMotionEnd()
      console.log(`abs move to ${pos} done`)
    } catch (err) {
      console.error(err)
    }
  } // end absolute

  // goto-relative, also wait,
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
      // modal accel, and guards...
      accel ? lastAccel = accel : accel = lastAccel;
      if (accel > absMaxAccel) { accel = absMaxAccel; lastAccel = accel; }
      if (vel > absMaxVelocity) { vel = absMaxVelocity; lastVel = vel; }
      // note that we are *not* setting last-vel w/r/t this velocity... esp. since we often call this
      // w/ zero-vel, to stop...
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
    // operate w/
    target,
    absolute,
    relative,
    velocity,
    stop,
    awaitMotionEnd,
    // setters...
    setPosition,
    setVelocity,
    setAccel,
    setAbsMaxAccel,
    setAbsMaxVelocity,
    setCScale,
    setSPU,
    // inspect...
    getPosition,
    getVelocity,
    getAbsMaxVelocity,
    getAbsMaxAccel,
    onButtonStateChange: (fn) => { onButtonStateChangeHandler = fn; },
    // these are hidden
    setup,
    vt,
    api: [
      {
        name: "absolute",
        args: [
          "pos: [x, y, z]",
        ]
      },
      {
        name: "relative",
        args: [
          "pos: [x, y, z]",
        ]
      },
      {
        name: "setVelocity",
        args: [
          "number",
        ]
      },
      {
        name: "setAccel",
        args: [
          "number",
        ]
      },
      {
        name: "stop",
        args: []
      },
      {
        name: "awaitMotionEnd",
        args: []
      },
      {
        name: "getState",
        args: [],
        return: `
          {
            pos: [x, y, z],
            vel: number,
            accel: number
          }
        `
      },
      {
        name: "getAbsMaxVelocity",
        args: [],
        return: "number",
      },
      {
        name: "setCScale",
        args: [
          "number",
        ]
      },
      {
        name: "setSPU",
        args: [
          "number",
        ]
      },
      {
        name: "onButtonStateChange",
        args: [
          "function: (buttonState) => {}"
        ]
      }
    ]
  }
}
