// -----------------------------------------------------

function buildFallbackStack(middlewares) {
  return middlewares.map(m => m.onError).filter(Boolean)
}

function buildIdealStack(handler, middlewares) {
  const stack = [
    ...middlewares.map(m => m.before),
    handler,
    ...middlewares.map(m => m.after)
  ]

  return stack.filter(Boolean)
}

async function run(stack, options, index = 0) {
  if (!stack[index]) { return }

  const result = await stack[index](...options.withArgs)

  if (result) {
    return result
  }

  return await run(stack, options, index + 1)
}

// -----------------------------------------------------

module.exports = (original) => {
  const wrappers = []

  const wrapped = async function() {
    const stacks = {
      ideal: buildIdealStack(original, wrappers),
      fallback: buildFallbackStack(wrappers)
    }

    try {
      return await run(stacks.ideal, { withArgs: arguments })
    }

    catch (error) {
      const result = await run(stacks.fallback, { withArgs: [ error, ...arguments ] })

      if (!result) {
        throw error
      }
    }
  }

  wrapped.with = wrapped.and = function(wrapper) {
    wrappers.push(wrapper)
    return wrapped
  }

  return wrapped
}
