const http = require('http')
const PATH = require('path')
const URL = require('url')
const fs = require('fs').promises
const mime = require('mime')

const getContentType = filename => {
  let extname = PATH.extname(filename)
  let contentType = mime.getType(extname)
  return contentType
}

const Deferred = () => {
  let resolve, reject
  let promise = new Promise((f1, f2) => {
    resolve = f1
    reject = f2
  })
  return { resolve, reject, promise }
}

const Server = async function*(port) {
  let deferred = Deferred()
  let receive = async () => {
    let context = await deferred.promise
    deferred = Deferred()
    return context
  }

  http
    .createServer((req, res) => {
      deferred.resolve({ req, res })
    })
    .listen(port, () => {
      console.log('server start at http://localhost:' + port)
    })

  while (true) yield await receive()
}

const createStaticServer = async ({ root, port }) => {
  let server = Server(port)

  for await (let { req, res } of server) {
    let { pathname } = URL.parse(req.url)
    let filename = PATH.join(root, pathname)

    try {
      let fileContent = await fs.readFile(filename)
      let contentType = getContentType(filename)
      res.setHeader('Content-Type', contentType)
      res.end(fileContent)
    } catch (error) {
      res.statusCode = 404
      res.end(`not found`)
    }
  }
}

createStaticServer({
  root: process.cwd(),
  port: 2333
})
