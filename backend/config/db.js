import mongoose from 'mongoose';
import Counter from '../models/Counter.js';

/**
 * Connects to MongoDB using the MONGO_URI environment variable
 * and seeds the counter document if it doesn't already exist.
 */
export async function connectDB() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error('MONGO_URI is missing from environment variables.');
  }

  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Seed the counter sequence document if it doesn't exist yet.
    // Starting at 100000 ensures generated Base62 codes have at least 3 characters.
    await Counter.updateOne(
      { _id: 'url' },
      { $setOnInsert: { seq: 100000 } },
      { upsert: true }
    );
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
}
