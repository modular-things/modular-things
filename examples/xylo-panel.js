
// we'll map motor positions to notes,
let notes = [
  'C', 'D', 'E', 'F', 'G', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'A'
]

// we have some config,
let motorCurrent = 0.75 
let motorAccel = 1750
let motorMaxRate = 190 

// let's turn the motor on, resetting state... 
await bottomMotor.setPosition(0);
await bottomMotor.setCurrent(0.75);
// the motor records 200 steps / revolution, though under the hood 
// we have up to 512 microsteps... 
await bottomMotor.setStepsPerUnit(5);

// let's map positions to notes, 

// attach notes to positions, 
let firstCPosition = 287
let positions = notes.map((note, i) => {
  return firstCPosition - (i / (notes.length - 1)) * firstCPosition;
})

// assuming we start at the last 'A' (at right), we can have this as a utility 
let gotoNoteByIndex = async (index) => {
  let pos = positions[index];
  console.log(`goto... ${pos}`)
  await bottomMotor.target(pos, motorMaxRate, motorAccel);
  await bottomMotor.awaitMotionEnd();
}

// let's test each position: 
// for(let i = 0; i < notes.length; i ++){
//   await gotoNoteByIndex(i);
// }

// we debounce pulses, ofc 
let lastPulse = 0;

// a loop to connect our little UI device to the xylo, 
for(let i = 0; i < 2560; i ++){
  // let's get the pot reading and then normalize it across a slew of notes:
  let pot = await panel.getPotentiometerReading();
  // we want to find the closest note and slew to that, to "snap on" 
  let equivalentPos = pot * firstCPosition;
  let closest = positions
    .map((pos, index) => [Math.abs(pos - equivalentPos), index])
    .sort((a, b) => a[0] - b[0])[0];
  // now we have closest = [delta][index]
  console.log(`goto note ${notes[closest[1]]}`)
  await bottomMotor.target(positions[closest[1]], motorMaxRate, motorAccel);

  // await gotoNoteByIndex(closest[1]);
  
  let button = await panel.getButtonState();
  if(button && lastPulse + 250 < Date.now()){
    lastPulse = Date.now();
    bottomFet.pulseGate(1, 25);
  }
  await delay(10);
}

// turn it off at the end of a run, 
await bottomMotor.target(0, motorMaxRate, motorAccel);
await bottomMotor.awaitMotionEnd();
await bottomMotor.setCurrent(0);



  
