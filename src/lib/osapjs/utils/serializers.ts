// core serialization routines, 

let textEncoder = new TextEncoder()
let textDecoder = new TextDecoder()

let Serializers = {
  // write a uint16_t to a bufer 
  writeUint16: function (dest: Uint8Array, offset: number, value: number): number {
    // no bigboys 
    if (value > (2 ** 16 - 1) || value < 0) throw new Error(`val of ${value} written to Uint16`);
    // stuff it, 
    dest[offset] = value & 255;
    dest[offset + 1] = (value >> 8) & 255;
    return 2;
  },
  // read a uint16_t from a buffer 
  readUint16: function (source: Uint8Array, offset: number): number {
    return ((source[offset + 1] << 8) | source[offset]);
  },
  // read a zero-delimited string from a buffer, 
  readString: function (source: Uint8Array, offset: number): string {
    // find the closest-zero,
    let zero = undefined 
    for(let z = offset; z < source.length; z ++){
      if(source[z] == 0){
        zero = z;
        break;
      }
    }
    if(zero == undefined) throw new Error(`couldn't find your string's zero-delimiter...`)
    // carry on, 
    let str = textDecoder.decode(source.subarray(offset, zero));
    return str; 
  },
  // write the string and return the # of bytes written 
  writeString: function (dest: Uint8Array, offset: number, value: string): number {
    let stringStream = textEncoder.encode(value);
    dest.set(stringStream, offset);
    dest[offset + stringStream.length] = 0;
    return stringStream.length + 1;
  }
}

export default Serializers