import 'dotenv/config';
import mongoose from 'mongoose';
import { Estimate } from '../models/estimate.schema';
import { EstimateItem } from '../models/estimate-item.schema';

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI missing');

    await mongoose.connect(uri);

    console.log('Fetching baseline estimates...');
    const estimates = await Estimate.find({ type: 'project' });
    console.log(`Found ${estimates.length} baselines.`);

    for (const est of estimates) {
        console.log(`Processing ${est.name} [${est._id}]...`);
        // Aggregate items
        const result = await EstimateItem.aggregate([
            { $match: { 'project.estimate_id': est._id } },
            { $group: { _id: null, total: { $sum: '$project.amount' } } }
        ]);

        const total = result.length > 0 ? result[0].total : 0;
        console.log(`  Calculated Total: ${total}`);

        if (total > 0 || est.total_amount !== total) {
            est.total_amount = total;
            await est.save();
            console.log('  Updated.');
        } else {
            console.log('  No change.');
        }
    }

    process.exit(0);
}

main().catch(console.error);
