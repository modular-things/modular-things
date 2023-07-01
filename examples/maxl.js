// http://localhost:3000/modular-things/?file=maxl.js&panel=devices&panelWidth=40 

// let maxl = createMAXL([maxlOne, maxlTwo]);
// let maxl = createMAXL([maxlOne])

let maxl = createMAXL({
  actuators: [maxlOne, maxlTwo],
  motionAxes: ["x", "y"],
  // optional ?
  transformedAxes: ["a", "b"],
  transformForwards: (cartesian) => {
    let actuators = new Array(cartesian.length);
    actuators[0] = cartesian[0] + cartesian[1];
    actuators[1] = cartesian[0] - cartesian[1];
  },
  transormReverse: (actuators) => {}, // etc... 
})

maxl.subscribe({
  actuator: maxlOne,
  track: "a",           // basically a tx-er 
  reader: "position",   // basically the rx-er 
})

// so we should set the thing up such that we *cannot* have 
// "actuator" and "cartesian" names that are the same, 
// then we make each-and-every one available as a track, 
// along with the default track "velocity", 

await maxlOne.setCurrentScale(0.25);
await maxlTwo.setCurrentScale(0.25);

// we need to get the things all sync'd etc, 
await maxl.begin();

// await maxlOne.setAxis(0); // set to x 
// await maxlTwo.setAxis(1); // set to y, 

// await maxl.addSegmentToQueue([10], 100, 25)
// await maxl.addSegmentToQueue([1100], 100, 25)

// while(true){
//   let switchState = await maxlOne.getLimitState();
//   if(switchState){
//     console.log("bail!")
//     await maxl.halt();
//     break;
//   }
// }

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

// the coolest would be like
// maxl.config({
//   motionAxes: ["x", "y", "z"],                          // these deploy junction-deviation 
//   motionSyncedAxes: [{ name: "e1", mode: "relative" }], // these are sync'd along, but don't, 
//   velocityScaledTracks: ["las"],
// })

// and... sth similar for actuator-subscriptions ? 
/*
// get position-type tracks
// altho we would want to, say, have the  
// motors say "I have two motor-outputs..."
// then we map... motionAxes to actuatorNames, sth ?  
// IDK, maybe: 
maxlTS.align({
  motionAxis: "x",
  actuator: "maxlOne", 
  track: "a"
})
maxl.subscribeToMotion("a", onPositionDelta)
// get velocity-scaled
maxl.subscribeToScalar("") ... 
*/