import { osap } from "../../../src/lib/osapjs/osap";

import Thing from "../../../src/lib/thing";

// the name given to us here is the "uniqueName" of the matched 
// device, we use this as a kind of address 
export default class RGBB extends Thing {
  // we can define methods that interact with the device, 
  // using the 'send' primitive, which writes data (bytes) and gets data (bytes) 
  async setRGB(r: number, g: number, b: number) {
    let datagram = new Uint8Array(3);
    datagram[0] = 255 - r * 255;
    datagram[1] = 255 - g * 255;
    datagram[2] = 255 - (b * 255) / 2;
    // to send data, we use 
    // `osap.send(name: string, targetPort: string, data: Uint8Array)`
    // ... and please use 'async' funcs with 'await' in front of 
    // network calls 
    // ... as you have probably figured out, "setRGB" here routes to 
    // the function defined around line 43 in the arduino example
    await this.send("setRGB", datagram);
  }

  async getButtonState() {
    // named-ports that return data resolve that data like-so:
    let res = await this.send("getButtonState", new Uint8Array([]));
    // and we can deserialize results... 
    if (res[0] > 0) {
      return true;
    } else {
      return false;
    }
  }

  // then we can docs our API, 
  api = [
    {
      name: "setRGB",
      args: [
        "red: 0 to 1",
        "green: 0 to 1",
        "blue: 0 to 1"
      ],
    },
    {
      name: "getButtonState",
      args: [],
      return: "0 or 1"
    }
  ]
}

let oldies = {
  // each of these is basically a little serialization routine
  // but of course you can run arbitrary code in them... 
  setRGB: async (r: number, g: number, b: number) => {
    let datagram = new Uint8Array(3);
    datagram[0] = 255 - r * 255;
    datagram[1] = 255 - g * 255;
    datagram[2] = 255 - (b * 255) / 2;
    // to send data, we use 
    // `osap.send(name: string, targetPort: string, data: Uint8Array)`
    // ... and please use 'async' funcs with 'await' in front of 
    // network calls 
    // ... as you have probably figured out, "setRGB" here routes to 
    // the function defined around line 43 in the arduino example
    await osap.send(name, "setRGB", datagram);
  },
  getButtonState: async () => {
    // named-ports that return data resolve that data like-so:
    let res = await osap.send(name, "getButtonState", new Uint8Array([]));
    // and we can deserialize results... 
    if (res[0] > 0) {
      return true;
    } else {
      return false;
    }
  },
  // each thing should implement this function, it lets us update 
  // the name (address) when the user sets a new uniqueName for 
  // the device, 
  updateName: (newName: string) => {
    name = newName;
  },
  // and we additionally return a description of the device's API:
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
      name: "getButtonState",
      args: [],
      return: "0 or 1"
    }
  ]
}