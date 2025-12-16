
import mongoose from 'mongoose';
import { EstimateItem } from './server/models/estimate-item.schema';
import { config } from 'dotenv';

config();

async function checkItem() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/taboolo');
        console.log('Connected to MongoDB');

        const item = await EstimateItem.findOne({ progressive: 510 }).populate('project').lean();

        if (item) {
            console.log('Item found:');
            console.log(JSON.stringify(item, null, 2));

            // Specifically check the quantity
            if (item.project) {
                console.log('Quantity in DB:', item.project.quantity);
            }
        } else {
            console.log('Item with progressive 510 not found.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
    }
}

checkItem();
