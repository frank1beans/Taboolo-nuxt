import mongoose from 'mongoose';
import { defineNitroPlugin } from '#nitro';
import { useRuntimeConfig } from '#nitro';

export default defineNitroPlugin(async (_nitroApp) => {
  const config = useRuntimeConfig();
  const uri = config.mongodbUri || process.env.MONGODB_URI || 'mongodb://localhost:27017/taboolo';

  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
  } catch (e) {
    console.error('Error connecting to MongoDB:', e);
  }
});



