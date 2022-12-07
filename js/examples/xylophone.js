// aMallet, aMotor, 
// bMallet, bMotor, 

// let's calculate the steps-per-unit, 
let circ = 64.5
// with 800 steps per revolution, 
let spu = 800 / circ

let motors = [aMotor, bMotor]

for(let m of motors){
  await m.setStepsPerUnit(spu)
  await m.setCurrentScale(0.75)
  await m.setAccel(5000)
  await m.setVelocity(300)
}

let mallets = [aMallet, bMallet]

// in 1/16 time base (allegedly) 
let song = [
  [0, 0],
  [0, 0],
  [1, 0],
  [0, 0],
  [6, 0],
  [6, 0],
  [6, 0],
  [0, 0],
  [7, 0],
  [0, 0],
  [6, 0],
  [0, 0],
  [5, 0],
  [5, 0],
  [5, 0],
]

let noteInterval = 47.85 / 2
let notes = [
  //  0,    1     2     3     4     5     6     7     8     9     10    11    12    13    
      0,    "C",  "D",  "E",  "F",  "G",  "A",  "B",  "C",  "D",  "E",  "F",  "G",  "A"
]

// for (let n = 0; n < notes.length; n++) {
//   notes[n] = {
//     letter: notes[n],
//     pos: noteInterval * n
//   }
// }

let thwapNote = async (index, m = 0) => {
  try {
    if (index >= notes.length) throw new Error('u r tryna thwap out of bounds')
    await motors[m].absolute(notes[index].pos)
    await mallets[m].setGate(1)
    setTimeout(async () => {
      await mallets[m].setGate(0)
    }, 1)
  } catch (err) {
    console.error(err)
  }
}

let gotoNote = async (index, m = 0) => {
  try {
    if (index >= notes.length) throw new Error('u r tryna go out of bounds')
    if (m >= motors.length) throw new Error('again w/ the out of bounds operation')
    await motors[m].absolute(notes[index].pos)
  } catch (err) {
    console.error(err)
  }
}

let thwap = async (m = 0, op = true) => {
  try {
    if(!op) return 
    await mallets[m].setGate(1)
    setTimeout(async () => {
      await mallets[m].setGate(0)
    }, 1)
  } catch (err) {
    console.error(err)
  }
}

let runTimeSlot = async (slot) => {
  try {
    let notes = song[slot]
    if(!notes) throw new Error("we've gone beyond the song end, I think")
    // thwap if they exist: we should be already-at-the-place, 
    await Promise.all([thwap(0, notes[0]), thwap(1, notes[1])])
    // now look ahead to next positions ? 
    let scheduled = [false, false]
    for(let s = slot + 1; s < song.length; s ++){
      for(let m = 0; m < 2; m ++){
        if(song[s][m] && !scheduled[m]){
          scheduled[m] = true 
          let note = song[s][m]
          motors[m].position((note - 1) * noteInterval)
        }
      }
    }
  } catch (err) {
    console.error(err)
  }
}

