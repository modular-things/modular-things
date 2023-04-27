// opapjs/utils/randomIDGen.ts
// builds random 4-byte ID's, and checks 'em 

let RandomIDGen = {
  // to write one directly into a packet, grabbing as well, 
  writeNew: function(dest: Uint8Array, offset: number):Uint8Array {
    // id is four random bytes,
    let randArray = [0, 0, 0, 0]
    randArray.forEach((val, ind, arr) => {
      arr[ind] = Math.floor(Math.random() * 255)
    })
    // set the target array w/ 'em
    dest.set(randArray, offset);
    // and return for ref: 
    return new Uint8Array(randArray)
  },
  // to get one w/o writing:
  getNew: function():Uint8Array {
    let dg = new Uint8Array(4);
    return this.writeNew(dg, 0);
  },
  // to check for matches 
  checkMatch: function(a: Uint8Array, b: Uint8Array): boolean {
    for (let i = 0; i < 4; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }
}

export default RandomIDGen 