import Thing from '../../../src/lib/thing'
import Serializers from '../../../src/lib/osapjs/utils/serializers'

export default class servo extends Thing {

  // calibrated-angle-bounds, 
  private pulseBounds = [1000, 2000] // pulse-width bounds
  private angleBounds = [0, 180]  // angular bounds 


  async writeMicroseconds(us: number){
    try {
      us = Math.round(us);
      let datagram = new Uint8Array(2);
      Serializers.writeUint16(datagram, 0, us);
      await this.send("writeMicroseconds", datagram);
    } catch (err) {
      throw err
    }
  }


  async writeAngle(angle: number){
    try {
      // constrain to as-specified bounds, 
      if (angle < this.angleBounds[0]) angle = this.angleBounds[0]
      if (angle > this.angleBounds[1]) angle = this.angleBounds[1]
      // interpolate with microseconds-bounds match, 
      let interp = (angle - this.angleBounds[0]) / (this.angleBounds[1] - this.angleBounds[0])
      interp = interp * (this.pulseBounds[1] - this.pulseBounds[0]) + this.pulseBounds[0]
      // and sendy 
      await this.writeMicroseconds(interp)
    } catch (err) {
      throw err 
    }
  }


  setCalibration(_pulseBounds, _angleBounds){
    if (!Array.isArray(_pulseBounds) || !Array.isArray(_angleBounds)) {
      throw new Error(`input args for setCalibration are both arrays`)
    }
    this.pulseBounds = _pulseBounds
    this.angleBounds = _angleBounds
  }


  public api = [
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
        "pulseBounds: [minMicros, maxMicros]",
        "angleBounds: [minAngle, maxAngle]"
      ]
    }
  ]
}