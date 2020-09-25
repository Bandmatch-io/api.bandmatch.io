const Airbrake = require('@airbrake/node')
const airbrakeExpress = require('@airbrake/node/dist/instrumentation/express')
const config = require('config')

/**
 * ---
 * $returns:
 *  description: The airbrake express middleware and errorhandler
 *  type: JSON
 * ---
 * Returns the middleware and errorHandler for airbrake
 * ``` javascript
 * {
 *   middleware: [Function],
 *   errorHandler: [Function]
 * }
 * ```
 */
module.exports = () => {
  const cfg = config.get('Airbrake')
  if (cfg.id && cfg.key) {
    const notifier = new Airbrake.Notifier({
      projectId: cfg.id,
      projectKey: cfg.key
    })

    return {
      middleware: airbrakeExpress.makeMiddleware(notifier),
      errorHandler: airbrakeExpress.makeErrorHandler(notifier)
    }
  } else {
    return {
      middleware: (req, res, next) => { next() },
      errorHandler: (err, req, res, next) => { next(err) }
    }
  }
}
