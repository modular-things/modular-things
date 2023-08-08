
// make the maxl

let maxl = createMAXL({
  motionAxes: ["a", "b"],
  subscriptions: [
    {
      actuator: "aMotor",
      track: "a",
      reader: "stepper",
    },
    {
      actuator: "bMotor",
      track: "b",
      reader: "stepper",
    }
  ]
})

await maxl.begin();

await aMotor.setCurrentScale(0.35);
await bMotor.setCurrentScale(0.35);

await maxl.addSegmentToQueue({
  endPos: [50, 50],
  velocity: 200,
  junction: 50,
})

await maxl.addSegmentToQueue({
  endPos: [100, 0],
  velocity: 200,
  junction: 50,
})

await maxl.addSegmentToQueue({
  endPos: [0, 100],
  velocity: 200,
  junction: 50,
})