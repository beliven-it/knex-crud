# knex-crud

Helper CRUD functions for [Knex.js](http://knexjs.org/)

![Node.js CI](https://github.com/heply/knex-crud/workflows/Node.js%20CI/badge.svg)

## Install

```bash
$ npm i --save knex-crud
```

## Usage

```js
const knexCrud = require('knex-crud')

const petsCrud = new knexCrud('pets', {
  formatter: pet => ({
    isCat: pet.family === 'cats'
  })
})

petsCrud.bind(knex)

const felix = await petsCrud.insert({
  name: 'Felix',
  family: 'cats'
})

console.log(felix)

// {
//    id: 1,
//    name: 'Felix',
//    family: 'cats',
//    isCat: true
// }
```

## Methods

| Name                                | Description                                                                             |
|-------------------------------------|-----------------------------------------------------------------------------------------|
| `constrcutor (table, options)`      | Initialize a new istance for `table`. Additional `options` can be passed.               |
| `bind (knex)`                       | Bind a `knex` instance. If not binded, all other methods will throw an error.           |
| `checkKnexBinding ()`               | Used to check for existing binding. If no binding , an error will be thrown.            |
| `filterBy (filters)`                | Return a list of records filtered by an array of `filters` functions.                   |
| `getOneBy (value, column)`          | Get the first record matching the given `value` in `column` (`${pk}` by default).       |
| `insertOne (data)`                  | Insert a new record with given `data` and return it.                                    |
| `updateOneBy (data, value, column)` | Update `data` of the first matching record by `value` in `column` (`${pk}` by default). |
| `deleteOneBy (data, value, column)` | Delete the first matching record by `value` in `column` (`${pk}` by default).           |

## Options

| Name           | Description                                                       |
|----------------|-------------------------------------------------------------------|
| `pk`           | Define the primary key column for the table. Default: `id`        |
| `defaultOrder` | Define the default order query for the table: Default `${pk}:asc` |
| `formatter`    | Define a function to format each entry in a query response.       |

## Test

```bash
$ npm test
```

## Acknowledgements

This project is kindly sponsored by:

[![heply](https://raw.githack.com/heply/brand/master/heply-logo.svg)](https://www.heply.it)

## License

Licensed under [MIT](./LICENSE)
