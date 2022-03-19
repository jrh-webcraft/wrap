// ---------------------------------------------

function ensureExecutionOrder(stack) {
  stack.forEach(({ callee, withArgs }, index) => {
    expect(callee).to.have.been.calledOnce

    if (index > 0) {
      const previousCallee = stack[index - 1].callee
      expect(callee).to.have.been.calledImmediatelyAfter(previousCallee)
    }

    if (withArgs) {
      expect(callee).to.have.been.calledWith(...withArgs)
    }
  })
}

// ---------------------------------------------

describe('wrap()', () => {
  const wrap = require('./wrap')

  const fake = {
    arguments: [ 'a', 'b', 'c' ],
    error: new Error('Test error')
  }

  context('given a function to wrap', () => {
    it('returns a wrapped function', () => {
      expect(wrap()).to.be.a('function')
    })

    describe('the wrapped function', () => {
      it(`calls wrappers' .before() and .after() in order with original arguments`, async () => {
        const wrapperOne = { before: spy(), after: spy() }
        const wrapperTwo = { before: spy(), after: spy() }
        const original = spy()

        const result = wrap(original).with(wrapperOne).and(wrapperTwo)
        await result(...fake.arguments)

        const predicted = [
          { callee: wrapperOne.before, withArgs: fake.arguments },
          { callee: wrapperTwo.before, withArgs: fake.arguments },
          { callee: original, withArgs: fake.arguments },
          { callee: wrapperOne.after, withArgs: fake.arguments },
          { callee: wrapperTwo.after, withArgs: fake.arguments }
        ]

        ensureExecutionOrder(predicted)
      })

      it('correctly handles wrappers without .before(), .after(), or .onError() functions', async () => {
        const wrapperOne = { after: stub().throws(fake.error) }
        const wrapperTwo = { before: spy() }
        const wrapperThree = { onError: stub().returns({}) }
        const wrapperFour = {}
        const original = spy()

        const result = wrap(original)
          .with(wrapperOne)
          .and(wrapperFour)
          .and(wrapperTwo)
          .and(wrapperThree)

        await result(...fake.arguments)

        const predicted = [
          { callee: wrapperTwo.before, with: fake.arguments },
          { callee: original, with: fake.arguments },
          { callee: wrapperOne.after, with: fake.arguments },
          { callee: wrapperThree.onError, with: [ fake.error, ...fake.arguments ] }
        ]

        ensureExecutionOrder(predicted)
      })

      context('when the original function returns a value', () => {
        it('stops execution and returns the value', async () => {
          const wrapperOne = { before: spy(), after: spy() }
          const wrapperTwo = { before: spy(), after: spy() }
          const original = stub().returns('OK')

          const result = wrap(original).with(wrapperOne).and(wrapperTwo)
          const value = await result()

          const predicted = [
            { callee: wrapperOne.before },
            { callee: wrapperTwo.before },
            { callee: original }
          ]

          ensureExecutionOrder(predicted)
          expect(wrapperOne.after).not.to.have.been.called
          expect(wrapperTwo.after).not.to.have.been.called

          expect(value).to.eq('OK')
        })
      })

      context('when a wrapper returns a value from .before()', () => {
        it('stops execution and returns the value', async () => {
          const wrapperOne = { before: spy(), after: spy() }
          const wrapperTwo = { before: stub().returns('Stop'), after: spy() }
          const original = spy()

          const result = wrap(original).with(wrapperOne).and(wrapperTwo)
          const value = await result()

          const predicted = [
            { callee: wrapperOne.before },
            { callee: wrapperTwo.before }
          ]

          ensureExecutionOrder(predicted)
          expect(original).not.to.have.been.called
          expect(wrapperOne.after).not.to.have.been.called
          expect(wrapperTwo.after).not.to.have.been.called

          expect(value).to.eq('Stop')
        })
      })

      context('when a wrapper returns a value from .after()', () => {
        it('stops execution and returns the value', async () => {
          const wrapperOne = { before: spy(), after: stub().returns('Stop') }
          const wrapperTwo = { before: spy(), after: spy() }
          const original = spy()

          const result = wrap(original).with(wrapperOne).and(wrapperTwo)
          const value = await result()

          const predicted = [
            { callee: wrapperOne.before },
            { callee: wrapperTwo.before },
            { callee: original },
            { callee: wrapperOne.after }
          ]

          expect(wrapperTwo.after).not.to.have.been.called
          expect(value).to.eq('Stop')
        })
      })

      context('when any function throws an error', () => {
        it('stops execution and calls .onError() (with the error and original arguments)', async () => {
          const error = new Error('Test error')

          const wrapperOne = { before: spy(), after: spy(), onError: spy() }
          const wrapperTwo = { before: spy(), after: spy(), onError: stub().returns({}) }
          const original = stub().throws(error)

          const result = wrap(original).with(wrapperOne).and(wrapperTwo)
          await result(...fake.arguments)

          const predicted = [
            { callee: wrapperOne.before, withArgs: fake.arguments },
            { callee: wrapperTwo.before, withArgs: fake.arguments },
            { callee: original, withArgs: fake.arguments },
            { callee: wrapperOne.onError, withArgs: [ fake.error, ...fake.arguments ] },
            { callee: wrapperTwo.onError, withArgs: [ fake.error, ...fake.arguments ] }
          ]

          expect(wrapperTwo.after).not.to.have.been.called
          expect(wrapperOne.after).not.to.have.been.called
        })

        context('when a wrapper returns a value from .onError()', () => {
          it('stops execution', async () => {
            const wrapperOne = { before: spy(), after: spy(), onError: spy() }
            const wrapperTwo = { before: spy(), after: spy(), onError: stub().returns({}) }
            const original = stub().throws()

            const result = wrap(original).with(wrapperOne).and(wrapperTwo)

            let caught

            try {
              await result(...fake.arguments)
            }

            catch (error) {
              caught = error
            }

            expect(caught).not.to.exist
          })
        })

        context('when no wrapper returns a value from .onError()', () => {
          it('rethrows the error', async () => {
            const wrapperOne = { before: spy(), after: spy(), onError: spy() }
            const wrapperTwo = { before: spy(), after: spy(), onError: spy() }
            const original = stub().throws()

            const result = wrap(original).with(wrapperOne).and(wrapperTwo)

            let caught
            try {
              await result(...fake.arguments)
            }

            catch (error) {
              caught = error
            }

            expect(caught).to.exist
          })
        })
      })
    })

    it('correctly handles async functions', async () => {
      const data = { calls: [] }

      function delay() {
        return new Promise((resolve) => { setTimeout(resolve, 1) })
      }

      const wrapperOne = {
        async before() {
          await delay()
          data.calls = [ ...data.calls, 1 ]
        },

        async after() {
          await delay()
          data.calls = [ ...data.calls, 3 ]
          throw new Error()
        },

        async onError() {
          await delay()
          data.calls = [ ...data.calls, 4 ]

          // Stop error from being rethrown.
          return {}
        }
      }

      async function original() {
        await delay()
        data.calls = [ ...data.calls, 2 ]
      }

      const result = wrap(original).with(wrapperOne)
      await result(data)

      expect(data.calls).to.deep.eq([ 1, 2, 3, 4 ])
    })
  })
})
