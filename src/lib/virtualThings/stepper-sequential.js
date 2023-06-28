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

/*
0: serialport 
1: state queries
2: motor settings 
3: time settings 
4: segment ingest
5: segment complete 
*/

export default function stepper(osap, vt, name) {
  // the "vt.route" goes to our partner's "root vertex" - but we
  // want to address relative siblings, so I use this utility:
  let routeToFirmware = PK.VC2VMRoute(vt.route)
  // -------------------------------------------- 1: motion state is a read/write object, 
  let motionStateQuery = osap.query(PK.route(routeToFirmware).sib(1).end())
  let motionStateEndpoint = osap.endpoint(`motionStateMirror_${name}`)
  motionStateEndpoint.addRoute(PK.route(routeToFirmware).sib(1).end())
  // -------------------------------------------- 2: settings,
  let settingsEndpoint = osap.endpoint(`settingsMirror_${name}`)
  settingsEndpoint.addRoute(PK.route(routeToFirmware).sib(2).end())
  // -------------------------------------------- 5: a button / limit 
  let buttonRxEndpoint = osap.endpoint(`buttonCatcher_${name}`)
  let buttonQuery = osap.query(PK.route(routeToFirmware).sib(7).end())
  let latestButtonState = false 
  let getLimitState = () => {
    return latestButtonState
  }
  let onButtonStateChangeHandler = () => {}
  buttonRxEndpoint.onData = (data) => {
    latestButtonState = data[0] > 0 ? true : false;
    // console.warn(`RX'd button data ${latestButtonState}`)
    onButtonStateChangeHandler(latestButtonState);
  }
  // -------------------------------------------- we need a setup,
  const setup = async () => {
    // erp, but this firmware actually is all direct-write, nothing streams back
    try {
      // we want to hook i.e. our button (in embedded, at index 2) to our button rx endpoint,
      // whose index we can know...
      // given that we know ~ what the topology looks like in these cases (browser...usb-embedded)
      // we should be able to dead-reckon the route up:
      let routeUp = PK.route().sib(0).pfwd().sib(buttonRxEndpoint.indice).end()
      // the source of our button presses is here... the 2nd endpoint at our remote thing
      let source = vt.children[7]
      // rm any previous,
      try {
        await osap.mvc.removeEndpointRoute(source.route, 0)
      } catch (err) {
        // this is chill, we get an error if we try to delete and nothing is there, can ignore...
        // console.error(err)
      }
      // so we build a route from that thing (the source) to us, using this mvc-api:
      await osap.mvc.setEndpointRoute(source.route, routeUp)
      // and we should get the initial state,
      latestButtonState = (await buttonQuery.pull())[0] > 0 ? true : false
      // console.warn(`RX'd initial state ${latestButtonState}`)
    } catch (err) {
      throw err
    }
  }

  // -------------------------------------------- State Setters (and Getters)

  /*
  state = {
    pos: Array(DOF),
    unit: Array(DOF),
    vel: num,
    accel: num 
  }
  */

  let pushStates = async (state) => {
    try {
      let numdof = state.pos.length
      let datagram = new Uint8Array(1 + 4 * (numdof * 2 + 2))
      let wptr = 0 
      wptr += TS.write("uint8", numdof, datagram, wptr)
      for(let a = 0; a < numdof; a ++){
        wptr += TS.write("float32", state.pos[a], datagram, wptr)
      }
      for(let a = 0; a < numdof; a ++){
        wptr += TS.write("float32", state.unit[a], datagram, wptr)
      }
      wptr += TS.write("float32", state.vel, datagram, wptr)
      wptr += TS.write("float32", state.accel, datagram, wptr)
      await motionStateEndpoint.write(datagram)
    } catch (err) {
      throw err 
    }
  }

  let getStates = async () => {
    try {
      let data = await motionStateQuery.pull()
      let numdof = TS.read("uint8", data, 0)
      let state = {
        pos: new Array(numdof),
        unit: new Array(numdof)
      }
      for(let a = 0; a < numdof; a ++){
        state.pos[a] = TS.read("float32", data, a * 4 + 1)
      }
      for(let a = 0; a < numdof; a ++){
        state.unit[a] = TS.read("float32", data, a * 4 + 1 + numdof * 4)
      }
      state.vel = TS.read("float32", data, numdof * 2 * 4 + 1)
      state.accel = TS.read("float32", data, numdof * 2 * 4 + 5)
      return state 
    } catch (err) {
      throw err 
    }
  }

  let getPosition = async () => {
    try {
      let state = await getStates()
      return state.pos[settings.axis]
    } catch (err) {
      throw err 
    }
  }

  // -------------------------------------------- Settings Setters

  let settings = {
    actuatorID: 0, 
    axis: 0, 
    stepsPerUnit: 100, 
    currentScale: 0.0,
  }

  let pushSettings = async () => {
    try {
      let datagram = new Uint8Array(10)
      let wptr = 0
      wptr += TS.write("uint8", settings.actuatorID, datagram, wptr)
      wptr += TS.write("uint8", settings.axis, datagram, wptr)
      wptr += TS.write("float32", settings.stepsPerUnit, datagram, wptr)  // it's 0-1, firmware checks
      wptr += TS.write("float32", settings.currentScale, datagram, wptr)  // it's 0-1, firmware checks
      // and we can shippity ship it,
      await settingsEndpoint.write(datagram, "acked")    
    } catch (err) {
      throw err 
    }
  }

  let setCurrentScale = async (cscale) => {
    try {
      settings.currentScale = cscale 
      await pushSettings()
    } catch (err) {
      throw err 
    }
  }

  let setAxis = async (axis) => {
    try {
      settings.axis = axis 
      await pushSettings()
    } catch (err) {
      throw err 
    }
  }

  let setStepsPerUnit = async (spu) => {
    try {
      settings.stepsPerUnit = spu 
      await pushSettings()
    } catch (err) {
      throw err
    }
  }

  /*

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
  */

  // we return fns that user can call,
  return {
    // states...
    pushStates, 
    getStates, 
    getPosition, 
    // not sure about the new API for these... 
    getLimitState,
    setCurrentScale,
    setStepsPerUnit,
    setAxis,
    pushSettings, 
    settings, 
    // these are hidden
    setup,
    vt,
    osap,
    // this is reflective of what I hope the API will look like 
    api: [
      // {
      //   name: "absolute",
      //   args: [
      //     "pos: number",
      //   ]
      // },
      // {
      //   name: "relative",
      //   args: [
      //     "delta: number",
      //   ]
      // },
      // {
      //   name: "velocity",
      //   args: [
      //     "velocity: number",
      //   ]
      // },
      /*
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
      */
      // {
      //   name: "stop",
      //   args: []
      // },
      // {
      //   name: "awaitMotionEnd",
      //   args: []
      // },
      // {
      //   name: "getState",
      //   args: [],
      //   return: `
      //     {
      //       pos: number,
      //       vel: number,
      //       accel: number
      //     }
      //   `
      // },
      /*
      {
        name: "getAbsMaxVelocity",
        args: [],
        return: "number",
      },
      */
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
      // {
      //   name: "setAxis",
      //   args: [
      //     "axis: index"
      //   ]
      // },
      {
        name: "getLimitState",
        args: [],
        return: "boolean"
      }
      /*
      {
        name: "onButtonStateChange",
        args: [
          "function: (buttonState) => {}"
        ]
      }
      */
    ]
  }
}