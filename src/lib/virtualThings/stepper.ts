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

// ---------------------------------------------- serialize, deserialize floats 

import { osap } from "../osapjs/osap"
import Serializers from "../osapjs/utils/serializers"

export default function stepper(name: string) {

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
      await stop();
      // write up a new-position-paquet,
      let datagram = new Uint8Array(4);
      let wptr = 0;
      wptr += Serializers.writeFloat32(datagram, wptr, pos);
      await osap.send(name, "setPosition", datagram);
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

  let setCurrentScale = async (cscale) => {
    try {
      let datagram = new Uint8Array(4)
      let wptr = 0
      wptr += Serializers.writeFloat32(datagram, wptr, cscale)  // it's 0-1, firmware checks
      // and we can shippity ship it,
      await osap.send(name, "writeSettings", datagram)
    } catch (err) {
      console.error(err)
    }
  }

  // tell me about your steps-per-unit,
  // note that FW currently does 1/4 stepping: 800 steps / revolution
  let setStepsPerUnit = (_spu) => {
    spu = _spu
    if (absMaxVelocity > 4000 / spu) { absMaxVelocity = 4000 / spu }
    // we know that we have a maximum steps-per-second of 4000, so we can say
    console.warn(`w/ spu of ${spu}, this ${name} has a new abs-max velocity ${absMaxVelocity}`)
  }

  // -------------------------------------------- Getters

  // get states
  let getState = async () => {
    try {
      let data = await osap.send(name, "getMotionStates", new Uint8Array([]))
      return {
        pos: Serializers.readFloat32(data, 0) / spu,
        vel: Serializers.readFloat32(data, 4) / spu,
        accel: Serializers.readFloat32(data, 8) / spu,
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
      return new Promise<void>(async (resolve, reject) => {
        let check = () => {
          getState().then((states) => {
            // console.log(`${name}\t acc ${states.accel.toFixed(4)},\t vel ${states.vel.toFixed(4)},\t pos ${states.pos.toFixed(4)}`)
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
      wptr += Serializers.writeFloat32(datagram, wptr, pos * spu)  // write posn
      wptr += Serializers.writeFloat32(datagram, wptr, vel * spu)  // write max-vel-during
      wptr += Serializers.writeFloat32(datagram, wptr, accel * spu)  // write max-accel-during
      // and we can shippity ship it,
      await osap.send(name, "setTarget", datagram);
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
      // console.log(`abs move to ${pos} done`)
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
  let velocity = async (vel, accel ?) => {
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
      wptr += Serializers.writeFloat32(datagram, wptr, vel * spu)  // write max-vel-during
      wptr += Serializers.writeFloat32(datagram, wptr, accel * spu)  // write max-accel-during
      // mkheeeey
      await osap.send(name, "setTarget", datagram);
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

  // get limit state 
  let getLimitState = async () => {
    try {
      let reply = await osap.send(name, "getLimitState", new Uint8Array([0]));
      return reply[0] ? true : false;
    } catch (err) {
      console.error(err);
    }
  }

  // we return fns that user can call,
  return {
    // operate w/
    target,           // this is hidden (not in 'api' return), but used by sync 
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
    setCurrentScale,
    setStepsPerUnit,
    // inspect...
    getState,
    getPosition,
    getVelocity,
    getAbsMaxVelocity,
    getAbsMaxAccel,
    // switch 
    getLimitState,
    updateName: (newName: string) => {
      name = newName;
    },
    getName: () => { return name },
    api: [
      {
        name: "absolute",
        args: [
          "pos: number",
        ]
      },
      {
        name: "relative",
        args: [
          "delta: number",
        ]
      },
      {
        name: "setVelocity",
        args: [
          "vel: number",
        ]
      },
      {
        name: "setAccel",
        args: [
          "accel: number",
        ]
      },
      {
        name: "setPosition",
        args: [
          "pos: number"
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
            pos: number,
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
        name: "setCurrentScale",
        args: [
          "cscale: number 0 - 1",
        ]
      },
      {
        name: "setStepsPerUnit",
        args: [
          "spu: number",
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
