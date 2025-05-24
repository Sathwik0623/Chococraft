const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  intendedFor: {
    type: String,
    enum: ['all', 'users', 'admins'],
    required: true, // Changed from optional to required
  },
  type: {
    type: String,
    enum: ['user', 'order', 'stock', 'system'],
    default: 'user', // Existing notifications default to 'user'
  },
  readBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    readAt: {
      type: Date,
      default: Date.now,
    },
  }],
  // Optional: Add metadata for order/stock notifications
  metadata: {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  },
});

module.exports = mongoose.model('Notification', notificationSchema);