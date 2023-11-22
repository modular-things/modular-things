# TODO

## Project

- bundle modular-things out to standalone library-ish 
- relocate things, circuits to /things 
- do `new Thing()` for ease-of-use, 

## Circuit Docs Website 

Leo made a prototype of this using astro, see `/src/pages/things/[name].astro` and `index.astro` - pretty quick to get a sense for how this works. Some improvements would be:

- pages not styled... 
- pages should pull .jpg *or* .png for example, we should be able to resolve both within the build script 
- current system resolves `raw.githubusercontent.com/...` absolute URLs, meaning local dev would bonk, can't we use relative ? 
- current system can't manage multiple folders of 'things' ... 
- it would be rad to have 'tags' on circuits... 
- ibid if we could use a build routine to write `things/index.ts` as well ! 

## Ergo-Nomics

- there's the notes on better firmware authorship in /notes 
- there's also the pain of having to return an "API" object for each `thing` we write (in js) - it would be rad if it were possible to automate this somehow... but it's not near the top of the list - check i.e. [TypeDoc](https://typedoc.org/) 
  - it basically seems like we need to get the AST for type-scripted codes... 

## Web Editor

- collapse docs on objects 
- compat warning
- machine set-up/config
- typescript types
- error messages
- console tab
- make synchronous, no more awaits?
- add console
  - logs
  - issue commands
  - program scope available
- create graph/node editor
- visualize osap graph
- event handler for when modules are added
- be able to access list of 
- [x] deploy
- [x] view window
- [x] run programs with imports

## Firmwares

- sequential motion control

## Hardware

- mcu <-> mcu link layer

## Examples

- nice machine interface
- computer vision integration

Pairing virtual objects with hardware devices leads to versioning issues. This makes a strong case for self-describing devices.

I think a good notion to keep in mind is software that composes hardware is fine but (1 software object takes many hardware objects) but having to have twins is problematic (1 software to 1 hardware).
