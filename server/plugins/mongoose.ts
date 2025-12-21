import mongoose from 'mongoose';


export default defineNitroPlugin(async (_nitroApp) => {
  const config = useRuntimeConfig();
  const uri = config.mongodbUri;

  if (!uri) {
    console.error('Error: MONGODB_URI is not defined in the environment variables.');
    return;
  }

  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
  } catch (e) {
    console.error('Error connecting to MongoDB:', e);
  }
});





