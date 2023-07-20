import Serializers from "../src/lib/osapjs/utils/serializers";

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
  ],
  auxiliaryDevices: ["accel"]
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
await maxl.addSegmentToQueue([-150, -150], 150, 50);
console.warn(`await end...`);
await maxl.awaitMotionEnd();
console.warn(`awaited...`);
await maxl.halt();

// await maxl.addSegmentToQueue([100], 150, 50);
// await maxl.addSegmentToQueue([150], 150, 50);

// now sub 2 accel

let stash = [] 

accel.on("linearAcceleration", (data) => {
  // console.warn(`got data here`, data);
  // let rptr = 0;
  let obj = {
    time: Serializers.readUint32(data, 0),
    x: Serializers.readFloat32(data, 4),
    y: Serializers.readFloat32(data, 8),
    z: Serializers.readFloat32(data, 12),
  }
  // let's get the mag of all three, 
  let accelMag = Math.sqrt(obj.x * obj.x  + obj.y * obj.y + obj.z * obj.z)
  let maxlStates = maxl.getStatesAtTime(obj.time / 1000000)
  console.log(`acc: ${accelMag.toFixed(3)} \t ${maxlStates.accel}`)
  obj.accel = maxlStates.accel;
  obj.unitX = maxlStates.unitX;
  obj.unitY = maxlStates.unitY;
  obj.unitZ = maxlStates.unitZ; 
  stash.push(obj);
  // console.log("maxl...", maxl.getStatesAtTime(obj.time / 1000000))
  // console.log(data[0], data[1], data[2], data[3])
})

console.warn(`...`);

// ------------ testpath ingest 
for(let p = 0; p < maxl.testPath.length; p ++){
  try {
    console.log(`${p} / ${maxl.testPath.length}`);
    // if(p > 32) break;
    await maxl.addSegmentToQueue(maxl.testPath[p], 200, 50);
  } catch (err) {
    console.error(err);
    break; 
  }
}

await maxl.awaitMotionEnd()

function saveObjectAsJSON(object, filename) {
  // Convert object to JSON string
  const jsonString = JSON.stringify(object, null, 2);
  
  // Create a Blob with the JSON data
  const blob = new Blob([jsonString], { type: 'application/json' });
  
  // Create a URL for the Blob
  const url = URL.createObjectURL(blob);
  
  // Create a temporary <a> element to trigger the download
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // Append the link to the document and click it programmatically
  document.body.appendChild(link);
  link.click();
  
  // Clean up by removing the temporary link and revoking the URL
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

console.log(`THE OBJ`)
saveObjectAsJSON(stash, "accelStash.json")

// await xMotor.setCurrentScale(0.0)