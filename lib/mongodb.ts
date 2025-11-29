import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

// Mongoose connection for app data
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
  var mongoClientPromise: Promise<MongoClient> | undefined;
}

let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// MongoClient for NextAuth adapter
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable to preserve the client across module reloads
  if (!global.mongoClientPromise) {
    const client = new MongoClient(MONGODB_URI);
    global.mongoClientPromise = client.connect();
  }
  clientPromise = global.mongoClientPromise;
} else {
  // In production mode, create a new client
  const client = new MongoClient(MONGODB_URI);
  clientPromise = client.connect();
}

export { clientPromise };
export default connectDB;
