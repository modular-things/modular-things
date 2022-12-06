/*
rgbbThing.js

a "virtual thing" - of course 

Jake Read, Leo McElroy and Quentin Bolsee at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2022

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the open systems assembly protocol (OSAP) and modular-things projects.
Copyright is retained and must be preserved. The work is provided as is;
no warranty is provided, and users accept all liability.
*/

import { TS } from "../osapjs/core/ts.js"
import PK from "../osapjs/core/packets.js"

export default function servo(osap, vt, name) {
  // ---------------------------------- OSAP... stuff, 
  let routeToFirmware = PK.VC2VMRoute(vt.route)

  // this is the '1th' vertex, so we address it like-this:
  let servoPulseWidthMirror = osap.endpoint("servoPulseWidthMirror")
  servoPulseWidthMirror.addRoute(PK.route(routeToFirmware).sib(1).end())

  // we should have a setup function:
  const setup = async () => {
    try {
      // noop 
    } catch (err) {
      throw err
    }
  }

  // calibrated-angle-bounds, 
  let pulseBounds = [1000, 2000] // pulse-width bounds
  let angleBounds = [0, 180]  // angular bounds 

  let writeMicroseconds = async (us) => {
    try {
      us = Math.round(us)
      let datagram = new Uint8Array(2)
      TS.write('uint16', us, datagram, 0)
      await servoPulseWidthMirror.write(datagram, "acked")
    } catch (err) {
      throw err
    }
  }

  let writeAngle = async (ang) => {
    try {
      if (ang < angleBounds[0]) ang = angleBounds[0]
      if (ang > angleBounds[1]) ang = angleBounds[1]
      // interp... 
      let interp = (ang - angleBounds[0]) / (angleBounds[1] - angleBounds[0])
      // console.warn(`interp with ${interp}`)
      interp = interp * (pulseBounds[1] - pulseBounds[0]) + pulseBounds[0]
      await writeMicroseconds(interp)
    } catch (err) {
      throw error
    }
  }

  let setCalibration = (_pulseBounds, _angleBounds) => {
    if (!Array.isArray(_pulseBounds) || !Array.isArray(_angleBounds)) {
      throw new Error(`input args for setCalibration are both arrays`)
    }
    pulseBounds = _pulseBounds
    angleBounds = _angleBounds
  }

  return {
    writeMicroseconds,
    writeAngle,
    setCalibration,
    setup,
    vt,
    api: [
      {
        name: "writeMicroseconds",
        args: [
          "us: 0 to 2^16"
        ]
      },
      {
        name: "writeAngle",
        args: [
          "angle: num"
        ]
      },
      {
        name: "setCalibration",
        args: [
          "pulseBounds: array",
          "angleBounds: array"
        ]
      }
    ]
  }
}