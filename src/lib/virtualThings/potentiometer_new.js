import { osap } from "../osapjs/osap";
import { readUint16 } from "../osapjs/utils/serializers.js"

export default function(name) {

  return {
    readPotentiometer: async (index) => {
      const data = await osap.send(name, "readPotentiometer");

      const val0 = readUint16(data, 0);
      const val1 = readUint16(data, 2);
      const vals = [ val0, val1 ];

      return vals[index]/1028;
    },
    api: [
      {
        name: "readPotentiometer",
        args: [
          "index: int 0 to 1"
        ],
        return: "0 to 1"
      }
    ]
  }
}