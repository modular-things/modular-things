// http://localhost:3000/modular-things/?file=maxl.js&panel=devices&panelWidth=40 
// hello maxl 

let maxl = createMAXL([maxlOne])

await maxlOne.setCurrentScale(0.4)

for(let p of maxl.testPath){
  await maxl.addSegmentToQueue(p, 150, 50)
}