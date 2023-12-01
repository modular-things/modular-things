import Thing from "../../../src/lib/thing";
import Serializers from "../../../src/lib/osapjs/utils/serializers"
const readUint16 = Serializers.readUint16;

// the name given to us here is the "uniqueName" of the matched
// device, we use this as a kind of address
export default class distance extends Thing {
  // we can define methods that interact with the device,
  // using the 'send' primitive, which writes data (bytes) and gets data (bytes)
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

  async getDistance() {
    let data = await this.send("getDistance", new Uint8Array([]));
    if (data[0] == 1) {
      const val = readUint16(data, 1);
      return val;
    } else {
      throw new Error(`TOF timed out, try rebooting the board... or check hardware...`)
    }
  }

  api = [
    {
      name: "getDistance",
      args: [],
      return: "float"
    }
  ]
}
