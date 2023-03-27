# Softening Hardware with Modular-Things

uses *virtualization* to make it easier to write programs that run across multiple hardware devices

The Modular-Things project is an approach to building modular hardware systems which can be composed in software.
The underlying technology is a small networking library for packetizing and routing messages across devices ([OSAP](http://osap.tools/)) and a [web-based editor](https://modular-things.github.io/modular-things/) for composing that hardware into functional systems in software. 

For a succinct introduction (3 min) check out our video for CHI2023 by clicking below.

[![xylophone_teaser](https://user-images.githubusercontent.com/27078897/227839123-76ac63d5-3384-4ed5-862e-2ece6add0404.jpg)](https://vimeo.com/811895279)

An example modular things construction kit can be seen below with [circuits available here](https://github.com/modular-things/modular-things-circuits).

![all-things](https://user-images.githubusercontent.com/27078897/227838793-23ff9302-8a19-44f2-bb30-a2155078a1fb.jpg)

# Project Background

Modular-Things is written by [Quentin Bolsee](https://github.com/qbolsee), [Leo McElroy](https://github.com/leomcelroy) and [Jake Read](https://github.com/jakeread) based on ongoing work at the [MIT Center for Bits and Atoms](https://cba.mit.edu/) and [Hack Club](https://hackclub.com/). 

It is based on the [surprising performance of modern USB](log/2022-11_usb-motion-perf-tests-log.md), an insight that we picked up from the [urumbu project](https://gitlab.cba.mit.edu/neilg/urumbu) ([paper](https://cba.mit.edu/docs/papers/22.11.Urumbu.pdf)). Under the hood, it uses [osap](http://osap.tools/) to route packets and serialize data. Also inspired by the [virtual-machine](https://cba.mit.edu/docs/theses/16.08.Peek.pdf) architecture pioneered by [Nadya Peek](http://infosyncratic.nl/) and [Ilan Moyer](https://web.mit.edu/imoyer/www/index.html), way back in the way back. 

# Installation and Usage 

* install [node.js](https://nodejs.org/en/) - please use version 16.15.1 or above
* clone this repo
* navigate to `<this-repo>/js` and run `yarn && yarn dev` in the terminal

--- 

# Writing New Modular-Things

For embedded (arduino) codes, install the OSAP library, which you can download as a zip here: https://github.com/jakeread/osap-arduino, and should also be available via arduino's library manager.

Also, install the `FlashStorage_SAMD` library, via the library manager.

We use the [ArduinoCore-fab-sam](https://github.com/qbolsee/ArduinoCore-fab-sam) for [these circuits](https://github.com/modular-things/modular-things-circuits), which you can install into Arduino via the notes in that repo.

## Brief Notes on Writing "virtual things" 

- name your firmware with `OSAP osap("stepper");` i.e. 
- add `stepper.js` in `thisRepo/js/virtualThings`
- add i.e. `import stepper from "../virtualThings/stepper.js";` at the head of `thisRepo/js/client/modularThingClient.js`
- add the constructor i.e. `stepper` to `let constructors = { rgbb, stepper }` at line 48 of the same file above 

That should be it, it'll show up etc.
