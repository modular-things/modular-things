import { osap } from "../../src/lib/osapjs/osap"; 
import Serializers from "../../src/lib/osapjs/utils/serializers"
const readUint16 = Serializers.readUint16;

export default function(name) {

  return {
    updateName: (newName) => {
      name = newName;
    },
    readDistance: async () => {
      try {
        const data = await osap.send(name, "readDistance");
        if(data[0] == 1){
          const val = readUint16(data, 1);
          return val;  
        } else {
          throw new Error(`TOF timed out, try rebooting the board... or check hardware...`)
        }
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