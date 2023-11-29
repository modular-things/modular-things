// assuming we have a `simple` motor as `motor.`
let motor = xMotor

// the extent of our axis, in whatever units, 
let extent = 180

// how many steps (of the motor, 200 per motor revolution) for one of our units ?
// in i.e. the rotary axis, we have 200 revs, plus a 125:20 reduction (6.25)
// that's 1250 steps per output revolution, and we'd like to use degrees, so:
let stepsPerUnit = 1250 / 360 

// the amount of motor-power to use: 0 for none, 1.0 for all of it, 
let motorCurrent = 1.0  

// acceleration to use, units/sec/sec 
let accel = 3600

// homing settings 
let backoffSize = 30
let backoffRate = 360
let homeRate = 180

// a speed to jog around at 
let joggingRate = 360


let setup = async () => {
  console.log(`setting up the motor...`)
  await motor.setCurrent(motorCurrent);
  await motor.setStepsPerUnit(stepsPerUnit);
  await motor.setAccel(accel);
}


let home = async () => {
  // if we're already on the switch, back off it: 
  if (await motor.getLimitState()) {
    console.log(`backing off...`);
    await motor.relative(backoffSize, backoffRate);
  }
  // now return while checking switch state, 
  console.log(`homing towards switch...`)
  await motor.velocity(-homeRate);
  // hang while the switch is low, pass/clear when hi 
  while (!(await motor.getLimitState()));
  // stop !
  console.log(`found the switch...`)
  await motor.stop();
}


await setup();
await home();


console.log(`jogging around`)
await motor.setPosition(0);
await motor.absolute(extent, joggingRate);
await motor.absolute(0, joggingRate);
