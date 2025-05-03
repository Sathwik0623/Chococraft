const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files with correct MIME types
app.use(express.static(path.join(__dirname, '../chococraft-frontend'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'text/javascript');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

// Serve uploaded images separately
app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'Uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  dbName: 'chococraft',
})
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
});
const User = mongoose.model('User', userSchema);

// Product Schema
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, required: true },
  image_url: { type: String, required: true },
});
const Product = mongoose.model('Product', productSchema);

// Update Schema
const updateSchema = new mongoose.Schema({
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
const Update = mongoose.model('Update', updateSchema);

// About Us Schema
const aboutUsSchema = new mongoose.Schema({
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
const AboutUs = mongoose.model('AboutUs', aboutUsSchema);

// Contact Information Schema
const contactInfoSchema = new mongoose.Schema({
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
const ContactInfo = mongoose.model('ContactInfo', contactInfoSchema);

// Contact Message Schema
const contactMessageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema);

// Banner Schema
const bannerSchema = new mongoose.Schema({
  image_url: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
const Banner = mongoose.model('Banner', bannerSchema);

// Order Schema
const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
  }],
  total: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Rejected'], default: 'Pending' },
  shipping: {
    name: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
  },
  paymentMethod: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
const Order = mongoose.model('Order', orderSchema);

// Favorite Schema
const favoriteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  createdAt: { type: Date, default: Date.now },
});
const Favorite = mongoose.model('Favorite', favoriteSchema);

// Cart Schema
const cartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
  createdAt: { type: Date, default: Date.now },
});
const Cart = mongoose.model('Cart', cartSchema);

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    console.error('❌ Authentication failed: No token provided');
    return res.status(401).json({ error: 'Access Denied: No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('❌ Authentication failed: Invalid token', err.message);
    return res.status(403).json({ error: 'Access Denied: Invalid token' });
  }
};

// Admin Middleware
const authenticateAdmin = (req, res, next) => {
  authenticateToken(req, res, () => {
    if (!req.user.isAdmin) {
      console.error('❌ Admin access denied: User is not an admin', { userId: req.user.userId });
      return res.status(403).json({ error: 'Access Denied: Admins only' });
    }
    next();
  });
};

// Signup Route
app.post('/api/signup', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword, isAdmin: false });
    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('❌ Signup error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login Route
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt:', { username });

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const user = await User.findOne({ username });
    console.log('User found:', user ? user.username : 'No user');
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    console.log('Password match:', isPasswordCorrect);
    if (!isPasswordCorrect) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign({ userId: user._id, isAdmin: user.isAdmin }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    res.status(200).json({ message: 'Login successful', token, userId: user._id, isAdmin: user.isAdmin });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add Product Route
app.post('/products', authenticateAdmin, upload.single('image'), async (req, res) => {
  const { name, price, stock } = req.body;

  if (!name || !price || !stock || !req.file) {
    return res.status(400).json({ error: 'All fields and image are required' });
  }

  try {
    const image_url = `uploads/${req.file.filename}`;
    const product = new Product({ name, price: parseFloat(price), stock: parseInt(stock), image_url });
    await product.save();
    console.log(`Product added successfully: ${name}`);
    res.status(201).json({ message: 'Product added successfully' });
  } catch (err) {
    console.error('❌ Error adding product:', err);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

// Get Single Product Route
app.get('/products/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    console.error('❌ Error fetching product:', err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Update Product Route
app.put('/products/:id', authenticateAdmin, upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const { name, price, stock } = req.body;

  if (!name && !price && !stock && !req.file) {
    return res.status(400).json({ error: 'At least one field or a new image is required for update' });
  }

  try {
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (name) product.name = name;
    if (price) product.price = parseFloat(price);
    if (stock !== undefined) product.stock = parseInt(stock);
    if (req.file) product.image_url = `uploads/${req.file.filename}`;

    await product.save();
    console.log(`Product updated successfully: ${id}`);
    res.status(200).json({ message: 'Product updated successfully' });
  } catch (err) {
    console.error('❌ Error updating product:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete Product Route
app.delete('/products/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    console.log(`Product deleted successfully: ${id}`);
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting product:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Get Products Route
app.get('/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    console.error('❌ Error fetching products:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Add Update Route
app.post('/updates', authenticateAdmin, async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Update text is required' });
  }

  try {
    const update = new Update({ text });
    await update.save();
    console.log(`Update added successfully: ${text}`);
    res.status(201).json({ message: 'Update added successfully' });
  } catch (err) {
    console.error('❌ Error adding update:', err);
    res.status(500).json({ error: 'Failed to add update' });
  }
});

// Get Latest Update Route
app.get('/updates/latest', async (req, res) => {
  try {
    const update = await Update.findOne().sort({ createdAt: -1 });
    if (!update) {
      return res.json({ text: 'Welcome to ChocoCraft! Check out our latest chocolates.' });
    }
    res.json(update);
  } catch (err) {
    console.error('❌ Error fetching update:', err);
    res.status(500).json({ error: 'Failed to fetch update' });
  }
});

// Add About Us Route (POST)
app.post('/about-us', authenticateAdmin, async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'About Us text is required' });
  }

  try {
    await AboutUs.deleteMany({});
    const aboutUs = new AboutUs({ text });
    await aboutUs.save();
    console.log('About Us content saved successfully');
    res.status(201).json({ message: 'About Us content saved successfully' });
  } catch (err) {
    console.error('❌ Error saving About Us content:', err);
    res.status(500).json({ error: 'Failed to save About Us content' });
  }
});

// Get About Us Route (GET)
app.get('/about-us', async (req, res) => {
  try {
    const aboutUs = await AboutUs.findOne().sort({ createdAt: -1 });
    if (!aboutUs) {
      return res.json({ text: 'No About Us content set.' });
    }
    res.json(aboutUs);
  } catch (err) {
    console.error('❌ Error fetching About Us content:', err);
    res.status(500).json({ error: 'Failed to fetch About Us content' });
  }
});

// Add Contact Information Route (POST)
app.post('/contact-info', authenticateAdmin, async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Contact Information text is required' });
  }

  try {
    await ContactInfo.deleteMany({});
    const contactInfo = new ContactInfo({ text });
    await contactInfo.save();
    console.log('Contact Information saved successfully');
    res.status(201).json({ message: 'Contact Information saved successfully' });
  } catch (err) {
    console.error('❌ Error saving Contact Information:', err);
    res.status(500).json({ error: 'Failed to save Contact Information' });
  }
});

// Get Contact Information Route (GET)
app.get('/contact-info', async (req, res) => {
  try {
    const contactInfo = await ContactInfo.findOne().sort({ createdAt: -1 });
    if (!contactInfo) {
      return res.json({ text: 'No Contact Us content set.' });
    }
    res.json(contactInfo);
  } catch (err) {
    console.error('❌ Error fetching Contact Information:', err);
    res.status(500).json({ error: 'Failed to fetch Contact Information' });
  }
});

// Add Contact Message Route (POST)
app.post('/contact-messages', async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required' });
  }

  try {
    const contactMessage = new ContactMessage({ name, email, message });
    await contactMessage.save();
    console.log(`Contact message saved successfully from ${email}`);
    res.status(201).json({ message: 'Message sent successfully' });
  } catch (err) {
    console.error('❌ Error saving contact message:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get Contact Messages Route (GET)
app.get('/contact-messages', authenticateAdmin, async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    console.error('❌ Error fetching contact messages:', err);
    res.status(500).json({ error: 'Failed to fetch contact messages' });
  }
});

// Add Banner Route
app.post('/banners', authenticateAdmin, upload.single('banner-image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Banner image is required' });
  }

  try {
    const image_url = `uploads/${req.file.filename}`;
    const banner = new Banner({ image_url });
    await banner.save();
    console.log('Banner added successfully');
    res.status(201).json({ message: 'Banner added successfully' });
  } catch (err) {
    console.error('❌ Error adding banner:', err);
    res.status(500).json({ error: 'Failed to add banner' });
  }
});

// Get Single Banner Route
app.get('/banners/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const banner = await Banner.findById(id);
    if (!banner) {
      return res.status(404).json({ error: 'Banner not found' });
    }
    res.json(banner);
  } catch (err) {
    console.error('❌ Error fetching banner:', err);
    res.status(500).json({ error: 'Failed to fetch banner' });
  }
});

// Update Banner Route
app.put('/banners/:id', authenticateAdmin, upload.single('banner-image'), async (req, res) => {
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({ error: 'A new banner image is required for update' });
  }

  try {
    const banner = await Banner.findById(id);
    if (!banner) {
      return res.status(404).json({ error: 'Banner not found' });
    }

    banner.image_url = `uploads/${req.file.filename}`;
    await banner.save();
    console.log(`Banner updated successfully: ${id}`);
    res.status(200).json({ message: 'Banner updated successfully' });
  } catch (err) {
    console.error('❌ Error updating banner:', err);
    res.status(500).json({ error: 'Failed to update banner' });
  }
});

// Delete Banner Route
app.delete('/banners/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const banner = await Banner.findByIdAndDelete(id);
    if (!banner) {
      return res.status(404).json({ error: 'Banner not found' });
    }
    console.log(`Banner deleted successfully: ${id}`);
    res.status(200).json({ message: 'Banner deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting banner:', err);
    res.status(500).json({ error: 'Failed to delete banner' });
  }
});

// Get Banners Route
app.get('/banners', async (req, res) => {
  try {
    const banners = await Banner.find().sort({ createdAt: -1 });
    res.json(banners);
  } catch (err) {
    console.error('❌ Error fetching banners:', err);
    res.status(500).json({ error: 'Failed to fetch banners' });
  }
});

// Get All Orders Route (Admin)
app.get('/api/orders', authenticateAdmin, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('userId', 'username')
      .populate('items.productId', 'name image_url')
      .sort({ createdAt: -1 });
    console.log(`Fetched ${orders.length} orders for admin user ${req.user.userId}`);
    res.status(200).json(orders);
  } catch (err) {
    console.error('❌ Error fetching all orders:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get User Orders Route
app.get('/orders/:userId', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  if (req.user.userId !== userId) {
    console.error('❌ Access denied: User can only access their own orders', { requestedUserId: userId, authUserId: req.user.userId });
    return res.status(403).json({ error: 'Access Denied: You can only access your own orders' });
  }

  try {
    const orders = await Order.find({ userId })
      .populate('items.productId', 'name image_url')
      .sort({ createdAt: -1 });
    console.log(`Fetched ${orders.length} orders for user ${userId}`);
    res.status(200).json(orders);
  } catch (err) {
    console.error('❌ Error fetching orders:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Create Order Route
app.post('/api/orders', authenticateToken, async (req, res) => {
  const { userId, items, total, shipping, paymentMethod } = req.body;

  if (!userId || !items || !Array.isArray(items) || !total || !shipping || !paymentMethod) {
    console.error('❌ Order creation failed: Missing required fields', { userId, items, total, shipping, paymentMethod });
    return res.status(400).json({ error: 'User ID, items, total, shipping, and payment method are required' });
  }

  if (req.user.userId !== userId) {
    console.error('❌ Order creation failed: User can only create orders for themselves', { authUserId: req.user.userId, requestedUserId: userId });
    return res.status(403).json({ error: 'Access Denied: You can only create orders for yourself' });
  }

  try {
    // Validate stock for all items
    for (const item of items) {
      const product = await Product.findById(item.productId || item.id);
      if (!product) {
        console.error(`❌ Order creation failed: Product not found for ID ${item.productId || item.id}`);
        return res.status(400).json({ error: `Product with ID ${item.productId || item.id} not found` });
      }
      if (product.stock < item.quantity) {
        console.error(`❌ Order creation failed: Insufficient stock for ${product.name}`, { stock: product.stock, requested: item.quantity });
        return res.status(400).json({ error: `Insufficient stock for ${product.name}. Only ${product.stock} available.` });
      }
    }

    // Update stock
    for (const item of items) {
      const product = await Product.findById(item.productId || item.id);
      product.stock -= item.quantity;
      if (product.stock < 0) product.stock = 0;
      await product.save();
      console.log(`Stock updated for product ${product.name}: New stock = ${product.stock}`);
    }

    const order = new Order({
      userId,
      items: items.map(item => ({
        productId: item.productId || item.id,
        quantity: item.quantity,
        price: item.price,
      })),
      total,
      shipping,
      paymentMethod,
    });
    await order.save();
    console.log(`Order created successfully for user ${userId}: Order ID ${order._id}`);

    // Clear the user's cart after order placement
    await Cart.deleteMany({ userId });
    console.log(`Cleared cart for user ${userId} after order creation`);

    res.status(201).json({ message: 'Order created successfully', orderId: order._id });
  } catch (err) {
    console.error('❌ Error creating order:', err);
    res.status(500).json({ error: 'Failed to create order', details: err.message });
  }
});

// Update Order Status Route
app.put('/api/orders/:orderId/status', authenticateAdmin, async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  if (!status || !['Pending', 'Processing', 'Shipped', 'Delivered', 'Rejected'].includes(status)) {
    console.error('❌ Order status update failed: Invalid status', { orderId, status });
    return res.status(400).json({ error: 'Valid status is required (Pending, Processing, Shipped, Delivered, Rejected)' });
  }

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      console.error(`❌ Order status update failed: Order not found for ID ${orderId}`);
      return res.status(404).json({ error: 'Order not found' });
    }

    order.status = status;
    await order.save();
    console.log(`Order ${orderId} status updated to ${status} by admin ${req.user.userId}`);

    res.status(200).json({ message: 'Order status updated successfully' });
  } catch (err) {
    console.error('❌ Error updating order status:', err);
    res.status(500).json({ error: 'Failed to update order status', details: err.message });
  }
});

// Get Favorites Route
app.get('/api/favorites', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const favorites = await Favorite.find({ userId }).populate('productId', 'name price image_url stock');
    console.log(`Fetched favorites for user ${userId}:`, favorites);
    const validFavorites = favorites.filter(fav => fav.productId);
    if (favorites.length !== validFavorites.length) {
      console.warn(`Some favorites for user ${userId} reference invalid products:`, favorites.filter(fav => !fav.productId));
    }
    res.status(200).json(validFavorites);
  } catch (err) {
    console.error('❌ Error fetching favorites:', err);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// Add a Single Favorite Route
app.post('/api/favorites/add', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const { productId } = req.body;

  console.log(`Attempting to add favorite for user ${userId}:`, { productId });

  if (!productId) {
    console.warn(`Invalid request: Product ID missing for user ${userId}`);
    return res.status(400).json({ error: 'Product ID is required' });
  }

  try {
    const productExists = await Product.findById(productId);
    if (!productExists) {
      console.warn(`Product ID ${productId} does not exist for user ${userId}`);
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const existingFavorite = await Favorite.findOne({ userId, productId });
    if (existingFavorite) {
      console.warn(`Product ${productId} already in favorites for user ${userId}`);
      return res.status(409).json({ error: 'Product already in favorites' });
    }

    const favorite = new Favorite({ userId, productId });
    await favorite.save();
    console.log(`Successfully added favorite for user ${userId}:`, { productId });
    res.status(201).json({ message: 'Favorite added successfully' });
  } catch (err) {
    console.error(`❌ Error adding favorite for user ${userId}:`, err);
    res.status(500).json({ error: 'Failed to add favorite', details: err.message });
  }
});

// Remove Favorite Route
app.delete('/api/favorites/:productId', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const { productId } = req.params;

  try {
    const result = await Favorite.deleteOne({ userId, productId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Favorite not found' });
    }
    console.log(`Removed favorite ${productId} for user ${userId}`);
    res.status(200).json({ message: 'Favorite removed successfully' });
  } catch (err) {
    console.error('❌ Error removing favorite:', err);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

// Get Cart Route
app.get('/api/cart', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const cartItems = await Cart.find({ userId }).populate('productId', 'name price image_url stock');
    console.log(`Fetched cart for user ${userId}: ${cartItems.length} items`);
    res.json(cartItems);
  } catch (err) {
    console.error('❌ Error fetching cart:', err);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// Add/Update Cart Route
app.post('/api/cart', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const { cart } = req.body;

  console.log(`Received cart update request for user ${userId}:`, cart);

  if (!Array.isArray(cart)) {
    console.error(`Invalid cart format for user ${userId}: Expected an array`);
    return res.status(400).json({ error: 'Cart must be an array' });
  }

  try {
    // Validate cart items
    const cartDocs = [];
    for (const item of cart) {
      if (!item.productId || !item.quantity || item.quantity < 1) {
        console.error(`Invalid cart item for user ${userId}:`, item);
        return res.status(400).json({ error: 'Each cart item must have a valid productId and quantity' });
      }

      const product = await Product.findById(item.productId);
      if (!product) {
        console.error(`Product not found for user ${userId}: Product ID ${item.productId}`);
        return res.status(400).json({ error: `Product with ID ${item.productId} not found` });
      }

      cartDocs.push({
        userId,
        productId: item.productId,
        quantity: item.quantity,
      });
    }

    // Clear existing cart for the user
    await Cart.deleteMany({ userId });
    console.log(`Cleared existing cart for user ${userId}`);

    // Insert new cart items
    if (cartDocs.length > 0) {
      await Cart.insertMany(cartDocs);
      console.log(`Inserted ${cartDocs.length} cart items for user ${userId}`);
    } else {
      console.log(`No cart items to insert for user ${userId}`);
    }

    res.status(201).json({ message: 'Cart updated successfully' });
  } catch (err) {
    console.error(`❌ Error saving cart for user ${userId}:`, err);
    res.status(500).json({ error: 'Failed to save cart', details: err.message });
  }
});

// Remove Cart Item Route
app.delete('/api/cart/:productId', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const { productId } = req.params;

  try {
    const result = await Cart.deleteOne({ userId, productId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }
    console.log(`Removed cart item ${productId} for user ${userId}`);
    res.status(200).json({ message: 'Cart item removed successfully' });
  } catch (err) {
    console.error('❌ Error removing cart item:', err);
    res.status(500).json({ error: 'Failed to remove cart item' });
  }
});

// Serve index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../chococraft-frontend/html/index.html'));
});

// Serve other HTML files explicitly
app.get('/signup.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../chococraft-frontend/html/signup.html'));
});

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../chococraft-frontend/html/login.html'));
});

// Serve user-orders.html without authentication
app.get('/user-orders.html', (req, res) => {
  const filePath = path.join(__dirname, '../chococraft-frontend/html', 'user-orders.html');
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error(`❌ Failed to serve user-orders.html: ${err.message}`);
      res.status(404).send('Page not found');
    }
  });
});

// Serve orders.html with admin authentication
app.get('/orders.html', authenticateAdmin, (req, res) => {
  const filePath = path.join(__dirname, '../chococraft-frontend/html', 'orders.html');
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error(`❌ Failed to serve orders.html: ${err.message}`);
      res.status(404).send('Page not found');
    }
  });
});

// Protect admin.html route
app.get('/admin.html', authenticateAdmin, (req, res) => {
  const filePath = path.join(__dirname, '../chococraft-frontend/html', 'admin.html');
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error(`❌ Failed to serve admin.html: ${err.message}`);
      res.status(404).send('Page not found');
    }
  });
});

// Protect favorites.html route with custom handling for unauthenticated users
app.get('/favorites.html', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.redirect('/login.html?redirectReason=favorites');
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    const filePath = path.join(__dirname, '../chococraft-frontend/html', 'favorites.html');
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(`❌ Failed to serve favorites.html: ${err.message}`);
        res.status(404).send('Page not found');
      }
    });
  } catch (err) {
    console.error('❌ Invalid Token:', err.message);
    res.redirect('/login.html?redirectReason=favorites');
  }
});

// Dynamic route for other HTML files
app.get('/:page.html', (req, res) => {
  const page = req.params.page;
  const filePath = path.join(__dirname, '../chococraft-frontend/html', `${page}.html`);
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error(`❌ Failed to serve ${page}.html: ${err.message}`);
      res.status(404).send('Page not found');
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});