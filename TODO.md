# TODO

## Project

- bundle modular-things out to standalone library, 
- do `new Thing()` for ease-of-use, 

## Website 

- list / display from `things/` 
  - we have an example `circuits/stepper-hbridge-xiao`
  - we should use this as a prototype... need to learn about vite-build, how to scrape folders to build, etc ? 
  - and i.e. circuits/ and things/ ... the anneal there, that's what's up 

## Web Editor

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
