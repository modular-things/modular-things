// opapjs/utils/time.ts
// as described 

let Time = {
  // returns a time in ms 
  getTimeStamp: function (): number {
    return performance.now()
  },
  delay: function(ms: number) {
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => { resolve() }, ms)
    })
  }
}

export default Time

