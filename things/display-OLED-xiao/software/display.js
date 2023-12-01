import Thing from "../../../src/lib/thing";

// the name given to us here is the "uniqueName" of the matched
// device, we use this as a kind of address
export default class display extends Thing {
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

  async setText(text, textSize=2) {
    try {
      const utf8Encode = new TextEncoder();
      const datagram_txt = utf8Encode.encode(text);
      const datagram = new Uint8Array(datagram_txt.length+1);
      datagram[0] = textSize;
      for (let i=0; i < datagram_txt.length; i++) {
        datagram[i+1] = datagram_txt[i];
      }
      await this.send("setText", datagram);
    } catch (err) {
      console.error(err);
    }
  }

  api = [
    {
      name: "setText",
      args: [
      "text: string",
      "textSize=2: 1 to 16"
      ]
    }
  ]
}
