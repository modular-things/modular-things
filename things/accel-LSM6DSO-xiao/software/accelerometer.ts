import Thing from '../../../src/lib/thing'
import Serializers from '../../../src/lib/osapjs/utils/serializers'
const readFloat32 = Serializers.readFloat32;

export default class accelerometer extends Thing {
  async setRGB(r, g, b) {
    let datagram = new Uint8Array(3);
    datagram[0] = r * 255;
    datagram[1] = g * 255;
    datagram[2] = b * 255;
    await this.send("setRGB", datagram);
  }

  async setLED(state) {
      let datagram = new Uint8Array([state > 0]);
      await this.send("setLED", datagram);
  }

  async readAccGyro() {
    try {
      let data = await this.send("readAccGyro", new Uint8Array([]));

      const x = readFloat32(data, 0);
      const y = readFloat32(data, 4);
      const z = readFloat32(data, 8);
      const xTheta = readFloat32(data, 12);
      const yTheta = readFloat32(data, 16);
      const zTheta = readFloat32(data, 20);

      console.log(data)

      return [x, y, z, xTheta, yTheta, zTheta];
    } catch (err) {
      console.error(err);
    }
  }

  public api = [
    {
      name: "readAccGyro",
      args: [],
      return: "[x, y, z, xTheta, yTheta, zTheta]"
    }
  ]
}
