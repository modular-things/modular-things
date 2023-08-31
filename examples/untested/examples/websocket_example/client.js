
let socket = new WebSocket('ws://127.0.0.1:9000');

let data;

socket.addEventListener('open', (event) => {
  console.log('Connection opened');
  socket.send('Hello Server!');

  // successfully connected to server
});

socket.addEventListener('message', (event) => {
  console.log('Data received');
  data = JSON.parse(event.data)
  console.log(data);

  // launch machine I guess
})
