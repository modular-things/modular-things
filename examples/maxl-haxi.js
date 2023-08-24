// make the maxl

let maxl = createMAXL({
  motionAxes: ["a", "b", "z"],
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
    },
    {
      device: "haxiBoard", 
      track: "z", 
      listener: "servo"
    }
  ],
})

await maxl.begin();

await maxl.addSegmentToQueue({
  endPos: [50, 50, 10],
  velocity: 200,
  junction: 50,
})

await maxl.addSegmentToQueue({
  endPos: [100, 0, 15],
  velocity: 200,
  junction: 50,
})

await maxl.addSegmentToQueue({
  endPos: [0, 100, 0],
  velocity: 200,
  junction: 50,
})