import { osap } from "../../../src/lib/osapjs/osap"; 

export default function mosfetThing(name) {

  return {
    updateName: (newName) => {
      name = newName;
    },
    setGate: async (value) => {
      try {
        const datagram = new Uint8Array([ 255 * value ])
        await osap.send(name, "setGate", datagram);

      } catch (err) {
        console.error(err)
      }
    },
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
