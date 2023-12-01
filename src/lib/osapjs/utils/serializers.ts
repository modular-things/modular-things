// opapjs/utils/serializers.ts
// write and read data types from packets

let textEncoder = new TextEncoder()
let textDecoder = new TextDecoder()

let Serializers = {
  // write boolean into a buffer,
  writeBoolean: function (dest: Uint8Array, offset: number, value: boolean): number {
    dest[offset] = value ? 1 : 0;
    return 1;
  },
  // write a uint8_t into a buffer,
  writeUint8: function (dest: Uint8Array, offset: number, value: number): number {
    if (value > (2 ** 8 - 1) || value < 0) throw new Error(`val of ${value} written to Uint8 width`);
    dest[offset] = value;
    return 1;
  },
  // write a uint16_t to a buffer
  writeUint16: function (dest: Uint8Array, offset: number, value: number): number {
    // no bigboys
    if (value > (2 ** 16 - 1) || value < 0) throw new Error(`val of ${value} written to Uint16 width`);
    // stuff it,
    dest[offset] = value & 255;
    dest[offset + 1] = (value >> 8) & 255;
    return 2;
  },
  // write a uint32_t to a buffer
  writeUint32: function (dest: Uint8Array, offset: number, value: number): number {
    if (value > (2 ** 32 - 1) || value < 0) throw new Error(`val of ${value} written to Uint32 width`);
    let tempArr = Uint32Array.from([value]);
    let tempBytes = new Uint8Array(tempArr.buffer);
    dest.set(tempBytes, offset);
    return 4;
  },
  // write an int32_t into a buffer
  writeInt32: function (dest: Uint8Array, offset: number, value: number): number {
    if (value > (2 ** 31 - 1) || value < (- 1 * 2 ** 31 + 1)) throw new Error(`val of ${value} written to Int32 width`);
    let tempArr = Int32Array.from([value]);
    let tempBytes = new Uint8Array(tempArr.buffer);
    dest.set(tempBytes, offset);
    return 4;
  },
  // read a uint16_t from a buffer
  readUint16: function (source: Uint8Array, offset: number): number {
    return ((source[offset + 1] << 8) | source[offset]);
  },
  // read a zero-delimited string from a buffer,
  readString: function (source: Uint8Array, offset: number): string {
    // find the closest-zero,
    let zero = undefined
    for (let z = offset; z < source.length; z++) {
      if (source[z] == 0) {
        zero = z;
        break;
      }
    }
    if (zero == undefined) throw new Error(`couldn't find your string's zero-delimiter...`)
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
  },
  // uint32:
  readUint32: function (source: Uint8Array, offset: number): number {
    return new Uint32Array(source.buffer.slice(offset, offset + 4))[0];
  },
  // fluts
  readFloat32: function (source: Uint8Array, offset: number): number {
    return new Float32Array(source.slice(offset, offset + 4).buffer)[0];
  },
  writeFloat32: function (dest: Uint8Array, offset: number, value: number): number {
    let tempArr = Float32Array.from([value]);
    let tempBytes = new Uint8Array(tempArr.buffer);
    dest.set(tempBytes, offset);
    return 4;
  }
}

export default Serializers
