# Softening Hardware with Modular-Things

use *virtualization* to easily write programs that run across multiple hardware devices

The Modular-Things project is an approach to building modular hardware systems which can be composed in software.
The underlying technology is a small networking library for packetizing and routing messages across devices ([OSAP](http://osap.tools/)) and a [web-based editor](https://modular-things.github.io/modular-things/) for composing that hardware into functional systems in software. 

Stated simply our tools let you take hardware devices and add a library to them which allows you to plug that device into a browser-based editor where you can write programs that control it and other devices. Because it's JavaScript in the browser you can also write interfaces in HTML/CSS/JS and import various high-level libraries which interact with and control your physical computing system.

For a succinct introduction (3 min) check out our video for CHI2023 by clicking below.

[![xylophone_teaser](https://user-images.githubusercontent.com/27078897/227839123-76ac63d5-3384-4ed5-862e-2ece6add0404.jpg)](https://vimeo.com/811895279)

An example Modular Things construction kit can be seen below with [circuits available here](https://github.com/modular-things/modular-things-circuits).

![all-things](https://user-images.githubusercontent.com/27078897/227838793-23ff9302-8a19-44f2-bb30-a2155078a1fb.jpg)

# Project Background

Modular-Things is written by [Quentin Bolsee](https://github.com/qbolsee), [Leo McElroy](https://github.com/leomcelroy) and [Jake Read](https://github.com/jakeread) based on ongoing work at the [MIT Center for Bits and Atoms](https://cba.mit.edu/) and [Hack Club](https://hackclub.com/). 

It is based on the [surprising performance of modern USB](log/2022-11_usb-motion-perf-tests-log.md), an insight that we picked up from the [urumbu project](https://gitlab.cba.mit.edu/neilg/urumbu) ([paper](https://cba.mit.edu/docs/papers/22.11.Urumbu.pdf)). Under the hood, it uses [osap](http://osap.tools/) to route packets and serialize data. Also inspired by the [virtual-machine](https://cba.mit.edu/docs/theses/16.08.Peek.pdf) architecture pioneered by [Nadya Peek](http://infosyncratic.nl/) and [Ilan Moyer](https://web.mit.edu/imoyer/www/index.html), way back in the way back. 

# Installation and Usage 

You can use the latest modular-things by navigating to [https://modular-things.github.io/modular-things/](https://modular-things.github.io/modular-things/), or follow these instructions to run it locally:

* install [node.js](https://nodejs.org/en/) - please use version 16.15.1 or above
* clone this repo
* run `npm install` within this repo
* run `npm run dev` to startup a local server !

--- 

# Writing New Modular-Things

For embedded (arduino) codes, install the OSAP library, which you can download as a zip here: https://github.com/jakeread/osap-arduino, and should also be available via arduino's library manager.

Also, install the `FlashStorage_SAMD` library, via the library manager.

We use the [ArduinoCore-fab-sam](https://github.com/qbolsee/ArduinoCore-fab-sam) for [these circuits](https://github.com/modular-things/modular-things-circuits), which you can install into Arduino via the notes in that repo. For the RP2040 XIAO boards, we use [Earle F. Philhower, the Third's PICO build](https://github.com/earlephilhower/arduino-pico), and for D21 XIAOs, you can follow [the XIAO docs](https://wiki.seeedstudio.com/Seeeduino-XIAO/). 

## Aligning Two Tiny Programs

To explain how module authorship works, we've just tidied up the `rgbb` example, which you can find [here (arduino)](arduino/rgbb-thing/rgbb-thing.ino) and [here (javascript)](src/lib/virtualThings/rgbb.ts).

Basically: we have an Arduino code that we give a "typeName" - that is then discovered by OSAP via the Modular-Things client. Modular-Things then looks for a matching JS or TS constructor, and if it finds one, instantiates it and passes in the devices' unique name (a string identifier). 

The constructed object can then use that string ID, as well as individual port string IDs, to route messages to its paired object. 

The result is that the "virtual thing" (javascript) acts as a proxy for the arduino-thing, making for cleaner programming model when multiple things exist in the same system. 

<table>
<tr>
  <td>
    <h2><a href="arduino/rgbb-thing/rgbb-thing.ino" target="new">Arduino "RGBB Thing"</a></h2>
  </td>
  <td>
    <h2><a href="src/lib/virtualThings/rgbb.ts" target="new">JavaScript "RGBB Thing"</a></h2>
  </td>
</tr>
<tr>
<td valign="top">

```cpp 
#include <osap.h>

// -------------------------- Define Pins for R,G and B LEDs, and one Button

#define PIN_R 14
#define PIN_G 15
#define PIN_B 16
#define PIN_BUT 17

// -------------------------- Instantiate the OSAP Runtime, 

OSAP_Runtime osap;

// -------------------------- Instantiate a link layer, 
// handing OSAP the built-in Serial object to send packetized 
// data around the network 

OSAP_Gateway_USBSerial serLink(&Serial);

// -------------------------- Adding this software-defined port 
// allows remote services to find the type-name of this device (here "rgbb")
// and to give it a unique name, that will be stored after reset 

OSAP_Port_DeviceNames namePort("rgbb");

// -------------------------- We track button state (in the loop()), 
// and we use the onButtonReq() handler (that we pass into a named port)
// to reply to messages with the provided string-name "getButtonState"

boolean lastButtonState = false;

size_t onButtonReq(uint8_t* data, size_t len, uint8_t* reply){
  // then write-into reply:
  lastButtonState ? reply[0] = 1 : reply[0] = 0;
  return 1;
}

OSAP_Port_Named getButtonState("getButtonState", onButtonReq);

// -------------------------- We can use similar structures without 
// the reply, simply recieving `data, len` on a packet to "setRGB" here 

void onRGBPacket(uint8_t* data, size_t len){
  analogWrite(PIN_R, data[0]);
  analogWrite(PIN_G, data[1]);
  analogWrite(PIN_B, data[2]);
}

OSAP_Port_Named setRGB("setRGB", onRGBPacket);

// -------------------------- Arduino Setup

void setup() {
  // startup the OSAP runtime,
  osap.begin();
  // setup our hardware... 
  analogWriteResolution(8);
  pinMode(PIN_R, OUTPUT);
  pinMode(PIN_G, OUTPUT);
  pinMode(PIN_B, OUTPUT);
  analogWrite(PIN_R, 255);
  analogWrite(PIN_G, 255);
  analogWrite(PIN_B, 255);
  // pull-down switch, high when pressed
  pinMode(PIN_BUT, INPUT);
}

// we debounce the button somewhat 

uint32_t debounceDelay = 10;
uint32_t lastButtonCheck = 0;

// -------------------------- Arduino Loop

void loop() {
  // as often as possible, we want to operate the OSAP runtime, 
  // this loop listens for messages on link-layers, and handles packets... 
  osap.loop();
  // debounce and set button states, 
  if(lastButtonCheck + debounceDelay < millis()){
    lastButtonCheck = millis();
    boolean newState = digitalRead(PIN_BUT);
    if(newState != lastButtonState){
      lastButtonState = newState;
    }
  }
}

```

</td>

<td valign="top">

```javascript
import { osap } from "../osapjs/osap";

// this file lives in `modular-things/src/lib/virtualThings/rgbb.ts`
// to add new thing, simply drop a similar file in the same directory 
// and give it the same name as your "typeName" in the embedded example
// i.e. the line `OSAP_Port_DeviceNames namePort("rgbb");` 
// ... finally, add the file as an import in 
// `modular-things/src/lib/modularThingClient.ts` around line 4, 
// and add it to the constructors list (around line 18)

// the name given to us here is the "uniqueName" of the matched 
// device, we use this as a kind of address 
export default function rgbbThing(name: string) {
  // we can return a handful of functions... 
  return {
    // each of these is basically a little serialization routine
    // but of course you can run arbitrary code in them... 
    setRGB: async (r, g, b) => {
      let datagram = new Uint8Array(3);
      datagram[0] = 255 - r * 255;
      datagram[1] = 255 - g * 255;
      datagram[2] = 255 - (b * 255) / 2;
      // to send data, we use 
      // `osap.send(name: string, targetPort: string, data: Uint8Array)`
      // ... and please use 'async' funcs with 'await' in front of 
      // network calls 
      // ... as you have probably figured out, "setRGB" here routes to 
      // the function defined around line 43 in the arduino example
      await osap.send(name, "setRGB", datagram);
    },
    getButtonState: async () => {
      // named-ports that return data resolve that data like-so:
      let res = await osap.send(name, "getButtonState", new Uint8Array([]));
      // and we can deserialize results... 
      if(res[0] > 0){
        return true;
      } else {
        return false;
      }
    },
    // each thing should implement this function, it lets us update 
    // the name (address) when the user sets a new uniqueName for 
    // the device, 
    updateName: (newName: string) => {
      name = newName;
    },
    // and we additionally return a description of the device's API:
    api: [
      { 
        name: "setRGB",
        args: [
          "red: 0 to 1", 
          "green: 0 to 1", 
          "blue: 0 to 1"
        ],
      },
      {
        name: "getButtonState",
        args: [ ],
        return: "0 or 1"
      }
    ]
  }
}
```

</td>
</tr>
</table>



> At the time of writing, we mostly write modular-things using SAMD21 and RP2040 platforms. It is likely that OSAP will run on other microcontrollers, but there are funky-things that happen with Arduino's internal abstractions of i.e. `Serial` objects (which OSAP uses to button up link layers) and Flash-Storage libraries (to store names). Drop us a line if you have a favourite platform that you would like to see supported. 
