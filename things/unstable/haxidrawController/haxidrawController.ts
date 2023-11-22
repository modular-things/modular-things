import { osap } from "../../src/lib/osapjs/osap"; 
import Serializers from "../../src/lib/osapjs/utils/serializers"

export default function haxidrawController(name: string) {
  return {
    updateName: (newName: string) => {
      name = newName;
    },
    getName: () => { return name },
    api: []
  }
}