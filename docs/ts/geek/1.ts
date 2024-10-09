
interface Person {
  id: number
  name: string
  age: number
}

function getData(id: number): Person {
  return {
    id: id,
    name: 'jth',
    age: 20
  }
}

let a: number = 1

console.log(getData(a))