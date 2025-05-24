// SpecialCategory.js
const mongoose = require('mongoose');

// Define the SpecialCategory schema
const specialCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Special category name is required'],
    trim: true,
    unique: true, // Ensure unique category names
  },
  productIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product ID is required'],
  }],
  isVisible: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Middleware to update the updatedAt field on save
specialCategorySchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Export the SpecialCategory model
module.exports = mongoose.model('SpecialCategory', specialCategorySchema);