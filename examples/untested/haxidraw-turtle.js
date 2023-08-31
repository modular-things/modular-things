/* MACHINE DEFINITION */

await motor0.setCurrentScale(0.6);
await motor0.setStepsPerUnit(200);

await motor1.setCurrentScale(0.6);
await motor1.setStepsPerUnit(200);

const machine = createSynchronizer([motor0, motor1]);

async function penUp() {
  await servo.writeMicroseconds(4);
}

async function penDown() {
  await servo.writeMicroseconds(7);
  await delay(500);
}


async function goTo(x, y) {
  await machine.absolute([x+y, y-x]);
}

/* TURTLE CLASS */

class Turtle {
  constructor() {
    this.drawing = true;
    this.location = { x: 0, y: 0 };
    this.angle = 0;
    this.path = [
      [{ x: 0, y: 0 }]
    ];
    
    this.size = 1;
    this.color = "black";
  }

  up() {
    this.drawing = false;
    this.path.push([{...this.location}])
    return this;
  }

  down() {
    this.drawing = true;
    return this;
  }

 

  goTo(x, y) {

    const lastPath = this.path.at(-1);
    if (this.drawing) {
      lastPath.push({x, y});
    } else {
      if (lastPath.length === 1) lastPath[0] = {x, y};
    }

    this.location = { x, y };
    
    return this;
  }



  forward(distance) {
    const last = this.location;
    const a = this.angle/180 * Math.PI;
    const x = last.x + distance * Math.cos(a);
    const y = last.y + distance * Math.sin(a);

    this.goTo(x, y);

    return this;
  }

  arc(angle, radius) {
    const theta = Math.abs(angle);
    
    const length = radius*theta/180*Math.PI;

    const ogAngle = this.angle;
    const thetaStep = 1;
    const steps = theta/thetaStep;
    const distanceStep = length/steps;

    for (let i = 0; i < steps; i++) {
      if (angle >= 0) this.right(thetaStep);
      else this.left(thetaStep);

      this.forward(distanceStep);
    }

    this.setAngle(ogAngle + angle);

    return this;
  }

  setAngle(theta) {
    this.angle = theta;

    return this;
  }

  right(theta) {
    this.angle += theta;

    return this;
  }

  left(theta) {
    this.angle -= theta;

    return this;
  }

  draw([scaleX, scaleY], limits = null) {
    
    const view = `
      <style>
        .svg-container {
          width: 100%;
          height: 100%;
          margin: 0px;
          padding: 0px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
        }

        .svg-viewer {
          width: 90%;
          height: 90%;
          border: 1px black solid;
          margin: 10px;
        }
      </style>
      <div class="svg-container">
        <svg class="svg-viewer">
          <g class="transform-group">
            <rect 
              width=${machineWidth} 
              height=${machineHeight} 
              x="0" 
              y="0"
              fill="none"
              stroke="orange"
              stroke-width="3"
              vector-effect="non-scaling-stroke"
              style="scale: ${scaleX} ${scaleY};"/>
            ${drawPath(this.path)}
          </g>
        </svg>
        <div>
          <button class="set-origin-trigger">set origin</button>
          <button class="run-trigger">run</button>
        </div>
      </div>
    `
    
    
    function drawPath(path) {
      let d = "";
      path.forEach(polyline => {
        polyline.forEach((pt, i) => {
          let {x, y} = pt;
          x = x*scaleX;
          y = y*scaleY;
          if (i === 0) d += `M ${x} ${y}`
          else d += `L ${x} ${y}`
        })
      })
      return `
        <path d="${d}" stroke="black" stroke-width="2px" fill="none" vector-effect="non-scaling-stroke"/>
      `
    }

    viewWindow.innerHTML = view;

    const panZoom = addPanZoom(viewWindow.querySelector("svg"));

    document
      .querySelector(".set-origin-trigger")
      .addEventListener("click", () => {
        if (!machine) return;
        machine.setPosition([0, 0]); 
      })

    document
      .querySelector(".run-trigger")
      .addEventListener("click", () => {
        t.runMachine(SCALE);
      })

    if (limits) {
      panZoom.setScaleXY(limits);
    }
  }

  async runMachine([scaleX, scaleY]) {

    for (const polyline of this.path) {
      for (let i = 0; i < polyline.length; i++) { 
        const {x, y} = polyline[i];
        if (i === 0) await penUp();
        else if (i === 1) await penDown();
        
        await goTo(x/scaleX, y/scaleY);
      }
    }

    await penUp();
  }

  
}

/* HELPERS */

function trigger(e) {
  return e.composedPath()[0];
}

function matchesTrigger(e, selectorString) {
  return trigger(e).matches(selectorString);
}

// create on listener
function createListener(target) {
  return (eventName, selectorString, event) => {
    // focus doesn't work with this, focus doesn't bubble, need focusin
    target.addEventListener(eventName, (e) => {
      e.trigger = trigger(e); // Do I need this? e.target seems to work in many (all?) cases
      if (selectorString === "" || matchesTrigger(e, selectorString)) event(e);
    });
  };
}

function addPanZoom(el) {
  const listen = createListener(el);

  let mousedown = false;

  let scale = 1;
  let pointX = 0;
  let pointY = 0;
  let start = { x: 0, y: 0 };
  let pause = false;

  function setTransform(el) {
    el.style.transformOrigin = `${0}px ${0}px`;
    el.style.transform =
      "translate(" + pointX + "px, " + pointY + "px) scale(" + scale + ")";
  }

  function svgPoint({ x, y }) {
    let newX = (x - pointX) / scale;
    let newY = (y - pointY) / scale;

    return { x: newX, y: newY };
  }

  listen("pointerdown", "", (e) => {
    if (e.shiftKey) return;
    if (pause) return;

    mousedown = true;

    start = { x: e.offsetX - pointX, y: e.offsetY - pointY };

    if (e.detail === 2) {}
  });

  listen("pointermove", "", (e) => {
    if (!mousedown) return;

    pointX = e.offsetX - start.x;
    pointY = e.offsetY - start.y;

    const imgs = el.querySelectorAll(".transform-group");

    for (const img of imgs) {
      setTransform(img);
    }
  });

  listen("pointerup", "", (evt) => {
    mousedown = false;
  });

  listen("wheel", "", (e) => {
    let xs = (e.offsetX - pointX) / scale;
    let ys = (e.offsetY - pointY) / scale;

    if (Math.sign(e.deltaY) < 0) scale *= 1.03;
    else scale /= 1.03;

    pointX = e.offsetX - xs * scale;
    pointY = e.offsetY - ys * scale;

    const imgs = el.querySelectorAll(".transform-group");
    for (const img of imgs) {
      setTransform(img);
    }

    e.preventDefault();
  });

  function setScaleXY(limits) {
    const bb = el.getBoundingClientRect();
    const xr = limits.x[1] - limits.x[0];
    const yr = limits.y[1] - limits.y[0];
    const xScalingFactor = bb.width / xr;
    const yScalingFactor = bb.height / yr;

    const scalingFactor = Math.min(xScalingFactor, yScalingFactor) * 0.9;

    scale = scalingFactor;

    const center = {
      x: ((limits.x[0] + limits.x[1]) / 2) * scalingFactor - bb.width / 2,
      y: ((limits.y[0] + limits.y[1]) / 2) * scalingFactor - bb.height / 2,
    };

    pointX = -center.x;
    pointY = -center.y;

    const imgs = document.querySelectorAll(".transform-group");
    for (const img of imgs) {
      setTransform(img);
    }
  }

  function corners() {
    const { left, right, bottom, top, width, height } =
      el.getBoundingClientRect();
    // need rt, lt, rb, lb
    const rt = svgPoint({ x: width, y: height });
    // rt.y = -rt.y
    const lt = svgPoint({ x: 0, y: height });
    // lt.y = -lt.y
    const rb = svgPoint({ x: width, y: 0 });
    // rb.y = -rb.y
    const lb = svgPoint({ x: 0, y: 0 });
    // lb.y = -lb.y

    return { rt, lt, rb, lb };
  }

  return {
    scale: () => scale,
    x: () => pointX,
    y: () => pointY,
    corners,
    svgPoint,
    setScaleXY,
    pause: () => { pause = true },
    start: () => { pause = false },
  };
}

/* TURTLE SCRIPT */

const machineWidth = 5;
const machineHeight = 4;

const SCALE = [.6, -.6];

const t = new Turtle();

function main() {
  t.up();
  t.goTo(2, 3);
  t.down();
  for (let i = 0; i < 30; i++) {
    t.forward(i/100*2);
    t.right(61);
    t.left(1.2);
  }


  const limits = {
    x: [0, machineWidth*SCALE[0]].sort((a, b) => a-b),
    y: [0, machineHeight*SCALE[1]].sort((a, b) => a-b)
  };

  t.draw(SCALE, limits);


}


main();

