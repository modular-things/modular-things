// make the maxl

let maxl = createMAXL({
  motionAxes: ["x", "y", "z"],
  transformedAxes: ["a", "b"],
  // tf goes from motionAxes -> transformedAxes 
  transformForwards: (xyz) => {
    // see http://corexy.com/theory.html
    let a = 0.5 * (xyz[0] + xyz[1]);
    let b = 0.5 * (xyz[0] - xyz[1]);
    // return an array of "transformed axes" length 
    return [a, b]
  },
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

// startup maxl 
await maxl.begin();

// sendy to top-right corner, 
// first out, then back
// ... limits would be hot / sexy, alas 
await maxl.addSegmentToQueue({
  endPos: [140, 0, 10],
  velocity: 150,
  junction: 25,
})
await maxl.awaitMotionEnd()
await maxl.addSegmentToQueue({
  endPos: [140, 150, 10],
  velocity: 150,
  junction: 25,
})
await maxl.awaitMotionEnd()

// maxl already thinks it's up at 150, 150, 
// so we are good for origin-setting, 

let path = maxl.testPaths.clicky2D;
for(let pt of path){
  console.warn(pt)
  await maxl.addSegmentToQueue({
    endPos: pt,
    velocity: 100, 
    junction: 10
  })
}