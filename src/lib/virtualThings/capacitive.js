import { osap } from "../osapjs/osap";
import Serializers from "../osapjs/utils/serializers"
const readUint16 = Serializers.readUint16;

let N_PADS = 6

export default function(name) {

  return {
    updateName: (newName) => {
      name = newName;
    },
    setRGB: async (r, g, b) => {
      try {
        const datagram = new Uint8Array([
          255 - r * 255,
          255 - g * 255,
          255 - (b * 255) / 2
        ])

        await osap.send(name, "setRGB", datagram);
      } catch (err) {
        console.error(err)
      }
    },
    readPad: async (index) => {
      try {
        // just get 'em all
        const data = await osap.send(name, "readPads", new Uint8Array([]));
        const vals = []
        for(let p = 0; p < N_PADS; p ++){
          vals.push(readUint16(data, p * 2))
        }

        return vals[index]/1023
      } catch (err) {
        console.error(err)
      }
    },
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
