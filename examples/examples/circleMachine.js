let corexy = createSynchronizer([aMotor, bMotor])
console.log(corexy)

aMotor.setCurrentScale(0.55)
aMotor.setStepsPerUnit(20)
bMotor.setCurrentScale(0.55)
bMotor.setStepsPerUnit(20)

// in rads
let radius = 25
for(let i = 0; i < 100; i += 0.2){
  let coord = [Math.sin(i) * radius, Math.cos(i) * radius]
  console.log(coord)
  await corexy.absolute(coord, 1000, 10000)
}
