const chai = require('chai')
const { spy, stub } = require('sinon')
const sinonChai = require('sinon-chai')

// ---------------------------------------------

chai.use(sinonChai)

// ---------------------------------------------

Object.assign(global, {
  expect: chai.expect,
  spy,
  stub
})
