import 'dotenv/config';
import mongoose from 'mongoose';
import { Project } from '../models/project.schema.ts';

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI missing');

    await mongoose.connect(uri);

    const id = '6958f4d78f76c8d81acea1d2';
    console.log(`Fetching project with ID: ${id}`);

    try {
        const project = await Project.findById(id).lean();
        console.log('Result:', project);
    } catch (e: any) {
        console.error('Error:', e.message);
    }

    process.exit(0);
}

main().catch(console.error);
