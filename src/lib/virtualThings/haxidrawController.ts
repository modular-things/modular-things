import { osap } from "../osapjs/osap"
import Serializers from "../osapjs/utils/serializers"

export default function haxidrawController(name: string) {
  return {
    updateName: (newName: string) => {
      name = newName;
    },
    getName: () => { return name },
    api: []
  }
}