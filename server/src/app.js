import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import { config } from './config.js'
import { HttpError } from './lib/http.js'
import authRoutes from './routes/auth.js'
import orgRoutes from './routes/org.js'
import voterRoutes from './routes/voter.js'
import publicRoutes from './routes/public.js'
import adminRoutes from './routes/admin.js'

// The built web app (client/dist). When present, this server hosts it too, so the whole
// product runs as one service on one domain.
const CLIENT_DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'client', 'dist')

function originOf(url) {
  try { return new URL(url).origin } catch { return null }
}

export function createApp() {
  const app = express()
  // Number of proxies in front of the API (1 on Render) so rate limits see the real client IP.
  app.set('trust proxy', Number(process.env.TRUST_PROXY || 1))
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // the one-line theme script in index.html
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        // The verification page reads the blockchain directly from the browser.
        connectSrc: ["'self'", originOf(config.chain.publicRpcUrl)].filter(Boolean),
        frameAncestors: ["'none'"],
      },
    },
  }))
  app.use(cors({ origin: config.clientUrls, credentials: true }))
  app.use(express.json({ limit: '2mb' }))
  app.use(cookieParser())
  if (!config.isTest) app.use(morgan(config.isProd ? 'combined' : 'dev'))

  app.get('/api/health', (_req, res) => res.json({ ok: true }))
  app.use('/api/auth', authRoutes)
  app.use('/api/public', publicRoutes)
  app.use('/api/voter', voterRoutes)
  app.use('/api/admin', adminRoutes)
  app.use('/api', orgRoutes)

  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Not found')))

  if (fs.existsSync(path.join(CLIENT_DIST, 'index.html'))) {
    app.use(express.static(CLIENT_DIST, { index: false, maxAge: '1h', setHeaders: (res, file) => {
      if (file.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    } }))
    // Every other path is a page of the single-page app.
    app.get('*', (_req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')))
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err.name === 'ValidationError' || err.name === 'CastError') err = new HttpError(400, err.message)
    if (err.code === 11000) err = new HttpError(409, 'That already exists.')
    const status = err.status || 500
    if (status >= 500 && !config.isTest) console.error(err)
    res.status(status).json({ error: status >= 500 && config.isProd ? 'Something went wrong' : err.message, ...(err.details?.code ? { code: err.details.code } : {}) })
  })
  return app
}
