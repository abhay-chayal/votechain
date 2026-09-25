// Seeds demo data into the database in MONGODB_URI using the chain in CHAIN_NETWORK.
import { connectDb, disconnectDb } from '../src/db.js'
import { seed } from './seed-data.js'

await connectDb()
try {
  await seed()
} finally {
  await disconnectDb()
}
