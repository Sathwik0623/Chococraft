const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const http = require('http');
require('dotenv').config();
const Notification = require('./models/Notification');

const { body, validationResult } = require('express-validator');
const app = express();
const server = http.createServer(app);

// Increase server connection limits
server.maxConnections = 100;
server.keepAliveTimeout = 60000; // 60 seconds

// Middleware
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3001'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.setHeader('Connection', 'keep-alive');
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'Uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  dbName: 'chococraft',
})
  .then(() => {
    console.log('✅ MongoDB connected successfully');
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

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
  originalPrice: { type: Number, required: true },
  stock: { type: Number, required: true },
  image_url: { type: String, required: false },
  description: { type: String, required: false },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
});
productSchema.index({ name: 1 });
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
  read: { type: Boolean, default: false },
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
  date: { type: String },
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
orderSchema.index({ userId: 1, createdAt: -1 });
const Order = mongoose.model('Order', orderSchema);

// Favorite Schema
const favoriteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  createdAt: { type: Date, default: Date.now },
});
favoriteSchema.index({ userId: 1, productId: 1 });
const Favorite = mongoose.model('Favorite', favoriteSchema);

// Cart Schema
const cartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
  createdAt: { type: Date, default: Date.now },
});
cartSchema.index({ userId: 1, productId: 1 });
const Cart = mongoose.model('Cart', cartSchema);

// Category Schema
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  isVisible: { type: Boolean, default: true },
});
const Category = mongoose.model('Category', categorySchema);

// Special Category Schema
const specialCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  isVisible: { type: Boolean, default: true },
});
const SpecialCategory = mongoose.model('SpecialCategory', specialCategorySchema);

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

// Migration script to set originalPrice for existing products
const migrateProducts = async () => {
  try {
    const products = await Product.find();
    let updatedCount = 0;
    console.log(`Starting migration for ${products.length} products`);
    for (const product of products) {
      if (product.originalPrice === undefined || product.originalPrice === null) {
        product.originalPrice = product.price;
        await product.save();
        updatedCount++;
        console.log(`Migrated product ${product._id} - ${product.name}: Set originalPrice to ${product.price}`);
      } else {
        console.log(`Product ${product._id} - ${product.name} already has originalPrice: ${product.originalPrice}`);
      }
    }
    console.log(`Migration completed: Updated ${updatedCount} products`);
    if (updatedCount === 0) {
      console.log('All products already have originalPrice set.');
    }
  } catch (err) {
    console.error('❌ Migration error:', err);
  }
};

// Migration script to fix scaled prices
const fixScaledPrices = async () => {
  try {
    const products = await Product.find();
    let updatedCount = 0;
    console.log(`Starting price scaling fix for ${products.length} products`);
    for (const product of products) {
      if (product.price > 1000 && product.price % 100 === 0) {
        const originalPriceScaled = product.originalPrice > 1000 && product.originalPrice % 100 === 0;
        const oldPrice = product.price;
        const oldOriginalPrice = product.originalPrice;
        product.price = product.price / 100;
        product.originalPrice = originalPriceScaled ? product.originalPrice / 100 : product.originalPrice;
        await product.save();
        updatedCount++;
        console.log(`Fixed scaling for product ${product._id} - ${product.name}: price ${oldPrice} → ${product.price}, originalPrice ${oldOriginalPrice} → ${product.originalPrice}`);
      }
    }
    console.log(`Price scaling fix completed: Updated ${updatedCount} products`);
    if (updatedCount === 0) {
      console.log('No products needed price scaling fixes.');
    }
  } catch (err) {
    console.error('❌ Price scaling fix error:', err);
  }
};

// Migration script to set intendedFor, createdBy, type, and metadata for existing notifications
const migrateNotifications = async () => {
  try {
    const notifications = await Notification.find();
    let updatedCount = 0;
    console.log(`Starting migration for ${notifications.length} notifications`);

    // Find an admin user to use as default createdBy
    const adminUser = await User.findOne({ isAdmin: true }).lean();
    const defaultCreatedBy = adminUser
      ? adminUser._id
      : new mongoose.Types.ObjectId();

    for (const notification of notifications) {
      let updated = false;
      if (notification.createdBy === undefined || notification.createdBy === null) {
        notification.createdBy = defaultCreatedBy;
        updated = true;
        console.log(`Set createdBy for notification ${notification._id} to ${defaultCreatedBy}`);
      }
      if (notification.intendedFor === undefined || notification.intendedFor === null) {
        notification.intendedFor = 'all';
        updated = true;
        console.log(`Set intendedFor for notification ${notification._id} to 'all'`);
      }
      if (notification.type === undefined || notification.type === null) {
        notification.type = 'user';
        updated = true;
        console.log(`Set type for notification ${notification._id} to 'user'`);
      }
      if (notification.metadata === undefined || notification.metadata === null) {
        notification.metadata = { orderId: null, productId: null };
        updated = true;
        console.log(`Initialized metadata for notification ${notification._id}`);
      }
      if (updated) {
        await notification.save();
        updatedCount++;
        console.log(`Migrated notification ${notification._id}: Updated fields`);
      } else {
        console.log(`Notification ${notification._id} already has valid fields`);
      }
    }
    console.log(`Notification migration completed: Updated ${updatedCount} notifications`);
    if (updatedCount === 0) {
      console.log('All notifications already have required fields set.');
    }
  } catch (err) {
    console.error('❌ Notification migration error:', err.message, err.stack);
    throw err;
  }
};

// Migration script to add read field to existing contact messages
const migrateContactMessages = async () => {
  try {
    const messages = await ContactMessage.find();
    let updatedCount = 0;
    console.log(`Starting migration for ${messages.length} contact messages`);
    for (const message of messages) {
      if (message.read === undefined) {
        message.read = false;
        await message.save();
        updatedCount++;
        console.log(`Migrated contact message ${message._id}: Set read to false`);
      }
    }
    console.log(`Contact message migration completed: Updated ${updatedCount} messages`);
    if (updatedCount === 0) {
      console.log('All contact messages already have read field set.');
    }
  } catch (err) {
    console.error('❌ Contact message migration error:', err);
  }
};

// Run migrations on server start
migrateProducts();
migrateNotifications();
migrateContactMessages();

// Endpoint to trigger migrations manually
app.post('/api/migrate-products', async (req, res) => {
  try {
    await migrateProducts();
    res.status(200).json({ message: 'Migration completed successfully' });
  } catch (err) {
    console.error('❌ Manual migration error:', err);
    res.status(500).json({ error: 'Failed to run migration' });
  }
});

app.post('/api/migrate-notifications', authenticateAdmin, async (req, res) => {
  try {
    await migrateNotifications();
    res.status(200).json({ message: 'Notification migration completed successfully' });
  } catch (err) {
    console.error('❌ Manual notification migration error:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to run notification migration', details: err.message });
  }
});

app.post('/api/migrate-contact-messages', authenticateAdmin, async (req, res) => {
  try {
    await migrateContactMessages();
    res.status(200).json({ message: 'Contact message migration completed successfully' });
  } catch (err) {
    console.error('❌ Manual contact message migration error:', err);
    res.status(500).json({ error: 'Failed to run contact message migration' });
  }
});

app.post('/api/fix-scaled-prices', authenticateAdmin, async (req, res) => {
  try {
    await fixScaledPrices();
    res.status(200).json({ message: 'Price scaling fix completed successfully' });
  } catch (err) {
    console.error('❌ Manual price scaling fix error:', err);
    res.status(500).json({ error: 'Failed to run price scaling fix' });
  }
});

// Middleware to validate price units
const validatePriceUnits = (req, res, next) => {
  const { price, originalPrice } = req.body;
  const priceValue = parseFloat(price);
  const originalPriceValue = parseFloat(originalPrice);

  if (priceValue && priceValue > 1000 && priceValue % 100 === 0) {
    console.warn(`⚠️ Price for product may be in paise: ${priceValue}. Expected in rupees.`);
  }
  if (originalPriceValue && originalPriceValue > 1000 && originalPriceValue % 100 === 0) {
    console.warn(`⚠️ Original price for product may be in paise: ${originalPriceValue}. Expected in rupees.`);
  }
  next();
};

// Helper function to create admin notifications
const createAdminNotification = async ({ title, message, type, orderId, productId }) => {
  try {
    const adminUser = await User.findOne({ isAdmin: true }).lean();
    const createdBy = adminUser ? adminUser._id : new mongoose.Types.ObjectId();

    const notification = new Notification({
      title,
      message,
      createdBy,
      intendedFor: 'admins',
      type,
      readBy: [],
      metadata: { orderId, productId },
    });
    await notification.save();
    console.log(`Created admin notification: ${title} (type: ${type})`);
  } catch (err) {
    console.error('❌ Error creating admin notification:', err.message, err.stack);
  }
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
    console.error('❌ Signup error:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to register user' });
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
    console.error('❌ Login error:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

// Add Product Route
app.post('/api/products', authenticateAdmin, upload.single('image'), validatePriceUnits, async (req, res) => {
  const { name, price, originalPrice, stock, description, categoryId } = req.body;

  if (!name || !price || !originalPrice || !stock) {
    return res.status(400).json({ error: 'Name, price, original price, and stock are required' });
  }

  try {
    const priceValue = parseFloat(price);
    const originalPriceValue = parseFloat(originalPrice);
    const stockValue = parseInt(stock);

    if (isNaN(priceValue) || priceValue <= 0) {
      return res.status(400).json({ error: 'Price must be a positive number' });
    }
    if (isNaN(originalPriceValue) || originalPriceValue <= 0) {
      return res.status(400).json({ error: 'Original price must be a positive number' });
    }
    if (isNaN(stockValue) || stockValue < 0) {
      return res.status(400).json({ error: 'Stock must be a non-negative number' });
    }

    let validatedCategoryId = null;
    if (categoryId && categoryId !== '') {
      const category = await Category.findById(categoryId).lean();
      if (!category) {
        return res.status(400).json({ error: 'Invalid category ID' });
      }
      validatedCategoryId = categoryId;
      console.log(`Validated category for product: ${name}, categoryId: ${categoryId}`);
    }

    const image_url = req.file ? `/Uploads/${req.file.filename}` : null;
    const product = new Product({
      name,
      price: priceValue,
      originalPrice: originalPriceValue,
      stock: stockValue,
      description,
      image_url,
      categoryId: validatedCategoryId,
    });
    await product.save();
    console.log(`Product added successfully: ${name}`, {
      price: product.price,
      originalPrice: product.originalPrice,
      stock: product.stock,
      categoryId: product.categoryId,
    });
    res.status(201).json({ message: 'Product added successfully', product });
  } catch (err) {
    console.error('❌ Error adding product:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

// Get Single Product Route
app.get('/api/products/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findById(id).lean();
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    console.log(`Fetched product ${id}:`, { name: product.name, price: product.price, originalPrice: product.originalPrice, stock: product.stock });
    res.json(product);
  } catch (err) {
    console.error('❌ Error fetching product:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Update Product Route
app.put('/api/products/:id', authenticateAdmin, upload.single('image'), validatePriceUnits, async (req, res) => {
  const { id } = req.params;
  const { name, price, originalPrice, stock, description, categoryId } = req.body;

  try {
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (name) product.name = name;
    if (price) {
      const priceValue = parseFloat(price);
      if (isNaN(priceValue) || priceValue <= 0) {
        return res.status(400).json({ error: 'Price must be a positive number' });
      }
      product.price = priceValue;
    }
    if (originalPrice) {
      const originalPriceValue = parseFloat(originalPrice);
      if (isNaN(originalPriceValue) || originalPriceValue <= 0) {
        return res.status(400).json({ error: 'Original price must be a positive number' });
      }
      product.originalPrice = originalPriceValue;
    }
    if (stock !== undefined) {
      const stockValue = parseInt(stock);
      if (isNaN(stockValue) || stockValue < 0) {
        return res.status(400).json({ error: 'Stock must be a non-negative number' });
      }
      product.stock = stockValue;
    }
    if (description) product.description = description;
    if (req.file) product.image_url = `/Uploads/${req.file.filename}`;
    
    if (categoryId !== undefined) {
      if (categoryId === '' || categoryId === null) {
        product.categoryId = null;
      } else {
        const category = await Category.findById(categoryId).lean();
        if (!category) {
          return res.status(400).json({ error: 'Invalid category ID' });
        }
        product.categoryId = categoryId;
      }
      console.log(`Updating product ${id} with categoryId: ${product.categoryId}`);
    }

    await product.save();
    console.log(`Product updated successfully: ${id}`, {
      price: product.price,
      originalPrice: product.originalPrice,
      stock: product.stock,
      categoryId: product.categoryId,
    });
    res.status(200).json({ message: 'Product updated successfully', product });
  } catch (err) {
    console.error('❌ Error updating product:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to update product', details: err.message });
  }
});

// Dedicated Route for Stock-Only Updates
app.put('/api/products/:id/stock', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { stock } = req.body;

  try {
    const stockValue = parseInt(stock);
    if (isNaN(stockValue) || stockValue < 0) {
      return res.status(400).json({ error: 'Stock must be a non-negative number' });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const oldStock = product.stock;
    product.stock = stockValue;
    await product.save();
    console.log(`Stock updated successfully for product ${id}: ${product.stock}`);

    // Check for low stock (threshold: 10 units)
    if (product.stock < 10 && oldStock >= 10) {
      await createAdminNotification({
        title: `Low Stock Alert: ${product.name}`,
        message: `Stock for ${product.name} is now ${product.stock} units.`,
        type: 'stock',
        productId: product._id,
      });
    }

    res.status(200).json({ message: 'Stock updated successfully', stock: product.stock });
  } catch (err) {
    console.error('❌ Error updating stock:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to update stock', details: err.message });
  }
});

// Delete Product Route
app.delete('/api/products/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    await Cart.deleteMany({ productId: id });
    await Favorite.deleteMany({ productId: id });
    await Order.updateMany(
      { 'items.productId': id },
      { $pull: { items: { productId: id } } }
    );
    await Order.deleteMany({ items: { $size: 0 } });
    await SpecialCategory.updateMany(
      { productIds: id },
      { $pull: { productIds: id } }
    );
    console.log(`Product deleted successfully: ${id}`);
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting product:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Get Products Route
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().lean();
    console.log(`Fetched ${products.length} products`);
    products.forEach(product => {
      console.log(`Product ${product._id} - ${product.name}:`, { price: product.price, originalPrice: product.originalPrice, stock: product.stock });
    });
    res.json(products);
  } catch (err) {
    console.error('❌ Error fetching products:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Add Update Route
app.post('/api/updates', authenticateAdmin, async (req, res) => {
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
    console.error('❌ Error adding update:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to add update' });
  }
});

// Get Latest Update Route
app.get('/api/updates/latest', async (req, res) => {
  try {
    const update = await Update.findOne().sort({ createdAt: -1 }).lean();
    if (!update) {
      return res.json({ text: 'Welcome to ChocoCraft! Check out our latest chocolates.' });
    }
    res.json(update);
  } catch (err) {
    console.error('❌ Error fetching update:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch update' });
  }
});

// Add About Us Route
app.post('/api/about-us', authenticateAdmin, async (req, res) => {
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
    console.error('❌ Error saving About Us content:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to save About Us content' });
  }
});

// Get About Us Route
app.get('/api/about-us', async (req, res) => {
  try {
    const aboutUs = await AboutUs.findOne().sort({ createdAt: -1 }).lean();
    if (!aboutUs) {
      return res.json({ text: 'No About Us content set.' });
    }
    res.json(aboutUs);
  } catch (err) {
    console.error('❌ Error fetching About Us content:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch About Us content' });
  }
});

// Add Contact Information Route
app.post('/api/contact-info', authenticateAdmin, async (req, res) => {
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
    console.error('❌ Error saving Contact Information:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to save Contact Information' });
  }
});

// Get Contact Information Route
app.get('/api/contact-info', async (req, res) => {
  try {
    const contactInfo = await ContactInfo.findOne().sort({ createdAt: -1 }).lean();
    if (!contactInfo) {
      return res.json({ text: 'No Contact Us content set.' });
    }
    res.json(contactInfo);
  } catch (err) {
    console.error('❌ Error fetching Contact Information:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch Contact Information' });
  }
});

// Add Contact Message Route
app.post('/api/contact-messages', async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required' });
  }

  try {
    const contactMessage = new ContactMessage({ name, email, message, read: false });
    await contactMessage.save();
    console.log(`Contact message saved successfully from ${email}`);
    res.status(201).json({ message: 'Message sent successfully' });
  } catch (err) {
    console.error('❌ Error saving contact message:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get Contact Messages Route
app.get('/api/contact-messages', authenticateAdmin, async (req, res) => {
  try {
    const { unread } = req.query;
    let query = {};
    if (unread === 'true') {
      query.read = false;
    }
    const messages = await ContactMessage.find(query).sort({ createdAt: -1 }).lean();
    // Map messages to include isRead and consistent fields
    const formattedMessages = messages.map(message => ({
      _id: message._id,
      title: `Message from ${message.name}`,
      message: message.message,
      email: message.email,
      createdAt: message.createdAt,
      isRead: message.read,
    }));
    console.log(`Fetched ${messages.length} contact messages${unread === 'true' ? ' (unread only)' : ''}`);
    res.json(formattedMessages);
  } catch (err) {
    console.error('❌ Error fetching contact messages:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch contact messages' });
  }
});

// Mark Contact Message as Read Route
app.patch('/api/contact-messages/:id/read', authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const message = await ContactMessage.findById(id);
    if (!message) {
      console.error(`❌ Contact message not found: ${id}`);
      return res.status(404).json({ error: 'Contact message not found' });
    }

    if (message.read) {
      console.log(`Contact message ${id} already marked as read`);
      return res.status(200).json({ message: 'Message already marked as read' });
    }

    message.read = true;
    await message.save();
    console.log(`Contact message ${id} marked as read by admin ${req.user.userId}`);
    res.status(200).json({ message: 'Message marked as read' });
  } catch (err) {
    console.error('❌ Error marking contact message as read:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to mark message as read', details: err.message });
  }
});

// Add Banner Route
app.post('/api/banners', authenticateAdmin, upload.single('banner-image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Banner image is required' });
  }

  try {
    const image_url = `/Uploads/${req.file.filename}`;
    const banner = new Banner({ image_url });
    await banner.save();
    console.log('Banner added successfully');
    res.status(201).json({ message: 'Banner added successfully' });
  } catch (err) {
    console.error('❌ Error adding banner:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to add banner' });
  }
});

// Get Single Banner Route
app.get('/api/banners/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const banner = await Banner.findById(id).lean();
    if (!banner) {
      return res.status(404).json({ error: 'Banner not found' });
    }
    res.json(banner);
  } catch (err) {
    console.error('❌ Error fetching banner:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch banner' });
  }
});

// Update Banner Route
app.put('/api/banners/:id', authenticateAdmin, upload.single('banner-image'), async (req, res) => {
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({ error: 'A new banner image is required for update' });
  }

  try {
    const banner = await Banner.findById(id);
    if (!banner) {
      return res.status(404).json({ error: 'Banner not found' });
    }

    banner.image_url = `/Uploads/${req.file.filename}`;
    await banner.save();
    console.log(`Banner updated successfully: ${id}`);
    res.status(200).json({ message: 'Banner updated successfully' });
  } catch (err) {
    console.error('❌ Error updating banner:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to update banner' });
  }
});

// Delete Banner Route
app.delete('/api/banners/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const banner = await Banner.findByIdAndDelete(id);
    if (!banner) {
      return res.status(404).json({ error: 'Banner not found' });
    }
    console.log(`Banner deleted successfully: ${id}`);
    res.status(200).json({ message: 'Banner deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting banner:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to delete banner' });
  }
});

// Get Banners Route
app.get('/api/banners', async (req, res) => {
  try {
    const banners = await Banner.find().sort({ createdAt: -1 }).lean();
    res.json(banners);
  } catch (err) {
    console.error('❌ Error fetching banners:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch banners' });
  }
});

// Get All Orders Route (Admin)
app.get('/api/orders', authenticateAdmin, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('userId', 'username')
      .populate('items.productId', 'name image_url')
      .sort({ createdAt: -1 })
      .lean();
    console.log(`Fetched ${orders.length} orders for admin user ${req.user.userId}`);
    res.status(200).json(orders);
  } catch (err) {
    console.error('❌ Error fetching all orders:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get User Orders Route
app.get('/api/orders/:userId', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  if (req.user.userId !== userId) {
    console.error('❌ Access denied: User can only access their own orders', { requestedUserId: userId, authUserId: req.user.userId });
    return res.status(403).json({ error: 'Access Denied: You can only access your own orders' });
  }

  try {
    const orders = await Order.find({ userId })
      .populate('items.productId', 'name image_url')
      .sort({ createdAt: -1 })
      .lean();
    console.log(`Fetched ${orders.length} orders for user ${userId}`);
    res.status(200).json(orders);
  } catch (err) {
    console.error('❌ Error fetching orders:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Create Order Route with Transaction
app.post('/api/orders', authenticateToken, async (req, res) => {
  const { userId, items, total, date, shipping, paymentMethod } = req.body;

  if (!userId || !items || !Array.isArray(items) || !total || !shipping || !paymentMethod) {
    console.error('❌ Order creation failed: Missing required fields', { userId, items, total, shipping, paymentMethod });
    return res.status(400).json({ error: 'User ID, items, total, shipping, and payment method are required' });
  }

  if (req.user.userId !== userId) {
    console.error('❌ Order creation failed: User can only create orders for themselves', { authUserId: req.user.userId, requestedUserId: userId });
    return res.status(403).json({ error: 'Access Denied: You can only create orders for yourself' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    for (const item of items) {
      const product = await Product.findById(item.productId || item.id).session(session).lean();
      if (!product) {
        throw new Error(`Product with ID ${item.productId || item.id} not found`);
      }
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Only ${product.stock} available.`);
      }
    }

    for (const item of items) {
      const product = await Product.findById(item.productId || item.id).session(session);
      const oldStock = product.stock;
      product.stock -= item.quantity;
      if (product.stock < 0) product.stock = 0;
      await product.save({ session });
      console.log(`Stock updated for product ${product.name}: New stock = ${product.stock}`);
      // Check for low stock (threshold: 10 units)
      if (product.stock < 10 && oldStock >= 10) {
        await createAdminNotification({
          title: `Low Stock Alert: ${product.name}`,
          message: `Stock for ${product.name} is now ${product.stock} units.`,
          type: 'stock',
          productId: product._id,
        });
      }
    }

    const order = new Order({
      userId,
      items: items.map(item => ({
        productId: item.productId || item.id,
        quantity: item.quantity,
        price: item.price,
      })),
      total,
      date,
      shipping,
      paymentMethod,
    });
    await order.save({ session });
    console.log(`Order created successfully for user ${userId}: Order ID ${order._id}`);

    // Create admin notification for new order
    await createAdminNotification({
      title: `New Order Placed: #${order._id.toString().slice(-6)}`,
      message: `User ${userId} placed an order for ${items.length} item(s) totaling ₹${total}.`,
      type: 'order',
      orderId: order._id,
    });

    await Cart.deleteMany({ userId }).session(session);
    console.log(`Cleared cart for user ${userId} after order creation`);

    await session.commitTransaction();
    res.status(201).json({ message: 'Order created successfully', orderId: order._id });
  } catch (err) {
    await session.abortTransaction();
    console.error('❌ Error creating order:', err.message, err.stack);
    if (err.message.includes('Product with ID') || err.message.includes('Insufficient stock')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to create order', details: err.message });
  } finally {
    session.endSession();
  }
});

// Update Order Status Route
app.put('/api/orders/:orderId/status', authenticateAdmin, async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  console.log(`Attempting to update order ${orderId} to status ${status} by admin ${req.user.userId}`);

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

    const oldStatus = order.status;
    order.status = status;
    await order.save();
    console.log(`Order ${orderId} status updated to ${status} by admin ${req.user.userId}`);

    // Create admin notification for status change
    if (oldStatus !== status) {
      await createAdminNotification({
        title: `Order Status Updated: #${orderId.slice(-6)}`,
        message: `Order ${orderId} status changed from ${oldStatus} to ${status}.`,
        type: 'order',
        orderId,
      });
    }

    res.status(200).json({ message: 'Order status updated successfully' });
  } catch (err) {
    console.error('❌ Error updating order status:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to update order status', details: err.message });
  }
});

// Approve Order Route
app.post('/api/orders/:orderId/approve', authenticateAdmin, async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      console.error(`❌ Order approval failed: Order not found for ID ${orderId}`);
      return res.status(404).json({ error: 'Order not found' });
    }

    order.status = 'Processing';
    await order.save();
    console.log(`Order ${orderId} approved (status set to Processing) by admin ${req.user.userId}`);

    // Create admin notification for approval
    await createAdminNotification({
      title: `Order Approved: #${orderId.slice(-6)}`,
      message: `Order ${orderId} has been approved and set to Processing.`,
      type: 'order',
      orderId,
    });

    res.status(200).json({ message: 'Order approved successfully' });
  } catch (err) {
    console.error('❌ Error approving order:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to approve order', details: err.message });
  }
});

// Reject Order Route
app.post('/api/orders/:orderId/reject', authenticateAdmin, async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      console.error(`❌ Order rejection failed: Order not found for ID ${orderId}`);
      return res.status(404).json({ error: 'Order not found' });
    }

    order.status = 'Rejected';
    await order.save();
    console.log(`Order ${orderId} rejected by admin ${req.user.userId}`);

    // Create admin notification for rejection
    await createAdminNotification({
      title: `Order Rejected: #${orderId.slice(-6)}`,
      message: `Order ${orderId} has been rejected.`,
      type: 'order',
      orderId,
    });

    res.status(200).json({ message: 'Order rejected successfully' });
  } catch (err) {
    console.error('❌ Error rejecting order:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to reject order', details: err.message });
  }
});

// Cancel Order Route (User)
app.put('/api/orders/:orderId/cancel', authenticateToken, async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user.userId;

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      console.error(`❌ Order cancellation failed: Order not found for ID ${orderId}`);
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.userId.toString() !== userId) {
      console.error('❌ Access denied: User can only cancel their own orders', { orderId, userId });
      return res.status(403).json({ error: 'Access Denied: You can only cancel your own orders' });
    }

    if (order.status === 'Delivered' || order.status === 'Rejected') {
      console.error(`❌ Order cancellation failed: Order cannot be cancelled in status ${order.status}`, { orderId });
      return res.status(400).json({ error: `Order cannot be cancelled in ${order.status} status` });
    }

    const orderDate = new Date(order.createdAt);
    const now = new Date();
    const diffInHours = (now - orderDate) / (1000 * 60 * 60);
    if (diffInHours > 24) {
      console.error(`❌ Order cancellation failed: Order is older than 24 hours`, { orderId, diffInHours });
      return res.status(400).json({ error: 'Order can only be cancelled within 24 hours of placement' });
    }

    order.status = 'Rejected';
    await order.save();
    console.log(`Order ${orderId} cancelled by user ${userId}`);

    // Create admin notification for cancellation
    await createAdminNotification({
      title: `Order Cancelled: #${orderId.slice(-6)}`,
      message: `User ${userId} cancelled order ${orderId}.`,
      type: 'order',
      orderId,
    });

    res.status(200).json({ message: 'Order cancelled successfully', status: order.status });
  } catch (err) {
    console.error('❌ Error cancelling order:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to cancel order', details: err.message });
  }
});

// Get Favorites Route
app.get('/api/favorites', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const favorites = await Favorite.find({ userId }).populate('productId', 'name price originalPrice image_url stock').lean();
    console.log(`Fetched favorites for user ${userId}: ${favorites.length}`);
    const validFavorites = favorites.filter(fav => fav.productId);
    if (favorites.length !== validFavorites.length) {
      console.warn(`Some favorites for user ${userId} reference invalid products:`, favorites.filter(fav => !fav.productId));
    }
    res.status(200).json(validFavorites);
  } catch (err) {
    console.error('❌ Error fetching favorites:', err.message, err.stack);
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
    const productExists = await Product.findById(productId).lean();
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
    console.error(`❌ Error adding favorite for user ${userId}:`, err.message, err.stack);
    res.status(500).json({ error: 'Failed to add favorite', details: err.message });
  }
});

// Remove Favorite Route
app.delete('/api/favorites/:productId', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const { productId } = req.params;

  console.log(`Attempting to remove favorite for user ${userId} with productId ${productId}`);

  try {
    const favorite = await Favorite.findOne({ userId, productId });
    console.log(`Favorite document found:`, favorite ? favorite : 'Not found');

    const result = await Favorite.deleteOne({ userId, productId });
    console.log(`Delete operation result:`, result);

    if (result.deletedCount === 0) {
      console.warn(`Favorite not found for user ${userId} with productId ${productId}`);
      return res.status(404).json({ error: 'Favorite not found' });
    }

    console.log(`Removed favorite ${productId} for user ${userId}`);
    res.status(200).json({ message: 'Favorite removed successfully' });
  } catch (err) {
    console.error('❌ Error removing favorite:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

// Get Cart Route
app.get('/api/cart', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const cartItems = await Cart.find({ userId }).populate('productId', 'name price originalPrice image_url stock').lean();
    const validItems = cartItems.filter(item => item.productId);
    const invalidItems = cartItems.filter(item => !item.productId);
    if (invalidItems.length > 0) {
      console.log(`Cleaning up ${invalidItems.length} invalid cart items for user ${userId}`);
      await Cart.deleteMany({
        userId,
        productId: { $in: invalidItems.map(item => item.productId?._id).filter(id => id) },
      });
    }
    console.log(`Fetched cart for user ${userId}: ${validItems.length} items`);
    res.json(validItems);
  } catch (err) {
    console.error('❌ Error fetching cart:', err.message, err.stack);
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
    const validCartDocs = [];
    const invalidItems = [];
    for (const item of cart) {
      if (!item.productId || !item.quantity || item.quantity < 1) {
        console.warn(`Invalid cart item for user ${userId}:`, item);
        invalidItems.push(item);
        continue;
      }

      const product = await Product.findById(item.productId).lean();
      if (!product) {
        console.warn(`Product not found for user ${userId}: Product ID ${item.productId}`);
        invalidItems.push(item);
        continue;
      }

      validCartDocs.push({
        userId,
        productId: item.productId,
        quantity: item.quantity,
      });
    }

    if (invalidItems.length > 0) {
      console.warn(`Skipping ${invalidItems.length} invalid cart items for user ${userId}:`, invalidItems);
    }

    const existingCart = await Cart.find({ userId }).lean();
    const existingProductIds = existingCart.map(item => item.productId.toString());
    const newProductIds = validCartDocs.map(item => item.productId.toString());

    const itemsToRemove = existingCart.filter(item => !newProductIds.includes(item.productId.toString()));
    if (itemsToRemove.length > 0) {
      await Cart.deleteMany({
        userId,
        productId: { $in: itemsToRemove.map(item => item.productId) },
      });
      console.log(`Removed ${itemsToRemove.length} items from cart for user ${userId}`);
    }

    for (const item of validCartDocs) {
      await Cart.updateOne(
        { userId, productId: item.productId },
        { $set: { quantity: item.quantity, createdAt: new Date() } },
        { upsert: true }
      );
    }

    console.log(`Updated cart for user ${userId} with ${validCartDocs.length} valid items`);
    res.status(201).json({ message: 'Cart updated successfully', invalidItems: invalidItems.length });
  } catch (err) {
    console.error(`❌ Error saving cart for user ${userId}:`, err.message, err.stack);
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
    console.error('❌ Error removing cart item:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to remove cart item' });
  }
});

// Category Routes
app.get('/api/categories', async (req, res) => {
  try {
    const { visible } = req.query;
    let query = {};
    if (visible === 'true') {
      query.isVisible = true;
    }
    const categories = await Category.find(query).lean();
    console.log(`Fetched ${categories.length} categories`, { visibleFilter: visible });
    res.json(categories);
  } catch (err) {
    console.error('❌ Error fetching categories:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.post('/api/categories', authenticateAdmin, async (req, res) => {
  const { name, isVisible } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Category name is required' });
  }
  try {
    const category = new Category({ name, isVisible: isVisible ?? true });
    await category.save();
    console.log(`Category added successfully: ${name}`);
    res.status(201).json({ message: 'Category added successfully', category });
  } catch (err) {
    console.error('❌ Error adding category:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to add category' });
  }
});

app.get('/api/categories/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const category = await Category.findById(id).lean();
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(category);
  } catch (err) {
    console.error('❌ Error fetching category:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

app.put('/api/categories/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, isVisible } = req.body;

  try {
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    if (name) category.name = name;
    if (typeof isVisible === 'boolean') category.isVisible = isVisible;

    await category.save();
    console.log(`Category updated successfully: ${id}`);
    res.status(200).json({ message: 'Category updated successfully', category });
  } catch (err) {
    console.error('❌ Error updating category:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

app.delete('/api/categories/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    await Product.updateMany({ categoryId: id }, { $set: { categoryId: null } });
    console.log(`Category deleted successfully: ${id}`);
    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting category:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Special Category Routes
app.get('/api/special-categories', authenticateAdmin, async (req, res) => {
  try {
    const specialCategories = await SpecialCategory.find()
      .populate('productIds', 'name price originalPrice image_url stock')
      .lean();
    console.log(`Fetched ${specialCategories.length} special categories`);
    res.json(specialCategories);
  } catch (err) {
    console.error('❌ Error fetching special categories:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch special categories' });
  }
});

// Public Special Categories Route
app.get('/api/public/special-categories', async (req, res) => {
  try {
    const specialCategories = await SpecialCategory.find({ isVisible: true })
      .populate('productIds', 'name price originalPrice image_url stock description categoryId')
      .lean();
    console.log(`Fetched ${specialCategories.length} public special categories`);
    res.json(specialCategories);
  } catch (err) {
    console.error('❌ Error fetching public special categories:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch special categories' });
  }
});

app.post('/api/special-categories', authenticateAdmin, async (req, res) => {
  const { name, productIds, isVisible } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Special category name is required' });
  }

  try {
    if (productIds && Array.isArray(productIds)) {
      const validProducts = await Product.find({ _id: { $in: productIds } }).lean();
      if (validProducts.length !== productIds.length) {
        return res.status(400).json({ error: 'One or more product IDs are invalid' });
      }
    }

    const specialCategory = new SpecialCategory({
      name,
      productIds: productIds || [],
      isVisible: isVisible ?? true,
    });
    await specialCategory.save();
    console.log(`Special category added successfully: ${name}`);
    res.status(201).json({ message: 'Special category added successfully', specialCategory });
  } catch (err) {
    console.error('❌ Error adding special category:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to add special category' });
  }
});

app.get('/api/special-categories/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const specialCategory = await SpecialCategory.findById(id)
      .populate('productIds', 'name price originalPrice image_url stock')
      .lean();
    if (!specialCategory) {
      return res.status(404).json({ error: 'Special category not found' });
    }
    res.json(specialCategory);
  } catch (err) {
    console.error('❌ Error fetching special category:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch special category' });
  }
});

app.put('/api/special-categories/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, productIds, isVisible } = req.body;

  try {
    const specialCategory = await SpecialCategory.findById(id);
    if (!specialCategory) {
      return res.status(404).json({ error: 'Special category not found' });
    }

    if (name) specialCategory.name = name;
    if (typeof isVisible === 'boolean') specialCategory.isVisible = isVisible;
    if (productIds && Array.isArray(productIds)) {
      const validProducts = await Product.find({ _id: { $in: productIds } }).lean();
      if (validProducts.length !== productIds.length) {
        return res.status(400).json({ error: 'One or more product IDs are invalid' });
      }
      specialCategory.productIds = productIds;
    }

    await specialCategory.save();
    console.log(`Special category updated successfully: ${id}`);
    res.status(200).json({ message: 'Special category updated successfully', specialCategory });
  } catch (err) {
    console.error('❌ Error updating special category:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to update special category' });
  }
});

app.delete('/api/special-categories/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const specialCategory = await SpecialCategory.findByIdAndDelete(id);
    if (!specialCategory) {
      return res.status(404).json({ error: 'Special category not found' });
    }
    console.log(`Special category deleted successfully: ${id}`);
    res.status(200).json({ message: 'Special category deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting special category:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to delete special category' });
  }
});

// Notification Routes
app.post(
  '/api/notifications',
  authenticateAdmin,
  [
    body('title').trim().notEmpty().withMessage('Notification title is required'),
    body('message').trim().notEmpty().withMessage('Notification message is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('❌ Notification validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, message, intendedFor } = req.body;

    try {
      const notification = new Notification({
        title,
        message,
        createdBy: req.user.userId,
        intendedFor: intendedFor || 'all',
        type: 'user',
        readBy: [],
        metadata: { orderId: null, productId: null },
      });
      await notification.save();
      console.log(`Notification created by admin ${req.user.userId}: ${title}`);
      res.status(201).json({ message: 'Notification created successfully', notification });
    } catch (err) {
      console.error('❌ Error creating notification:', err.message, err.stack);
      res.status(500).json({ error: 'Failed to create notification', details: err.message });
    }
  }
);

app.get('/api/notifications', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const isAdmin = req.user.isAdmin;

  try {
    let query = {};
    if (isAdmin) {
      query.intendedFor = 'admins'; // Only admin-specific notifications
    } else {
      query = {
        $or: [
          { intendedFor: 'users' },
          { intendedFor: 'all' },
        ],
      };
    }

    const notifications = await Notification.find(query)
      .populate('createdBy', 'username')
      .populate('metadata.orderId', 'total status')
      .populate('metadata.productId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    // Map notifications to include isRead status and clean data
    const notificationsWithStatus = notifications.map(notification => {
  // Ensure metadata is always an object
  const metadata = (notification && typeof notification.metadata === 'object' && notification.metadata !== null)
    ? notification.metadata
    : {};

  const isRead = Array.isArray(notification.readBy) &&
    notification.readBy.some(read => read.userId && read.userId.toString() === userId);

  // Safely extract order and product info
  let orderId = null, orderTotal = null, orderStatus = null, productName = null;
  if (metadata && typeof metadata === 'object') {
    if (metadata.orderId && typeof metadata.orderId === 'object' && metadata.orderId !== null) {
      orderId = metadata.orderId._id || metadata.orderId;
      orderTotal = metadata.orderId.total || null;
      orderStatus = metadata.orderId.status || null;
    }
    if (metadata.productId && typeof metadata.productId === 'object' && metadata.productId !== null) {
      productName = metadata.productId.name || null;
    }
  }

  return {
    _id: notification._id,
    title: notification.title,
    message: notification.message,
    createdAt: notification.createdAt,
    createdBy: notification.createdBy ? notification.createdBy.username : 'System',
    intendedFor: notification.intendedFor,
    type: notification.type,
    isRead,
    metadata: {
      orderId,
      orderTotal,
      orderStatus,
      productName,
    },
  };
});
    console.log(`Fetched ${notifications.length} notifications for user ${userId} (isAdmin: ${isAdmin})`);
    res.json(notificationsWithStatus);
  } catch (err) {
    console.error('❌ Error fetching notifications:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch notifications', details: err.message });
  }
});

app.post('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  try {
    const notification = await Notification.findById(id);
    if (!notification) {
      console.error(`❌ Notification not found: ${id}`);
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Ensure readBy is an array
    if (!Array.isArray(notification.readBy)) {
      notification.readBy = [];
    }

    if (!notification.readBy.some(read => read.userId && read.userId.toString() === userId)) {
      notification.readBy.push({ userId: new mongoose.Types.ObjectId(userId), readAt: new Date() });
      await notification.save();
      console.log(`Notification ${id} marked as read by user ${userId}`);
    } else {
      console.log(`Notification ${id} already read by user ${userId}`);
    }

    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error('❌ Error marking notification as read:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to mark notification as read', details: err.message });
  }
});

// Error handling middleware for JSON responses
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.message, err.stack);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Catch-all route for undefined API endpoints
app.use('/api/*', (req, res) => {
  console.error(`❌ Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'API endpoint not found' });
});

// Serve static files and SPA
app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});