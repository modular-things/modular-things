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

export default function mosfetThing(osap, vt, name) {
  // ---------------------------------- OSAP... stuff,
  let routeToFirmware = PK.VC2VMRoute(vt.route)

  // this is the '1th' vertex, so we address it like-this:
  let gateEndpointMirror = osap.endpoint("gateEndpointMirror")
  gateEndpointMirror.addRoute(PK.route(routeToFirmware).sib(1).end())

  // we should have a setup function:
  const setup = async () => { }

  return {
    setGate: async (value) => {
      try {
        // float, float, float, -> int-etc,
        // we could also do the i.e. linearization here, or accept various "color" types
        let datagram = new Uint8Array(1)
        datagram[0] = 255 * value
        // console.log('writing', datagram)
        await gateEndpointMirror.write(datagram, "acked")
      } catch (err) {
        console.error(err)
      }
    },
    setup,
    vt,
    api: [
      {
        name: "setGate",
        args: [
          "value: 0 to 1"
        ],
      }
    ]
  }
}
