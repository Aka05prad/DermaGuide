const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  description: String,
  skinType:    [String],    // e.g. ['oily', 'combination']
  concerns:    [String],    // e.g. ['acne', 'pigmentation']
  price:       Number,
  brand:       String,
  imageUrl:    String,
  category:    String,      // e.g. 'cleanser', 'serum'
  createdAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', productSchema);