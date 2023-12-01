// xylophone.js
// Jake Read, Quentin Bolsee
// MIT license 2022

// let's calculate the steps-per-unit,
let circ = 40;

// with 200 steps per revolution,
let spu = [200 / circ, - 200 / circ];

// in mm
let noteInterval = 23.925;

// offset of 1st note from origin, mm
let noteOffset = [0.0, 0.0];

// things
let motors = [topMotor, bottomMotor];
let mallets = [topFet, bottomFet];

// config
for (let m = 0; m < motors.length; m++) {
  await motors[m].setPosition(0);
  await motors[m].setStepsPerUnit(spu[m]);
  await motors[m].setCurrent(1.0);
  await motors[m].setAccel(1000);
}

// in ms
let noteDuration = 250;

// in ms, 
let notePulseTime = 20;

// in 0-1, effort 
let notePulseDuty = 1;

// in units / sec
let noteJogRate = 250;

// 13 notes
// in 1/16 time base (allegedly)
// pair of notes, 0 = skip
let song = [
  [1, 0],
  [0, 13],
  [2, 0],
  [0, 12],
  [3, 0],
  [0, 11],
  [4, 0],
  [0, 10],
  [5, 0],
  [0, 9],
  [6, 0],
  [0, 8],
  [7, 0],
  [0, 7],
  [8, 0],
  [0, 6],
  [9, 0],
  [0, 5],
  [10, 0],
  [0, 4],
  [11, 0],
  [0, 3],
  [12, 0],
  [0, 2],
  [13, 0],
  [0, 1],
  [13, 1],
  [12, 2],
  [11, 3],
  [10, 4],
  [9, 5],
  [8, 6],
  [7, 7],
  [6, 8],
  [5, 9],
  [4, 10],
  [3, 11],
  [2, 12],
  [1, 13],
];

let notes = [
  //  0,    1     2     3     4     5     6     7     8     9     10    11    12    13
  0, "C", "D", "E", "F", "G", "A", "B", "C", "D", "E", "F", "G", "A"
];

// padding at the beginning
// should give enough time for to reach 1st note
function pad_song(n_pad) {
  for (let i = 0; i < n_pad; i++) {
    song.unshift([0, 0]);
  }
}

pad_song(1);

function assign_moves() {
  var n1, n2, pos1, pos2, i_last1, i_last2;
  var m1, m2;
  pos1 = 0;
  pos2 = 0;
  i_last1 = 0;
  i_last2 = 0;

  for (let i = 0; i < song.length; i++) {
    n1 = song[i][0];
    n2 = song[i][1];
    if (n1 == 0 && n2 == 0)
      continue;
    if (n1 != 0 && n2 != 0) {
      let max_dist = Math.max(Math.abs(n1 - pos1), Math.abs(n2 - pos2));
      let max_dist_alt = Math.max(Math.abs(n2 - pos1), Math.abs(n1 - pos2));
      if (max_dist_alt < max_dist) {
        moves1[i_last1] = n2;
        moves2[i_last2] = n1;
      } else {
        moves1[i_last1] = n1;
        moves2[i_last2] = n2;
      }
      thwaps1[i] = true;
      thwaps2[i] = true;
      i_last1 = i;
      i_last2 = i;
    } else {
      // find valid note
      let n = Math.max(n1, n2);

      // first moves
      if (i_last1 == 0) {
        assign2 = false;
      } else if (i_last2 == 0) {
        assign2 = true;
      } else {
        let dist1 = Math.abs(pos1 - n);
        let dist2 = Math.abs(pos2 - n);
        assign2 = dist2 < dist1;
      }

      if (assign2) {
        moves2[i_last2] = n;
        thwaps2[i] = true;
        pos2 = n;
        i_last2 = i;
      } else {
        moves1[i_last1] = n;
        thwaps1[i] = true;
        pos1 = n;
        i_last1 = i;
      }
    }
  }
}

let thwap = async (m = 0, op = true) => {
  try {
    if (!op)
      return;
    await mallets[m].pulseGate(notePulseDuty, notePulseTime);
  } catch (err) {
    console.error(err);
  }
}

let note_to_pos = (n, m) => {
  return (n - 1) * noteInterval + noteOffset[m];
}

let sleep = (ms) => {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, ms);
  })
}

// for each time slot, whether to hit the note and where to move next, if needed
let thwaps1 = new Array(notes.length).fill(false);
let thwaps2 = new Array(notes.length).fill(false);
let moves1 = new Array(notes.length).fill(0);
let moves2 = new Array(notes.length).fill(0);
assign_moves();

let thwaps = [thwaps1, thwaps2];
let moves = [moves1, moves2];

//console.log(moves);

for (let m = 0; m < 2; m++) {
  if (moves[m][0] > 0)
    motors[m].absolute(note_to_pos(moves[m][0], m), noteJogRate);
}
for (let m = 0; m < 2; m++) {
  await motors[m].awaitMotionEnd();
}

for (let s = 1; s < song.length; s++) {
  try {
    console.warn(s);
    for (let m = 0; m < 2; m++) {
      // thwap if needed
      if (thwaps[m][s])
        // true
        await thwap(m);
      // move if needed
      if (moves[m][s] > 0)
        motors[m].absolute(note_to_pos(moves[m][s], m), noteJogRate);
    }
    await sleep(noteDuration);
  } catch (err) {
    console.error(err);
    break;
  }
}

// well that was fun, now back to origin
for (let m = 0; m < 2; m++) {
  await motors[m].absolute(0, noteJogRate);
}
for (let m = 0; m < 2; m++) {
  await motors[m].awaitMotionEnd();
  await motors[m].setCurrent(0);
}
