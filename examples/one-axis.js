// assuming we have a `simple` motor as `motor.`

let motor = {}

let extent = 100        // in mm, for example 
let stepsPerUnit = 80   // calculation for this... 
let maxRate = 400       // in units / second
let maxAccel = 1000     // in units / second / second 
let motorCurrent = 0.3  // this is 0-1, depends on the driver spec... 
let flipDir = false     // ... if we are homing *away* from the switch 

let homeRate = 10 

let setup = async () => {
  await motor.setCurrent(motorCurrent);
  await motor.setStepsPerUnit(stepsPerUnit);
  await motor.setMaximumVelocity(maxRate);
  await motor.setMaximumAcceleration(maxAccel);
}


let home = async () => {
  // if we're already on the switch, back off it: 
  if(await motor.getSwitchState()){
    await motor.relative(15);
  }
  // now return while checking switch state, 
  await motor.velocity(-homeRate);
  // hang while the switch is low, pass/clear when hi 
  while(!(await motor.getSwitchState()));
  // stop !
  await motor.halt();
}


// our 'motor-main'
await setup();
await home();