let _ = 0;
let X = 1;

let bitmapHello = [
  [_,X,_,X,_,X,X,X,_,X,_,_,_,X,_,_,_,X,X,X,_,_,],
  [_,X,_,X,_,X,_,_,_,X,_,_,_,X,_,_,_,X,_,X,_,_,],
  [_,X,_,X,_,X,_,_,_,X,_,_,_,X,_,_,_,X,_,X,_,_,],
  [_,X,X,X,_,X,X,X,_,X,_,_,_,X,_,_,_,X,_,X,_,_,],
  [_,X,_,X,_,X,_,_,_,X,_,_,_,X,_,_,_,X,_,X,_,_,],
  [_,X,_,X,_,X,_,_,_,X,_,_,_,X,_,_,_,X,_,X,_,_,],
  [_,X,_,X,_,X,X,X,_,X,X,X,_,X,X,X,_,X,X,X,_,_,],
]

let span = [0, 200];

let evaluator = (pos, bitmap) => {
  // ok ok, 
  let pixelWidth = (span[1] - span[0]) / (bitmap[0].length - 1);
  // then we can count position across like, 
  let column = Math.ceil(pos / pixelWidth);
  console.log(`for ${pos}, column is ${column}`);
  // map would be... 
  let map = ``;
  for(let row = 0; row < bitmap.length; row ++){
    map += `${bitmap[row][column]}\n`
  }
  console.log(map)
}

for(let i = span[0]; i < span[1]; i += 5){
  evaluator(i, bitmapHello);
}