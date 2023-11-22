import { osap } from "./osapjs/osap"

export default class Thing {
  constructor(private name: string){};

  updateName(newName: string){
    this.name = newName;
  }

  send(portName: string, data: Uint8Array){
    return osap.send(this.name, portName, data);
  }
}