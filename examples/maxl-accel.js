
let maxl = createMAXL({
  motionAxes: ["x"],
  subscriptions: [
    {
      actuator: "xMotor",
      track: "x", 
      reader: "stepper",
    }
  ]
});

console.warn(`(1) starting MAXL...`);

await maxl.begin();

// console.warn(`(2) printing home states`)
// for(let i = 0; i < 100; i ++){
//   console.warn(`switch... ${await xMotor.getLimitState()}`);
//   await delay(100);
// } 

console.warn(`(2) motors on...`);

// TODO: we should really stress test these, right? 
// current in coil... current on the PSU... which is it actually? 
await xMotor.setCurrentScale(0.25);

console.warn(`(2) homing... ?`);

// await maxl.addSegmentToQueue([-100], 100, 50)
await maxl.addSegmentToQueue([-1000], 150, 50);

let start = performance.now();

while(start + 2500 > performance.now()){
  if(await xMotor.getLimitState()){
    console.warn(`LIMIT`);
    await maxl.halt();
    break;
  }
}

// await maxl.addSegmentToQueue([100], 150, 50);
// await maxl.addSegmentToQueue([150], 150, 50);

console.warn(`...`)

// await xMotor.setCurrentScale(0.0)