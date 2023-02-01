const div = document.createElement("div");

div.style = `
  padding: 10px;
  background: lightblue;
  color: black;
  height: 100%;
`

div.innerHTML = `
 <div>hello world</div>
 <button class="light-switch">test bolder</button>
`
const lightSwitch = div.querySelector(".light-switch");

lightSwitch.addEventListener("click", () => {
  console.log("test");
})

render(div)
