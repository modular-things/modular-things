let corexy = createSynchronizer([aMotor, bMotor])
console.log(corexy)

aMotor.setCurrentScale(0.75)
aMotor.setStepsPerUnit(20)
bMotor.setCurrentScale(0.75)
bMotor.setStepsPerUnit(20)

aMotor.setVelocity(500)
aMotor.setAccel(750)
bMotor.setVelocity(500)
bMotor.setAccel(750)

// let's do... get-set
loop(async () => {
  let posns = await Promise.all([joypot.readPotentiometer(0), joypot.readPotentiometer(1)])
  posns[0] *= 100
  posns[1] *= 100
  await corexy.target(posns)
}, 100)
