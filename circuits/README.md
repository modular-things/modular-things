# Modular Circuits 

TODO: circuits should also be published at `${site-url}/circuits` ...

--- 

## Publishing a Thing

```
* required asset 

📁 <thing-name>/
├─ 📄 thing.yaml                  (as described below) 
├─ 📁 firmware/                   (device code)
├─ 📁* software/                  (interface code) 
│   └─ 📄 <thing-name>.ts         (or .py, or .js) 
├─ 📁 circuit/    
│   ├─  📁 design/                (design files, .brd and .sch for eagle, or kicad-files)
│   ├─  📁 gerbers/               (gerbers, as fabricated)
│   └─  📁 images/    
│       ├─  🖼️ routed.jpg         (the board as designed) (jpg or png)
│       ├─  🖼️ schematic.jpg      (the board's schematic) (jpg or png)
│       └─  🖼️ fabbed.jpg         (a picture of the board, real-world) 
└─ 📄 ibom.html                   (the interactive-bom, optional) 
```

## Example **thing.yaml**

```yaml
thing-name: <thing-name>
modular-things-version: <up-to-dateness>
author: <author-name>
author-link: <...>
```
