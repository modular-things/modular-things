import Thing from "../../../src/lib/thing";

export default class mosfet extends Thing {
  async setGate(duty: number) {
    try {
      if (duty > 1) duty = 1;
      if (duty < 0) duty = 0;
      await this.send("setGate", new Uint8Array([255 * duty]));
    } catch (err) {
      console.error(err);
    }
  }

  public api = [
    {
      name: "setGate",
      args: [
        "value: 0 to 1"
      ],
    }
  ]
}
