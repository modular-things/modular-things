// http://localhost:3000/modular-things/?file=maxl.js&panel=devices&panelWidth=40 

// fantasy API 
// (1) system config 
// so, the idea being... the union of "motionAxes" and "transformedAxes" is 
// a set, i.e. the union has no duplicates, 
// so we can then subscribe axes by unique track names... 
// let maxl = createMAXL({
//   // the list of actuators... is actually just a list of names for MAXL's sake, innit ? 
//   actuators: ["maxlOne", "maxlTwo"],
//   motionAxes: ["x", "y"],
//   subscriptions: [
//     {
//       actuator: "maxlOne", 
//       track: "x",         // the tx'er / track name; a maxl output, basically 
//       reader: "stepper",  // the rx'er track's name; an input name, basically... 
//     },
//     {
//       actuator: "maxlTwo", 
//       track: "y",         
//       reader: "stepper",  
//     }
//   ]
//   // optional ?
//   // transformedAxes: ["a", "b"],
//   // transformForwards: (cartesian) => {
//   //   let actuators = new Array(cartesian.length);
//   //   actuators[0] = cartesian[0] + cartesian[1];
//   //   actuators[1] = cartesian[0] - cartesian[1];
//   // },
//   // transormReverse: (actuators) => {}, // etc... 
// })

let maxl = createMAXL({
  // actuators: ["maxlOne"],
  motionAxes: ["x", "y"],
  subscriptions: [
    {
      actuator: "maxlOne",  // should be "device", non ? 
      track: "x",           // since we could have multiple actu per cpu
      reader: "stepper"
    },
    {
      actuator: "maxlTwo", 
      track: "y",         
      reader: "stepper",  
    }
  ]
})

// (2) setup 
// we need to get the things all sync'd etc, 
await maxl.begin();

// ------------ turn motors on... 
// CHECK YOUR RSENSE: DONOT exceed 0.1 when using 0R100 RSENSE 
await maxlOne.setCurrentScale(0.1);
await maxlTwo.setCurrentScale(0.1);

// await maxl.addSegmentToQueue([10], 100, 25)
// await maxl.addSegmentToQueue([1100], 100, 25)

// ------------ testpath ingest 
for(let p = 0; p < maxl.testPath.length; p ++){
  try {
    console.log(`${p} / ${maxl.testPath.length}`);
    // if(p > 32) break;
    await maxl.addSegmentToQueue(maxl.testPath[p], 250, 5);
  } catch (err) {
    console.error(err);
    break; 
  }
}

// ------------ limit switch code 
// while(true){
//   let switchState = await maxlOne.getLimitState();
//   if(switchState){
//     console.log("bail!")
//     await maxl.halt();
//     break;
//   }
// }

// ------------ config sketch 
// the coolest would be like
// maxl.config({
//   motionAxes: ["x", "y", "z"],                          // these deploy junction-deviation 
//   motionSyncedAxes: [{ name: "e1", mode: "relative" }], // these are sync'd along, but don't, 
//   velocityScaledTracks: ["las"],
// })
