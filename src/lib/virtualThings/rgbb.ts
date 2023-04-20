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

import { osap } from "../osapjs/osap";

// TODO: should these each be typescript classes ? 
// or, is there a cleaner way to do the `updateName` func ? that's kind of the only 
// requirement... 

export default function rgbbThing(name: string) {

  // this is it ? 
  return {
    setRGB: async(r, g, b) => {
      let datagram = new Uint8Array(3);
      datagram[0] = 255 - r * 255;
      datagram[1] = 255 - g * 255;
      datagram[2] = 255 - (b * 255) / 2;
      return await osap.send(name, "setRGB", datagram);
    },
    getButtonState: async() => {
      let res = await osap.send(name, "getButtonState", new Uint8Array([]));
      if(res[0] > 0){
        return true;
      } else {
        return false;
      }
    },
    updateName: (newName: string) => {
      name = newName;
    },
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
