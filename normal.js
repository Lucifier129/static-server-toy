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

const createStaticServer = ({ root, port }) =>
  http
    .createServer(async (req, res) => {
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
    })
    .listen(port, () => {
      console.log('server start at http://localhost:' + port)
    })

createStaticServer({
  root: process.cwd(),
  port: 2333
})
