/*
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

let N_PADS = 6

export default function(osap, vt, name) {

  // ---------------------------------- OSAP... stuff, 
  let routeToFirmware = PK.VC2VMRoute(vt.route)

  // this is the '1th' vertex, so we address it like-this:
  let rgbEndpointMirror = osap.endpoint("rgbEndpointMirror")
  rgbEndpointMirror.addRoute(PK.route(routeToFirmware).sib(1).end());

  // ahn query mechanism, we just use this software handle to write 
  // endpoint-query packets... to whatever is at the given route 
  let padQuery = osap.query(PK.route(routeToFirmware).sib(2).end());

  // we should have a setup function:
  const setup = async () => {
    // though we sometimes don't need it... esp if all direct-write 
  }

  return {
    setRGB: async (r, g, b) => {
      try {
        // float, float, float, -> int-etc,
        // we could also do the i.e. linearization here, or accept various "color" types 
        let datagram = new Uint8Array(3)
        datagram[0] = 255 - r * 255
        datagram[1] = 255 - g * 255
        datagram[2] = (255 - b * 255) / 2
        // console.log('writing', datagram)
        await rgbEndpointMirror.write(datagram, "acked")
      } catch (err) {
        console.error(err)
      }
    },
    readPad: async (index) => {
      try {
        // just get 'em all 
        let data = await padQuery.pull();
        let vals = []
        for(let p = 0; p < N_PADS; p ++){
          vals.push(TS.read("uint16", data, p * 2))
        }
        // then return the most recent,
        return vals[index]/1028
        // or we could have folks give .readPad() multiple indices, returning each in order, 
        // or it could just always return the full set, etc... 
      } catch (err) {
        console.error(err)
      }
    },
    setup,
    vt,
    api: [
      {
        name: "setRGB",
        args: [
          "red: 0 to 1",
          "green: 0 to 1",
          "blue: 0 to 1"
        ]
      },
      {
        name: "readPad",
        args: [
          "index: int 0 to 5"
        ],
        return: "0 to 1"
      },
    ]
  }
}