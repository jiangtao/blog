#!/usr/bin/env node

const ghpages = require('gh-pages')
const now = new Date()
const y = now.getFullYear()
const m = padLeft(now.getMonth() + 1)
const d = padLeft(now.getDay())
const h = padLeft(now.getHours())
const mm = padLeft(now.getMinutes())
const ss = padLeft(now.getSeconds())
const date = `${y}-${m}-${d} ${h}:${mm}:${ss}`


console.log('uploading')

ghpages.publish(`${process.cwd()}/public`, {
  remote: 'origin',
  add: true,
  branch: 'master',
  message: `site: update ${date}`,
  repo: 'https://github.com/jiangtao/jiangtao.github.io.git'
}, function(e) {
  if(e) {
    throw e
  }

  console.log('upload successfully')
})

function padLeft(n) {
  var result = n
  if(n < 10) {
    result = '0' + Number(n)
  }
  return result
}
