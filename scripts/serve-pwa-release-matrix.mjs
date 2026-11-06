import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { resolve, sep, extname } from 'node:path'

const basePath = '/cfp-money/'
const port = Number(process.env.PWA_RELEASE_TEST_PORT || 4182)
const roots = {
  legacy: resolve(process.env.PWA_LEGACY_DIST || ''),
  candidate: resolve(process.env.PWA_CANDIDATE_DIST || ''),
}

if (!process.env.PWA_LEGACY_DIST || !process.env.PWA_CANDIDATE_DIST) {
  throw new Error('Both PWA_LEGACY_DIST and PWA_CANDIDATE_DIST are required.')
}

for (const [release, root] of Object.entries(roots)) {
  if (!(await stat(resolve(root, 'sw.js'))).isFile()) {
    throw new Error(`Missing generated service worker for ${release}.`)
  }
}

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
}

let currentRelease = 'legacy'

const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1')

  if (url.pathname === '/__pwa_test__/release') {
    if (request.method === 'POST' && url.searchParams.get('set') === 'candidate') {
      currentRelease = 'candidate'
      response.writeHead(204, { 'Cache-Control': 'no-store' })
      response.end()
    } else if (request.method === 'GET') {
      response.writeHead(200, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' })
      response.end(currentRelease)
    } else {
      response.writeHead(405)
      response.end()
    }
    return
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405)
    response.end()
    return
  }

  if (!url.pathname.startsWith(basePath)) {
    response.writeHead(404)
    response.end()
    return
  }

  const relativePath = decodeURIComponent(url.pathname.slice(basePath.length)) || 'index.html'
  const root = roots[currentRelease]
  const filePath = resolve(root, relativePath)

  if (filePath !== root && !filePath.startsWith(root + sep)) {
    response.writeHead(403)
    response.end()
    return
  }

  try {
    const contents = await readFile(filePath)
    response.writeHead(200, {
      'Content-Type': types[extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'Service-Worker-Allowed': basePath,
    })
    response.end(request.method === 'HEAD' ? undefined : contents)
  } catch (error) {
    if (error.code !== 'ENOENT' && error.code !== 'EISDIR') throw error
    response.writeHead(404, { 'Cache-Control': 'no-store' })
    response.end()
  }
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Synthetic release server listening on 127.0.0.1:${port}`)
})

process.on('SIGTERM', () => server.close())
