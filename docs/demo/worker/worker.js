importScripts('controlDetacher.js')
var records = {}
onmessage = function (e) {
    e.data.forEach(item => record(item, 'remove', records))
    console.log('children handled', records)
    postMessage(Object.keys(records).reduce((last, p) => last.concat(records[p]), []))
    records = {}
}

