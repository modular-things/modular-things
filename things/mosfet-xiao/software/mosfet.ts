import Thing from "../../../src/lib/thing";

export default class mosfet extends Thing {
  async setGate(duty: number) {
    if (duty > 1) duty = 1;
    if (duty < 0) duty = 0;
    await this.send("setGate", new Uint8Array([255 * duty]));
  }

  async pulseGate(duty: number, duration: number){
    if (duty > 1) duty = 1;
    if (duty < 0) duty = 0;
    if (duration > 255) duration = 255;
    if (duration < 0) duration = 0;
    await this.send("pulseGate", new Uint8Array([255 * duty, duration]));
  }

  public api = [
    {
      name: "setGate",
      args: [
        "duty: 0 to 1"
      ],
    }, {
      name: "pulseGate", 
      args: [
        "duty: 0 to 1",
        "duration: 0 to 255 (ms)"
      ]
    }
  ]
}
