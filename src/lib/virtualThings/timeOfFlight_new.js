import { osap } from "../osapjs/osap";
import { readUint16 } from "../osapjs/utils/serializers.js"

export default function(name) {

  return {
    readDistance: async () => {
      try {
        const data = osap.send(name, "readDistance");
        const val = readUint16(data, 0);
        return val;
      } catch (err) {
        console.error(err)
      }
    },
    api: [
      {
        name: "readDistance",
        args: [],
        return: "millimeters"
      }
    ]
  }
}