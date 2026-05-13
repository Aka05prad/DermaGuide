require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');
const products = require('./products.json');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  await Product.deleteMany({});   // clear old data
  await Product.insertMany(products);
  console.log('Seeded', products.length, 'products!');
  process.exit();
});