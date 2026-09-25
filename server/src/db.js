import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import { config } from './config.js'

// Keep the embedded MongoDB binary in server/node_modules/.cache no matter which folder
// the process was started from, so it is downloaded only once.
process.env.MONGOMS_DOWNLOAD_DIR ||= path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', '.cache', 'mongodb-memory-server')

let memoryServer = null

export async function connectDb(uri = config.mongoUri) {
  if (!uri) {
    if (config.isProd) throw new Error('MONGODB_URI is required in production')
    const { MongoMemoryServer } = await import('mongodb-memory-server')
    memoryServer = await MongoMemoryServer.create()
    uri = memoryServer.getUri('votechain')
    if (!config.isTest) console.log('[db] Using embedded in-memory MongoDB (data resets on restart)')
  }
  mongoose.set('strictQuery', true)
  await mongoose.connect(uri)
  if (!config.isTest) console.log('[db] Connected')
  return mongoose.connection
}

export async function disconnectDb() {
  await mongoose.disconnect()
  if (memoryServer) await memoryServer.stop()
  memoryServer = null
}
