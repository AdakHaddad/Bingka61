import mongoose from "mongoose";

const MONGODB_URI: string | undefined = process.env.MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? { conn: null, promise: null };
global.mongooseCache = cached;

async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;
  if (!MONGODB_URI) throw new Error("MONGODB_URI is not configured");
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).catch((err: unknown) => {
      cached.promise = null;
      throw err;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;
