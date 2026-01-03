import 'dotenv/config';
import mongoose from 'mongoose';
import { PriceListItem } from '../models/price-list-item.schema.ts';

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI missing');
    await mongoose.connect(uri);
    console.log('Connected. Creating indexes...');
    await PriceListItem.createIndexes();
    console.log('Indexes created.');
    process.exit(0);
}

main().catch(console.error);
