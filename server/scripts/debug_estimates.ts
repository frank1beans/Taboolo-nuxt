import 'dotenv/config';
import mongoose from 'mongoose';
import { Estimate } from '../models/estimate.schema.ts';

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI missing');

    await mongoose.connect(uri);

    const projectId = '694537ebb80b30412fc0aa9f';
    console.log(`Fetching estimates for project: ${projectId}`);

    const estimates = await Estimate.find({ project_id: projectId }).lean();

    console.log(`Found ${estimates.length} estimates.`);
    estimates.forEach(e => {
        console.log(`- [${e._id}] ${e.name} (Type: ${e.type})`);
        console.log(`  Total Amount: ${e.total_amount}`);
        console.log(`  Keys: ${Object.keys(e).join(', ')}`);
    });

    process.exit(0);
}

main().catch(console.error);
