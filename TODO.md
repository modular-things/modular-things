# TODO

## Project

- bundle modular-things out to standalone library-ish 
- relocate things, circuits to /things 
- do `new Thing()` for ease-of-use, 

## Website 

- list / display from `things/` 
  - we have an example `circuits/stepper-hbridge-xiao`
  - this is astro-build stuff, I think it should be possible... 

I'm convinced now that we can do this pretty easily... the site is built with Astro, we have to do some [dynamic route juju](https://docs.astro.build/en/core-concepts/routing/#dynamic-routes) 

The gist is that we stick something like the below snippet in `src/pages/[thing].astro` - the `[square-braces]` indicate a "generic" site (or something of this nature)... then we implement a `getStaticPaths()` function elsewhere - that'd be our `fs.` scraper, that polls `circuits/` for YAMLs and lists directories, I think. 

Then we just have the work of building the actual page, and the organizing of it all... i.e. maybe we want a flat list of circuits, then tags on each, like "SAMD21" "Output-Devices" ... etc, and to filter with those, you know? 

```
---
import { Astro } from 'astro';
const assetName = Astro.request.params.asset 
---

<html>
  <head>
    <title>{assetName}</title>
  </head>
  <body>
    <h1>{assetName}</h1>
    <img src={assetPath} alt={assetName} />
    <!-- Add more details about your asset here -->
  </body>
</html>
```

- have VSCode highlight .astro properly 

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
