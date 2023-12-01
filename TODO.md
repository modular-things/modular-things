# Modular Things TODO

## Things Management 

- `_things.json` and `index.ts` should merge 
- would like to manage i.e. multiple firmwares per circuit, and versioning
  - circuit date-codes, serialization, UUID's ? 

## Better Auto Building

- there's a meta abt site build systems, etc; it would be preferrable to scrape /things to rollup resources. 

## Examples and Example Management 

- consider examples: how do we specify which-things should be present, in which config, etc ? ffs ? 

## Standalones 

- how 2 bundle modular-things out as a library ? 
- do `let device = await new <Device>()` to get a module, throws error if thing ain't available 

## API Odds / Ends

- motor... velocity API: set-max / use-max ?
  - better API would be .setUnitsPerRevolution() (we can have both) 
- unfk /things some more, or comprehend / sort it for all of the stable circuits... 

## API Questions

- APIs could be natively blocking with optional 'await' semantics, 
  - 'await' is useful i.e. when we want to sync a bunch'a motors, but is mostly confusing for beginners 

## Ergo-Nomics

- there's the notes on better firmware authorship in /notes 
- there's also the pain of having to return an "API" object for each `thing` we write (in js) - it would be rad if it were possible to automate this somehow... but it's not near the top of the list - check i.e. [TypeDoc](https://typedoc.org/) 
  - it basically seems like we need to get the AST for type-scripted codes... 

## Web Editor

- collapse docs on objects 
- compat warning
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

## Hardware

- mcu <-> mcu link layer

## Examples

- nice machine interface
- computer vision integration

## On the Meta 

Pairing virtual objects with hardware devices leads to versioning issues. This makes a strong case for self-describing devices.

I think a good notion to keep in mind is software that composes hardware is fine but (1 software object takes many hardware objects) but having to have twins is problematic (1 software to 1 hardware).
