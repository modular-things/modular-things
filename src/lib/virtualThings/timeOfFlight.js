import { osap } from "../osapjs/osap";
import Serializers from "../osapjs/utils/serializers"
const readUint16 = Serializers.readUint16;

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