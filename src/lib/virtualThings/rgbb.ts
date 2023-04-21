import { osap } from "../osapjs/osap";

export default function rgbbThing(name: string) {

  return {
    setRGB: async (r, g, b) => {
      let datagram = new Uint8Array(3);
      datagram[0] = 255 - r * 255;
      datagram[1] = 255 - g * 255;
      datagram[2] = 255 - (b * 255) / 2;
      await osap.send(name, "setRGB", datagram);
    },
    getButtonState: async () => {
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
        name: "getButtonState",
        args: [ ],
        return: "0 or 1"
      }
    ]
  }
}
