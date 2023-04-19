// ute to demux replies

export default class SequentialIDResolver {
  // a list of msgs to resolver... 
  private resolvers: any[] = [];
  private lastID = 111;
  // users can write 'em 
  writeNew = () => {
    // increment and wrap to one-byte-wide, 
    console.warn(this.lastID)
    this.lastID = (this.lastID + 1) & 255;
    return this.lastID;
  }
  // users can get 'em 
  request = (id: number, msgInfo: string) => {
    return new Promise<Uint8Array>((resolve, reject) => {
      // add to our stash
      let res = { id, resolve };
      this.resolvers.push(res);
      // and set timeout... 
      setTimeout(() => {
        // wipe this from the array 
        this.resolvers = this.resolvers.filter(item => item !== res);
        // and reject
        reject(`msg w/ info "${msgInfo}" timed out after 2000 ms`);
      }, 2000)
    })
  }
  // and demux 'em 
  find = (data: Uint8Array, offset: number) => {
    for (let r = 0; r < this.resolvers.length; r++) {
      if (data[offset] == this.resolvers[r].id) {
        // this is it, wipe it from our array:
        let res = this.resolvers[r];
        this.resolvers.splice(r, 1);
        // and complete it 
        res.resolve(data.subarray(offset - 1));
        // and bail;
        return;
      }
    } // end for-of, 
    // if we haven't reached control-end here, we have trouble: 
    throw new Error(`resolver was unable to demux msg w/ id ${data[offset]}`)
  }
}