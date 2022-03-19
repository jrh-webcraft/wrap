# @jrh/wrap

Wrap any Node.js function with middleware-like behavior.

## Installation

`npm install @jrh/wrap`

## The Wrapping Function

### Usage

`const wrap = require('@jrh/wrap')`

### Syntax

```
const wrapped = wrap(original)
```

### Arguments

| Name | Type | Description |
| :-- | :-- | :-- |
| original | Function | A function to wrap. |

### Methods

| Name | Description | Returns |
| :-- | :-- | :-- |
| `.with(wrapper)`| Adds a [wrapper function](#wrapper-functions). | [Function: Wrapping](#the-wrapping-function) (Chainable) |
| `.and(wrapper)`| Same as `.with`. | [Function: Wrapping](#the-wrapping-function) (Chainable) |

### Returns

| Type | Description |
| :-- | :-- |
| Promise: Function | A promise for the return value of the wrapped function. |

---

## Wrapper Functions

Wrapper functions add middleware-like behavior to the original function.

### Example

```
function original() {
}

function wrapper() {
  before() {
  }

  after() {
  }

  onError() {
  }
}

function initialize() {
  const wrapped = wrap(original).with(wrapper)
  wrapped(arguments)
}
```

### Methods

Wrapper functions can define any combination of the following methods. All methods can be synchronous or asynchronous.

| Name | Description | Arguments |
| :-- | :-- | :-- |
| `.before()` | Function to call before the original is executed. | All arguments passed to `original`. |
| `.after()` | Function to call after the original is executed. | All arguments passed to `original`. |
| `.onError()` | Function to call if an error occurs. | The caught `error`, then all arguments passed to `original`. |

### Execution Order

If you have three wrappers attached, this is the expected order of execution:

```
wrap(original)
  .with(wrapperOne)
  .and(wrapperTwo)
  .and(wrapperThree)

// => wrapperOne (before)
// => wrapperTwo (before)
// => wrapperThree (before)
// => original
// => wrapperOne (after)
// => wrapperTwo (after)
// => wrapperThree (after)
```

**If a `.before()` or `.after()` function returns a value:** Execution will stop and the wrapped function will return that value.

**If no `.before()` or `.after()` function returns a value:** The original function's return value will be returned.

### Error Handling

When an error is thrown from the original function or any wrapper, each wrapper's `.onError()` function will be called in the order that wrappers were applied.

If you have three wrappers attached and the original function throws an error, this is the expected order of execution:

```
wrap(original).with(wrapperOne).and(wrapperTwo).and(wrapperThree)

// => wrapperOne (before)
// => wrapperTwo (before)
// => wrapperThree (before)
// => original // Throws an error!
// => wrapperOne (onError)
// => wrapperTwo (onError)
// => wrapperThree (onError)
```

**If an `.onError()` function returns a value:** Execution will stop and the wrapped function will return that value.

**If no `.onError()` function returns a value:** The error will be thrown.

---

## Usage Example

```javascript
const wrap = require('@jrh/parappa')

function original() {
  console.log('Original')
}

function layerOne() {
  before() {
    console.log('Layer One: Before')
  }

  after() {
    console.log('Layer One: After')
  }

  onError() {
    console.log('Layer One: Error!')
  }
}

function layerTwo() {
  before() {
    console.log('Layer Two: Before')
  }

  after() {
    console.log('Layer Two: After')
    throw new Error()
  }

  onError() {
    console.log('Layer Two: Error!')
    return 'Saved'
  }
}

// ---------------------------------------------

async function initialize() {
  const wrapped = wrap(original).with(layerOne).and(layerTwo)
  await wrapped({ message: 'Original' })
}

const result = initialize()
console.log('Result:', result)

// => Layer One: Before
// => Layer Two: Before
// => Original
// => Layer One: After
// => Layer Two: After
// => Layer One: Error!
// => Layer Two: Error!
// => Result: Saved
```
