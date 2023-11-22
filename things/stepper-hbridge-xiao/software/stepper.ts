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

import Serializers from "../../../src/lib/osapjs/utils/serializers"
import Thing from "../../../src/lib/thing"

export default class Stepper extends Thing {

  // -------------------------------------------- Setters
  // how many steps-per-unit,
  // this could be included in a machineSpaceToActuatorSpace transform as well,
  private spu = 20
  // each has a max-max velocity and acceleration, which are user settings,
  // but velocity is also abs-abs-max'd at our tick rate (in hz) 
  private tickRate = 4000
  private absMaxVelocity = this.tickRate / this.spu
  private absMaxAccel = 10000
  // these are stateful for modal functos 
  private lastVel = 100               // units / sec 
  private lastAccel = 100             // units / sec / sec

  // reset position (not a move command) 
  async setPosition(pos: number) {
    try {
      // stop AFAP 
      await this.halt();
      // write up a new-position-paquet,
      let datagram = new Uint8Array(4);
      let wptr = 0;
      wptr += Serializers.writeFloat32(datagram, wptr, pos);
      await this.send("setPosition", datagram);
    } catch (err) {
      console.error(err)
    }
  }

  setVelocity(vel: number) {
    if (vel > this.absMaxVelocity) vel = this.absMaxVelocity
    this.lastVel = vel
  }

  setAccel = async (accel: number) => {
    if (accel > this.absMaxAccel) accel = this.absMaxAccel
    this.lastAccel = accel
  }

  setAbsMaxAccel = (maxAccel: number) => { this.absMaxAccel = maxAccel }

  setAbsMaxVelocity = (maxVel: number) => {
    // not beyond this tick-based limit,
    if (maxVel > this.tickRate / this.spu) {
      maxVel = this.tickRate / this.spu
    }
    this.absMaxVelocity = maxVel
  }

  async setCurrentScale(cscale: number) {
    try {
      let datagram = new Uint8Array(4)
      let wptr = 0
      wptr += Serializers.writeFloat32(datagram, wptr, cscale)  // it's 0-1, firmware checks
      // and we can shippity ship it,
      await this.send("writeSettings", datagram)
    } catch (err) {
      console.error(err)
    }
  }

  // tell me about your steps-per-unit,
  // note that FW currently does 1/4 stepping: 800 steps / revolution
  setStepsPerUnit(spu: number) {
    this.spu = spu
    if (this.absMaxVelocity > this.tickRate / this.spu) {
      this.absMaxVelocity = this.tickRate / this.spu
    }
    console.warn(`w/ spu of ${spu}, this ${this.getName()} has a new abs-max velocity ${this.absMaxVelocity}`)
  }

  // -------------------------------------------- Getters

  async getState() {
    try {
      let data = await this.send("getMotionStates", new Uint8Array([]))
      return {
        pos: Serializers.readFloat32(data, 0) / this.spu,
        vel: Serializers.readFloat32(data, 4) / this.spu,
        accel: Serializers.readFloat32(data, 8) / this.spu,
      }
    } catch (err) {
      console.error(err)
    }
  }

  async getPosition() { return (await this.getState()).pos; }

  async getVelocity() { return (await this.getState()).vel; }

  getAbsMaxVelocity() { return this.absMaxVelocity }

  getAbsMaxAccel() { return this.absMaxAccel }

  // -------------------------------------------- Operative

  // await no motion,
  async awaitMotionEnd() {
    try {
      return new Promise<void>(async (resolve, reject) => {
        let check = () => {
          this.getState().then((states) => {
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
  async target(pos: number, vel?: number, accel?: number) {
    try {
      // modal vel-and-accels, and guards
      vel ? this.lastVel = vel : vel = this.lastVel;
      accel ? this.lastAccel = accel : accel = this.lastAccel;
      if (accel > this.absMaxAccel) { accel = this.absMaxAccel; this.lastAccel = accel; }
      if (vel > this.absMaxVelocity) { vel = this.absMaxVelocity; this.lastVel = vel; }
      // also, warn against zero-or-negative velocities & accelerations
      if (vel <= 0 || accel <= 0) throw new Error(`y'all are trying to go somewhere, but modal velocity or accel are negative, this won't do...`)
      // stuff a packet,
      let datagram = new Uint8Array(13)
      let wptr = 0
      datagram[wptr++] = 0 // MOTION_MODE_POS
      // write pos, vel, accel *every time* and convert-w-spu on the way out,
      wptr += Serializers.writeFloat32(datagram, wptr, pos * this.spu)  // write posn
      wptr += Serializers.writeFloat32(datagram, wptr, vel * this.spu)  // write max-vel-during
      wptr += Serializers.writeFloat32(datagram, wptr, accel * this.spu)  // write max-accel-during
      // and we can shippity ship it,
      await this.send("setTarget", datagram);
    } catch (err) {
      console.error(err)
    }
  }

  // goto-this-posn, using optional vel, accel, and wait for machine to get there
  async absolute(pos: number, vel: number, accel: number) {
    try {
      await this.target(pos, vel, accel)
      await this.awaitMotionEnd()
    } catch (err) {
      console.error(err)
    }
  } // end absolute

  // goto-relative, also wait,
  async relative(delta: number, vel: number, accel: number) {
    try {
      let state = await this.getState()
      let pos = delta + state.pos
      await this.absolute(pos, vel, accel)
    } catch (err) {
      console.error(err)
    }
  }

  // goto-this-speed, using optional accel,
  async velocity(vel: number, accel?: number) {
    try {
      // modal accel, and guards...
      accel ? this.lastAccel = accel : accel = this.lastAccel;
      if (accel > this.absMaxAccel) { accel = this.absMaxAccel; this.lastAccel = accel; }
      if (vel > this.absMaxVelocity) { vel = this.absMaxVelocity; this.lastVel = vel; }
      // note that we are *not* setting last-vel w/r/t this velocity... esp. since we often call this
      // w/ zero-vel, to stop...
      // now write the paquet,
      let datagram = new Uint8Array(9)
      let wptr = 0
      datagram[wptr++] = 1 // MOTION_MODE_VEL
      wptr += Serializers.writeFloat32(datagram, wptr, vel * this.spu)  // write max-vel-during
      wptr += Serializers.writeFloat32(datagram, wptr, accel * this.spu)  // write max-accel-during
      // mkheeeey
      await this.send("setTarget", datagram);
    } catch (err) {
      console.error(err)
    }
  }

  // stop !
  async halt() {
    try {
      await this.velocity(0)
      await this.awaitMotionEnd()
    } catch (err) {
      console.error(err)
    }
  }

  // get limit state 
  async getLimitState() {
    try {
      let reply = await this.send("getLimitState", new Uint8Array([0]));
      return reply[0] ? true : false;
    } catch (err) {
      console.error(err);
    }
  }

  // the gd API, we should be able to define 'em inline ? 
  public api = [
    {
      name: "setCurrentScale",
      args: [
        "cscale: number 0 - 1",
      ]
    }, {
      name: "setStepsPerUnit",
      args: [
        "spu: number",
      ]
    }, {
      name: "absolute",
      args: [
        "pos: number",
      ]
    }, {
      name: "relative",
      args: [
        "delta: number",
      ]
    }, {
      name: "setVelocity",
      args: [
        "vel: number",
      ]
    }, {
      name: "setAccel",
      args: [
        "accel: number",
      ]
    }, {
      name: "setPosition",
      args: [
        "pos: number"
      ]
    }, {
      name: "halt",
      args: []
    }, {
      name: "awaitMotionEnd",
      args: []
    }, {
      name: "getState",
      args: [],
      return: `
          {
            pos: number,
            vel: number,
            accel: number
          }
        `
    }, {
      name: "getLimitState",
      args: []
    }
  ]
}
