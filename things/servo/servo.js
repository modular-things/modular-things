import { osap } from "../../src/lib/osapjs/osap"; 
import Serializers from "../../src/lib/osapjs/utils/serializers"
const writeUint16 = Serializers.writeUint16;

export default function servo(name) {

  // calibrated-angle-bounds, 
  let pulseBounds = [1000, 2000] // pulse-width bounds
  let angleBounds = [0, 180]  // angular bounds 

  let writeMicroseconds = async (us) => {
    try {
      us = Math.round(us);
      let datagram = new Uint8Array(2);
      writeUint16(datagram, 0, us);
      await osap.send(name, "writeMicroseconds", datagram);
    } catch (err) {
      throw err
    }
  }

  let writeAngle = async (ang) => {
    try {
      if (ang < angleBounds[0]) ang = angleBounds[0]
      if (ang > angleBounds[1]) ang = angleBounds[1]
      // interp... 
      let interp = (ang - angleBounds[0]) / (angleBounds[1] - angleBounds[0])
      // console.warn(`interp with ${interp}`)
      interp = interp * (pulseBounds[1] - pulseBounds[0]) + pulseBounds[0]
      await writeMicroseconds(interp)
    } catch (err) {
      throw err 
    }
  }

  let setCalibration = (_pulseBounds, _angleBounds) => {
    if (!Array.isArray(_pulseBounds) || !Array.isArray(_angleBounds)) {
      throw new Error(`input args for setCalibration are both arrays`)
    }
    pulseBounds = _pulseBounds
    angleBounds = _angleBounds
  }

  return {
    updateName: (newName) => {
      name = newName;
    },
    writeMicroseconds,
    writeAngle,
    setCalibration,
    api: [
      {
        name: "writeMicroseconds",
        args: [
          "us: 0 to 2^16"
        ]
      },
      {
        name: "writeAngle",
        args: [
          "angle: num"
        ]
      },
      {
        name: "setCalibration",
        args: [
          "pulseBounds: array",
          "angleBounds: array"
        ]
      }
    ]
  }
}