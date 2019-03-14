const http = require('http')
const PATH = require('path')
const URL = require('url')
const fs = require('fs').promises
const constants = require('fs').constants
const mime = require('mime')
const { Observable, merge } = require('rxjs')
const { map, tap, mergeMap, share, filter } = require('rxjs/operators')

const getContentType = filename => {
  let extname = PATH.extname(filename)
  let contentType = mime.getType(extname)
  return contentType
}

const isFileExisted = async filename => {
  try {
    await fs.access(filename, constants.F_OK)
    return true
  } catch (_) {
    return false
  }
}

const Server = port =>
  Observable.create(observer => {
    let server = http.createServer((req, res) => observer.next({ req, res }))
    server.on('error', error => observer.error(error))
    server.listen(port, () =>
      console.log('server start at http://localhost:' + port)
    )
    return () => server.close()
  })

const createStaticServer = ({ root, port }) => {
  const server$ = Server(port).pipe(
    map(ctx => {
      let { pathname } = URL.parse(ctx.req.url)
      let filename = PATH.join(root, pathname)
      return {
        ...ctx,
        filename
      }
    }),
    mergeMap(async ctx => {
      let isExisted = await isFileExisted(ctx.filename)
      return { ...ctx, isExisted }
    }),
    share()
  )

  const file$ = server$.pipe(
    filter(ctx => ctx.isExisted),
    tap(async ({ filename, res }) => {
      let fileContent = await fs.readFile(filename)
      let contentType = getContentType(filename)
      res.setHeader('Content-Type', contentType)
      res.end(fileContent)
    })
  )

  const notFound$ = server$.pipe(
    filter(ctx => !ctx.isExisted),
    tap(({ res }) => {
      res.statusCode = 404
      res.end(`not found`)
    })
  )

  const static$ = merge(file$, notFound$)

  static$.subscribe(ctx => {
    console.log('url', ctx.req.url)
    console.log('filename', ctx.filename)
  })
}

createStaticServer({
  root: process.cwd(),
  port: 2333
})
