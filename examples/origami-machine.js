
// so we probably want... 
// acceleration settings, etc, lol 
let maxl = createMAXL({
  motionAxes: ["x"],
  subscriptions: [
    {
      device: "xMotor", 
      track: "x", 
      listener: "stepper",
    }
  ]
})
maxl.setAccel(500);

xMotor.setCurrentScale(0.55);
xMotor.setStepsPerUnit(100);
xMotor.setDirInversion(true);
await xMotor.publishSettings();

await maxl.begin();

await maxl.addSegmentToQueue({
  endPos: [400],
  velocity: 200,
  junction: 10,
})

// we should write a better / re-useable homing utility 
for(let i = 0; i < 1000; i ++){
  if(await xMotor.getLimitState() == false){
    break; 
  } else {
    await delay(50);
  }
}
await maxl.halt();
console.warn(`halted...`);

await maxl.awaitMotionEnd();
xMotor.setCurrentScale(0);
await xMotor.publishSettings();