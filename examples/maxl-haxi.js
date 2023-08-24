// make the maxl

let maxl = createMAXL({
  motionAxes: ["a", "b"],
  subscriptions: [
    {
      device: "haxiBoard",
      track: "a",
      listener: "aStepper",
    },
    {
      device: "haxiBoard",
      track: "b",
      listener: "bStepper",
    }
  ],
})

await maxl.begin();

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