
let maxl = createMAXL({
  motionAxes: ["x", "y"],
  subscriptions: [
    {
      actuator: "xMotor",
      track: "x", 
      reader: "stepper",
    },    
    {
      actuator: "ylMotor",
      track: "y", 
      reader: "stepper",
    },    
    {
      actuator: "yrMotor",
      track: "y", 
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
await xMotor.setCurrentScale(0.25);     // has 0R100
await ylMotor.setCurrentScale(0.75);    // both have 0R300
await yrMotor.setCurrentScale(0.75);

console.warn(`(2) homing... ?`);

let start = 0;

await maxl.addSegmentToQueue([1000, 0], 150, 50);

start = performance.now();

while(start + 2500 > performance.now()){
  if(await xMotor.getLimitState()){
    console.warn(`X LIMIT`);
    await maxl.halt();
    break;
  }
  await delay(10);
}

await maxl.addSegmentToQueue([0, 500], 100, 25);

start = performance.now();

while(start + 2500 > performance.now()){
  if(await ylMotor.getLimitState()){
    console.warn(`YL LIMIT`);
    await maxl.halt();
    break;
  }
  await delay(10);
}

console.warn(`start delay...`)
await delay(500);
console.warn(`end delay...`)

await maxl.halt();
await maxl.addSegmentToQueue([-100, -100], 150, 50);

// await maxl.addSegmentToQueue([100], 150, 50);
// await maxl.addSegmentToQueue([150], 150, 50);

console.warn(`...`)

// await xMotor.setCurrentScale(0.0)