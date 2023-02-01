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

export default function rgbbThing(osap, vt, name) {

  // local state
  let onButtonStateChangeHandler = (state) => {
    console.warn(`default button state change in ${name}, to ${state}`);
  }

  // ---------------------------------- OSAP... stuff, 
  let routeToFirmware = PK.VC2VMRoute(vt.route)

  // this is the '1th' vertex, so we address it like-this:
  let rgbEndpointMirror = osap.endpoint("rgbEndpointMirror")
  rgbEndpointMirror.addRoute(PK.route(routeToFirmware).sib(1).end())

  // this is where we'll rx button states:
  let buttonRxEndpoint = osap.endpoint(`buttonCatcher_${name}`)
  buttonRxEndpoint.onData = (data) => {
    onButtonStateChangeHandler(data[0] > 0 ? true : false);
  }

  // we should have a setup function:
  const setup = async () => {
    try {
      // we want to hook i.e. our button (in embedded, at index 2) to our button rx endpoint, 
      // whose index we can know...
      // given that we know ~ what the topology looks like in these cases (browser...node...usb-embedded)
      // we should be able to dead-reckon the route up:
      let routeUp = PK.route().sib(0).pfwd().sib(0).pfwd().sib(buttonRxEndpoint.indice).end()
      // the source of our button presses is here... the 2nd endpoint at our remote thing
      let source = vt.children[2]
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

  return {
    setRGB: async (r, g, b) => {
      try {
        // float, float, float, -> int-etc,
        // we could also do the i.e. linearization here, or accept various "color" types 
        let datagram = new Uint8Array(3)
        datagram[0] = 255 - r * 255
        datagram[1] = 255 - g * 255
        datagram[2] = 255 - (b * 255) / 2
        // console.log('writing', datagram)
        await rgbEndpointMirror.write(datagram, "acked")
      } catch (err) {
        console.error(err)
      }
    },
    onButtonStateChange: (fn) => { onButtonStateChangeHandler = fn; },
    setup,
    vt,
    api: [
      { 
        name: "setRGB",
        args: [
          "red: 0 to 1", 
          "green: 0 to 1", 
          "blue: 0 to 1"
        ],
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