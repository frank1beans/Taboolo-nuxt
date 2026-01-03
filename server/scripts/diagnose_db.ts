import 'dotenv/config';
import mongoose from 'mongoose';
import { PriceListItem } from '../models/price-list-item.schema.ts';

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI missing');

    console.log('Connecting...');
    await mongoose.connect(uri);
    console.log('Connected to:', mongoose.connection.name);

    const collection = PriceListItem.collection;

    // 1. Check Indexes
    console.log('\n--- Indexes ---');
    const indexes = await collection.indexes();
    indexes.forEach(idx => console.log(JSON.stringify(idx)));

    // 2. Check Count
    console.log('\n--- Stats ---');
    const count = await PriceListItem.countDocuments();
    console.log(`Total Documents: ${count}`);

    // 3. Check Data Sample (Backfill status)
    const sample = await PriceListItem.findOne({ project_name: { $exists: true } });
    console.log(`Backfilled doc found? ${!!sample}`);
    if (sample) {
        console.log('Sample data keys:', Object.keys(sample.toObject()));
    }

    // 4. Test Query Performance (Sort by Code)
    console.log('\n--- Perf Test: Sort by Code (Limit 10) ---');
    const start = performance.now();
    const docs = await PriceListItem.find({}).sort({ code: 1 }).limit(10).lean();
    const end = performance.now();
    console.log(`Fetched ${docs.length} docs in ${(end - start).toFixed(2)}ms`);

    // 5. Test Query Performance (Text Search)
    console.log('\n--- Perf Test: Text Search "beton" ---');
    try {
        const tStart = performance.now();
        const tDocs = await PriceListItem.find({ $text: { $search: 'beton' } }).limit(10).lean();
        const tEnd = performance.now();
        console.log(`Found ${tDocs.length} text matches in ${(tEnd - tStart).toFixed(2)}ms`);
    } catch (e: any) {
        console.log('Text search failed:', e.message);
    }

    process.exit(0);
}

main().catch(console.error);
