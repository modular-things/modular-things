// setup 

let maxl = createMAXL({
  motionAxes: ["x"],
  subscriptions: [
    {
      actuator: "xMotor", 
      track: "x", 
      reader: "stepper",
    }
  ]
})

await maxl.begin();

await xMotor.setCurrentScale(0.25);

// ------------ testpath ingest 
for(let p = 0; p < maxl.testPath.length; p ++){
  try {
    console.log(`APP TX: ${p} / ${maxl.testPath.length}`);
    // if(p > 32) break;
    await maxl.addSegmentToQueue({
      endPos: maxl.testPath[p],
      velocity: 200,
      junction: 25
    });
  } catch (err) {
    console.error(err);
    break; 
  }
}