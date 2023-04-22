import { osap } from "../osapjs/osap";

// this file lives in `modular-things/src/lib/virtualThings/rgbb.ts`
// to add new thing, simply drop a similar file in the same directory 
// and give it the same name as your "typeName" in the embedded example
// i.e. the line `OSAP_Port_DeviceNames namePort("rgbb");` 
// ... finally, add the file as an import in 
// `modular-things/src/lib/modularThingClient.ts` around line 4, 
// and add it to the constructors list (around line 18)

// the name given to us here is the "uniqueName" of the matched 
// device, we use this as a kind of address 
export default function rgbbThing(name: string) {
  // we can return a handful of functions... 
  return {
    // each of these is basically a little serialization routine
    // but of course you can run arbitrary code in them... 
    setRGB: async (r, g, b) => {
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
      if(res[0] > 0){
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
        args: [ ],
        return: "0 or 1"
      }
    ]
  }
}
