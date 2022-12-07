// xylophone.js
// Jake Read, Quentin Bolsee
// MIT license 2022

// let's calculate the steps-per-unit,
let circ = 64.5;

// with 800 steps per revolution,
let spu = 800 / circ;

// in mm
let noteInterval = 23.925;

// offset of 1st note from origin, mm
let noteOffset = [20.0, 38.0];

// padding at the beginning
// should give enough time for to reach 1st note
function pad_song(song, n_pad) {
  for (let i=0; i < n_pad; i++) {
    song.unshift([0, 0]);
  }
}

function assign_moves(song, moves1, moves2, thwaps1, thwaps2) {
  var n1, n2, pos1, pos2, i_last1, i_last2;
  var m1, m2;
  pos1=0;
  pos2=0;
  i_last1=0;
  i_last2=0;

  for (let i=0; i < song.length; i++) {
    n1 = song[i][0];
    n2 = song[i][1];
    if (n1 == 0 && n2 == 0)
      continue;
    if (n1 != 0 && n2 != 0) {
      let max_dist = Math.max(Math.abs(n1-pos1), Math.abs(n2-pos2));
      let max_dist_alt = Math.max(Math.abs(n2-pos1), Math.abs(n1-pos2));
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
    await mallets[m].setGate(1);
    setTimeout(async () => {
      await mallets[m].setGate(0);
    }, 5)
  } catch (err) {
    console.error(err);
  }
}

let note_to_pos = (n, m) => {
  return (n - 1) * noteInterval + noteOffset[m];
}

const el = document.createElement("div");
el.classList.add("container");

const style = `
  <style>
    .container {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
    }

    .whack1 {
      height: 50%;
      background: lightblue;
      position: relative;
    }

    .whack2 {
      height: 50%;
      background: lightred;
      position: relative;
    }

    .button-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 10px;
    }

    .vertical-bar {
      position: absolute;
      background: black;
      height: 100%;
      width: 1px;
      transform: translate(-50%, 0);
    }

    .horizontal-bar {
      position: absolute;
      background: black;
      width: 100%;
      height: 1px;
      transform: translate(0, -50%);
    }

    .whack-indicator {
      position: absolute;
      background: grey;
      width: 5px;
      height: 5px;
    }

    .whack-off {
      display: none;
    }
  </style>
`

const view = `
  ${style}
  <div class="whack1"></div>
  <div class="whack2"></div>
  <div class="button-container"><button>play</button></div>
`

el.innerHTML = view;

render(el);

const whack1 = el.querySelector(".whack1");
const whack2 = el.querySelector(".whack2");

const { width, height } = whack1.getBoundingClientRect();

const cellWidth = width/32;
const cellHeight = height/14;

const whack1Music = {};
const whack2Music = {};

for (let x = 0; x < 32; x++) {
  for (let y = 0; y < 14; y++) {
    whack1Music[`${x}_${y}`] = false;
    whack2Music[`${x}_${y}`] = false;

    const whackIndicator1 = document.createElement("div");
    whackIndicator1.classList.add("whack-indicator");
    whackIndicator1.classList.add(`whack-x${x}-y${y}`);
    whackIndicator1.classList.add(`whack-off`);
    whackIndicator1.style.left = `${x*cellWidth}px`;
    whackIndicator1.style.top = `${y*cellHeight}px`;
    whackIndicator1.style.width = `${cellWidth}px`;
    whackIndicator1.style.height = `${cellHeight}px`;
    whack1.append(whackIndicator1);

    const whackIndicator2 = document.createElement("div");
    whackIndicator2.classList.add("whack-indicator");
    whackIndicator2.classList.add(`whack-x${x}-y${y}`);
    whackIndicator2.classList.add(`whack-off`);
    whackIndicator2.style.left = `${x*cellWidth}px`;
    whackIndicator2.style.top = `${y*cellHeight}px`;
    whackIndicator2.style.width = `${cellWidth}px`;
    whackIndicator2.style.height = `${cellHeight}px`;
    whack2.append(whackIndicator2);
  }
}

for (let i = 0; i < 32; i++) {
  const el1 = document.createElement("div");
  el1.classList.add("vertical-bar");
  el1.style.left = `${cellWidth*i}px`;
  whack1.append(el1);

  const el2 = document.createElement("div");
  el2.classList.add("vertical-bar");
  el2.style.left = `${cellWidth*i}px`;
  whack2.append(el2);
}


for (let i = 0; i < 14; i++) {
  const el1 = document.createElement("div");
  el1.classList.add("horizontal-bar");
  el1.style.top = `${cellHeight*i}px`;
  whack1.append(el1);

  const el2 = document.createElement("div");
  el2.classList.add("horizontal-bar");
  el2.style.top = `${cellHeight*i}px`;
  whack2.append(el2);
}

function getMouse(e, el) {
  const x = e.pageX - el.offsetLeft;
  const y = e.pageY - el.offsetTop;

  return [x, y];
}


whack1.addEventListener("click", (e) => {
  const [xpx, ypx ] = getMouse(e, whack1);

  const x = Math.floor(xpx/width*32);
  const y = Math.floor(ypx/height*14)-1;
  const key = `${x}_${y}`;
  const og = whack1Music[key];

  for (let i = 0; i < 14; i++) {
    const key = `${x}_${i}`;
    const whackIndicator = whack1.querySelector(`.whack-x${x}-y${i}`);
    whackIndicator.classList.add("whack-off");
    whack1Music[key] = false;
  }

  if (!og) {
    whack1Music[key] = true;
    const whackIndicator = whack1.querySelector(`.whack-x${x}-y${y}`);
    whackIndicator.classList.toggle("whack-off");
  }
})

whack2.addEventListener("click", (e) => {
  const [ xpx, ypx ] = getMouse(e, whack2);

  const x = Math.floor(xpx/width*32);
  const y = Math.floor(ypx/height*14)-1;
  const key = `${x}_${y}`;
  const og = whack2Music[key];

  for (let i = 0; i < 14; i++) {
    const key = `${x}_${i}`;
    const whackIndicator = whack2.querySelector(`.whack-x${x}-y${i}`);
    whackIndicator.classList.add("whack-off");
    whack2Music[key] = false;
  }

  if (!og) {
    whack2Music[key] = true;
    const whackIndicator = whack2.querySelector(`.whack-x${x}-y${y}`);
    whackIndicator.classList.toggle("whack-off");
  }
})

function getSong() {
  const song = [];


  for (let x = 0; x < 32; x++) {

    let whack1Note = 0;
    let whack2Note = 0;

    for (let y = 0; y < 14; y++) {
      const key = `${x}_${y}`;

      if (whack1Music[key]) {
        whack1Note = y;
        break;
      }
    }

    for (let y = 0; y < 14; y++) {
      const key = `${x}_${y}`;

      if (whack2Music[key]) {
        whack2Note = y;
        break;
      }
    }

    song.push([
      whack1Note,
      whack2Note
    ])
  }

  return song;
}

el.querySelector("button").addEventListener("click", () => {
  play_song(getSong());
  console.log(getSong());
  console.log(whack1Music, whack2Music);
})

// things
let motors = [aMotor, bMotor];
let mallets = [aMallet, bMallet];


async function play_song(song) {
  // config
  for (let m of motors) {
    await m.setPosition(0);
    await m.setStepsPerUnit(spu);
    await m.setCurrentScale(0.8);
    await m.setAccel(10000);
    await m.setVelocity(400);
  }

  pad_song(song, 1);

  // in ms
  let noteDuration = 250;

  // for each time slot, whether to hit the note and where to move next, if needed
  let thwaps1 = new Array(song.length).fill(false);
  let thwaps2 = new Array(song.length).fill(false);
  let moves1 = new Array(song.length).fill(0);
  let moves2 = new Array(song.length).fill(0);
  assign_moves(song, moves1, moves2, thwaps1, thwaps2);

  let thwaps = [thwaps1, thwaps2];
  let moves = [moves1, moves2];

  // first note
  for (let m = 0; m < 2; m++) {
    if (moves[m][0] > 0)
      motors[m].absolute(note_to_pos(moves[m][0], m));
  }
  for (let m = 0; m < 2; m++) {
    await motors[m].awaitMotionEnd();
  }

  // next notes
  for (let s = 1; s < song.length; s++) {
    try {
      console.warn(s);
      for (let m = 0; m < 2; m++){
        // thwap if needed
        if (thwaps[m][s])
          // true
          await thwap(m);
        // move if needed
        if (moves[m][s] > 0)
          motors[m].absolute(note_to_pos(moves[m][s], m));
      }
      await sleep(noteDuration);
    } catch (err) {
      console.error(err);
      break;
    }
  }

  // well that was fun, now back to origin
  for (let m = 0; m < 2; m++) {
    await motors[m].absolute(0);
  }
  for (let m = 0; m < 2; m++) {
    await motors[m].awaitMotionEnd();
    await motors[m].setCurrentScale(0);
  }
}
