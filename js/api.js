import express from "express";
import bodyparser from "body-parser";
import fs from 'fs';
import child_process from 'child_process';
import os from 'os';


const app = express();

// app.get("/api/hello", (req, res) => {
//   res.json({ hello: "world" });
// });

let ownIp = ''

// serve everything: https://expressjs.com/en/resources/middleware/serve-static.html
app.use(express.static(__dirname))
// accept post bodies as json,
app.use(bodyparser.json())
app.use(bodyparser.urlencoded({extended: true}))

// redirect traffic to /client,
app.get('/', (req, res) => {
  res.redirect('/client')
})

// we also want to institute some pipes: this is a holdover for a better system
// more akin to nautilus, where server-side graphs are manipulated
// for now, we just want to dive down to a usb port, probably, so this shallow link is OK
let processes = []
app.get('/startLocal/:file', (req, res) => {
  // launches another node instance at this file w/ these args,
  let args = ''
  if(req.query.args){
    args = req.query.args.split(',')
  }
  console.log(`attempt to start ${req.params.file} with args ${args}`)
  // startup, let's spawn,
  const process = child_process.spawn('node', ['-r', 'esm', `local/${req.params.file}`])
  // add our own tag,
  process.fileName = req.params.file
  let replied = false
  let pack = ''
  process.stdout.on('data', (buf) => {
    // these emerge as buffers,
    let msg = buf.toString()
    // can only reply once to xhr req
    if(msg.includes('OSAP-wss-addr:') && !replied){
      res.send(msg)
      replied = true
    }
    // ok, dealing w/ newlines
    pack = pack.concat(msg)
    let index = pack.indexOf('\n')
    while(index >= 0){
      console.log(`${process.fileName} ${process.pid}: ${pack.substring(0, index)}`)
      pack = pack.slice(index + 1)
      index = pack.indexOf('\n')
    }
  })
  process.stderr.on('data', (err) => {
    if(!replied){
      res.send('err in local script')
      replied = true
    }
    console.log(`${process.fileName} ${process.pid} err:`, err.toString())
  })
  process.on('close', (code) => {
    console.log(`${process.fileName} ${process.pid} closes:`, code)
    if(!replied){
      res.send('local process closed')
      replied = true
    }
  })
  console.log(`started ${process.fileName} w/ pid ${process.pid}`)
})

// finally, we tell the express server to listen here:
let port = 8080
app.listen(port)

// once we're listening, report our IP:
let ifaces = os.networkInterfaces()
// this just logs the processes IP's to the termina
Object.keys(ifaces).forEach(function(ifname) {
  var alias = 0;

  ifaces[ifname].forEach(function(iface) {
    if ('IPv4' !== iface.family){//} || iface.internal !== false) {
      // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
      return;
    }
    ownIp = iface.address
    if (alias >= 1) {
      console.log('clank-tool available on: \t' /*ifname + ':' + alias,*/ + iface.address + `:${port}`);
      // this single interface has multiple ipv4 addresses
      // console.log('serving at: ' ifname + ':' + alias + iface.address + `:${port}`);
    } else {
      console.log('clank-tool available on:\t' /*ifname + ':' + alias,*/ + iface.address + `:${port}`);
      // this interface has only one ipv4 adress
      //console.log(ifname, iface.address);
    }
    ++alias;
  });
});

export const handler = app;