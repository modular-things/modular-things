import Thing from "../../../src/lib/thing";
import Serializers from "../../../src/lib/osapjs/utils/serializers"
const readUint16 = Serializers.readUint16;

// the name given to us here is the "uniqueName" of the matched
// device, we use this as a kind of address
export default class button extends Thing {
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

  async getPotentiometer() {
    let data = await this.send("getPotentiometerState", new Uint8Array([]));
    let x = readUint16(data, 0) / 1023;
    return x;
  }

  // then we can docs our API,
  api = [
    {
      name: "getPotentiometer",
      args: [],
      return: "0 to 1"
    }
  ]
}
