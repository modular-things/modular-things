import { osap } from "./osapjs/osap"

// base class for things 
export default class Thing {
  constructor(private name: string){};

  updateName(newName: string){
    this.name = newName;
  }

  getName(){
    return this.name; 
  }

  send(portName: string, data: Uint8Array){
    return osap.send(this.name, portName, data);
  }
}