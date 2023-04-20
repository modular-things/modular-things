import { osap } from "../osapjs/osap";

export default function(name) {


  return {
    writeText: async (text, textSize=2) => {
      try {
        const utf8Encode = new TextEncoder();
        const datagram_txt = utf8Encode.encode(text);
        const datagram = new Uint8Array(datagram_txt.length+1);
        datagram[0] = textSize;

        for (let i=0; i < datagram_txt.length; i++) {
          datagram[i+1] = datagram_txt[i];
        }
        await osap.send(name, "writeText", datagram);
        
      } catch (err) {
        console.error(err);
      }
    },

    api: [
      {
        name: "writeText",
        args: [
          "text: string",
          "textSize=2: 1 to 16"
        ]
      }
    ]
  }
}
