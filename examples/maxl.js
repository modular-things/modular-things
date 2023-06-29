// http://localhost:3000/modular-things/?file=maxl.js&panel=devices&panelWidth=40 
// hello maxl 

let maxl = createMAXL([maxlOne])

await maxlOne.setCurrentScale(0.4)

for(let p = 0; p < maxl.testPath.length; p ++){
  console.log(`${p} / ${maxl.testPath.length}`)
  if(p > 32) break;
  await maxl.addSegmentToQueue(maxl.testPath[p], 250, 25)
}

