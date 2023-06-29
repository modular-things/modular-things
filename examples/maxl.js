// http://localhost:3000/modular-things/?file=maxl.js&panel=devices&panelWidth=40 

let maxl = createMAXL([maxlOne, maxlTwo])

// we need to get the things all sync'd etc, 
await maxl.begin()

await maxlOne.setCurrentScale(0.25)
await maxlTwo.setCurrentScale(0.25)

await maxlOne.setAxis(0) // set to x 
await maxlTwo.setAxis(1) // set to y, 

// for(let p = 0; p < maxl.testPath.length; p ++){
//   console.log(`${p} / ${maxl.testPath.length}`)
//   if(p > 32) break;
//   await maxl.addSegmentToQueue(maxl.testPath[p], 250, 25)
// }

