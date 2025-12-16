import { Schema, model } from 'mongoose';
const ItemSchema = new Schema({});
export const Item = model('Item', ItemSchema);
export const EstimateItem = model('EstimateItem', ItemSchema); // Alias check
