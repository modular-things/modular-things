import Thing from "../../../src/lib/thing";

// the name given to us here is the "uniqueName" of the matched
// device, we use this as a kind of address
export default class RGBB extends Thing {
  // we can define methods that interact with the device,
  // using the 'send' primitive, which writes data (bytes) and gets data (bytes)
  async setRGB(r: number, g: number, b: number) {
    let datagram = new Uint8Array(3);
    datagram[0] = 255 - r * 255;
    datagram[1] = 255 - g * 255;
    datagram[2] = 255 - (b * 255) / 2;
    await this.send("setRGB", datagram);
  }

  async setLED(state) {
    let datagram = new Uint8Array([state]);
    await this.send("setLED", datagram);
  }

  async blinkLED(pulse) {
    let datagram = new Uint8Array(4);
    writeFloat32(datagram, 0, pulse);
    await this.send("blinkLED", datagram);
  }

  async getButtonA() {
    let res = await this.send("getButtonA", new Uint8Array([]));
    if (res[0] > 0) {
      return true;
    } else {
      return false;
    }
  }

  async getButtonB() {
    let res = await this.send("getButtonB", new Uint8Array([]));
    if (res[0] > 0) {
      return true;
    } else {
      return false;
    }
  }

  // then we can docs our API,
  api = [
    {
      name: "getButtonA",
      args: [],
      return: "0 or 1"
    },
    {
      name: "getButtonB",
      args: [],
      return: "0 or 1"
    }
  ]
}
