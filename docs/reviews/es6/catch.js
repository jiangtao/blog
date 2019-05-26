var map = new Map();
process.on("unhandledRejection", function(reason, promise) {
  map.set(promise, reason);
});

process.on("rejectionHandled", function(promise) {
  // console.log('rejected',promise)
  map.delete(promise);
});

let rejected = Promise.reject(new Error("uncaught"));

setTimeout(x => {
  rejected.catch(v => console.log(v));
}, 500);

setInterval(() => {
  if (map.size) {
    map.forEach((reason, promise) => {
      // 处理这些没有处理的错误方法
      console.log("todo handle list", reason, promise);
    });
  } else {
    console.log('todo handle list is empty')
  }
}, 2000);
