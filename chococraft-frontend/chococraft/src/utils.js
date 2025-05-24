const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const activeRequests = new Set();
const MAX_CONCURRENT_REQUESTS = 1;
const errorCache = new Map();
const ERROR_CACHE_DURATION = 30 * 1000;

const retryFetch = async (url, options = {}, retries = 0, delay = 2000) => {
  const cacheKey = `${url}:${JSON.stringify(options)}`;
  const cachedError = errorCache.get(cacheKey);
  if (cachedError && Date.now() - cachedError.timestamp < ERROR_CACHE_DURATION) {
    console.log(`Returning cached error for ${url}: ${cachedError.error.message}`);
    throw cachedError.error;
  }

  if (activeRequests.size >= MAX_CONCURRENT_REQUESTS) {
    console.log(`Waiting for active requests to complete (${activeRequests.size}/${MAX_CONCURRENT_REQUESTS})...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  activeRequests.add(url);
  try {
    const fetchOptions = {
      ...options,
      headers: {
        ...options.headers,
        Connection: 'keep-alive',
      },
    };
    console.log(`Making request to ${url} with options:`, fetchOptions);
    const response = await fetch(url, fetchOptions);
    console.log(`Response for ${url}: Status ${response.status}, OK: ${response.ok}`);

    if (!response.ok) {
      const text = await response.text();
      let errorMessage = `Request failed with status ${response.status}`;
      if (response.status === 404) {
        errorMessage = `API endpoint not found: ${url}`;
      } else if (response.status === 401 || response.status === 403) {
        errorMessage = 'Session expired or unauthorized';
        localStorage.removeItem('userId');
        localStorage.removeItem('token');
        localStorage.removeItem('isAdmin');
      } else {
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage += ` - Invalid response: ${text}`;
        }
      }
      const error = new Error(errorMessage);
      error.status = response.status;
      throw error;
    }

    errorCache.delete(cacheKey);
    return response;
  } catch (error) {
    console.error(`Fetch failed for ${url}: ${error.message}`);
    errorCache.set(cacheKey, { error, timestamp: Date.now() });
    throw error;
  } finally {
    activeRequests.delete(url);
  }
};

// Function to validate token by decoding it client-side (assuming JWT)
const validateToken = (token) => {
  try {
    console.log('Validating token client-side:', token);
    if (!token) {
      console.error('No token provided for validation');
      return false;
    }
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiry = payload.exp * 1000; // Convert to milliseconds
    const isValid = Date.now() < expiry;
    console.log('Token validation result:', isValid, 'Expiry:', new Date(expiry), 'Current time:', new Date());
    return isValid;
  } catch (error) {
    console.error('Error decoding token:', error.message);
    return false;
  }
};

// Helper function to apply fallback for originalPrice only if undefined or null
const applyPriceFallback = (product) => {
  if (!product) {
    console.warn('applyPriceFallback received null/undefined product');
    return product;
  }

  // Ensure price and originalPrice are numbers
  const price = Number(product.price) || 0;
  const originalPriceRaw = product.originalPrice;

  // Only apply fallback if originalPrice is undefined, null, or not a number
  const hasValidOriginalPrice = originalPriceRaw !== undefined && 
                               originalPriceRaw !== null && 
                               !isNaN(Number(originalPriceRaw));
  const originalPrice = hasValidOriginalPrice
    ? Number(originalPriceRaw)
    : price * 1.25; // Fallback: 20% discount if originalPrice is missing

  console.log(`utils.js - applyPriceFallback for product ${product.name || product._id}:`, {
    price: price,
    originalPriceRaw: originalPriceRaw,
    hasValidOriginalPrice: hasValidOriginalPrice,
    finalOriginalPrice: originalPrice,
  });

  return {
    ...product,
    price: price,
    originalPrice: originalPrice,
  };
};

export const getProductsFromStorage = async (forceRefresh = true) => {
  console.log('getProductsFromStorage called with forceRefresh:', forceRefresh);
  const cacheKey = 'products';
  const cacheTimestampKey = 'products_timestamp';
  const cacheDuration = 5 * 60 * 1000;

  if (!forceRefresh) {
    const cachedProducts = localStorage.getItem(cacheKey);
    const timestamp = localStorage.getItem(cacheTimestampKey);
    const now = Date.now();
    if (cachedProducts && timestamp && now - parseInt(timestamp) < cacheDuration) {
      const parsedProducts = JSON.parse(cachedProducts);
      console.log('Returning cached products:', parsedProducts.length, parsedProducts);
      // Apply fallback to cached products
      return parsedProducts.map(product => applyPriceFallback(product));
    } else {
      console.log('No valid cache found. Cached:', !!cachedProducts, 'Timestamp:', timestamp, 'Age:', timestamp ? now - parseInt(timestamp) : 'N/A');
    }
  } else {
    console.log('Forcing refresh of products');
  }

  console.log('Fetching products from API:', `${BASE_URL}/api/products`);
  try {
    const response = await retryFetch(`${BASE_URL}/api/products`);
    console.log('Products response:', response, 'Status:', response.status, 'OK:', response.ok);

    const text = await response.text();
    let products;
    try {
      products = JSON.parse(text);
      console.log('Fetched products (raw):', products);
    } catch (err) {
      console.error('Failed to parse response as JSON:', text);
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(cacheTimestampKey);
      throw new Error('Server returned an invalid response: ' + text);
    }

    // Apply fallback for originalPrice to all fetched products
    products = products.map(product => applyPriceFallback(product));
    console.log('Fetched products (with fallback applied):', products);

    localStorage.setItem(cacheKey, JSON.stringify(products));
    localStorage.setItem(cacheTimestampKey, Date.now().toString());
    return products;
  } catch (error) {
    console.error('Error fetching products:', error.message, error);
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(cacheTimestampKey);
    throw error;
  }
};

export const invalidateProductCache = () => {
  console.log('Invalidating product cache');
  localStorage.removeItem('products');
  localStorage.removeItem('products_timestamp');
};

export const getUserCart = async () => {
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  if (!userId || !token) {
    console.warn('No userId or token, returning empty cart');
    return [];
  }

  try {
    const response = await retryFetch(`${BASE_URL}/api/cart`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    console.log('utils.js - Cart response status:', response.status);

    const text = await response.text();
    console.log('utils.js - Raw cart response:', text);
    let cartItems;
    try {
      cartItems = JSON.parse(text);
      console.log('utils.js - Parsed cart items:', cartItems);
    } catch (err) {
      console.error('utils.js - Failed to parse response as JSON:', text);
      throw new Error('Server returned an invalid response: ' + text);
    }

    // Filter valid items and collect invalid productIds for cleanup
    const validItems = cartItems.filter(item => item.productId && item.productId._id);
    const invalidProductIds = cartItems
      .filter(item => !item.productId || !item.productId._id)
      .map(item => item.productId?._id || null)
      .filter(id => id);

    // Clean up invalid cart items on the server
    if (invalidProductIds.length > 0) {
      console.log('Cleaning up invalid cart items:', invalidProductIds);
      await Promise.all(
        invalidProductIds.map(productId =>
          retryFetch(`${BASE_URL}/api/cart/${productId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
          })
        )
      );
    }

    const transformedItems = validItems.map(item => {
      // Apply fallback for productId
      const productWithFallback = applyPriceFallback(item.productId);
      const discountPercentage = productWithFallback.originalPrice && productWithFallback.price && productWithFallback.originalPrice > productWithFallback.price
        ? ((productWithFallback.originalPrice - productWithFallback.price) / productWithFallback.originalPrice) * 100
        : 0;
      const discountAmount = productWithFallback.originalPrice && productWithFallback.price && productWithFallback.originalPrice > productWithFallback.price
        ? productWithFallback.originalPrice - productWithFallback.price
        : 0;
      const transformedItem = {
        id: productWithFallback._id,
        name: productWithFallback.name,
        price: productWithFallback.price,
        originalPrice: productWithFallback.originalPrice, // Include originalPrice with fallback
        image: productWithFallback.image_url,
        stock: productWithFallback.stock,
        quantity: item.quantity,
        discountPercentage: Math.round(discountPercentage),
        discountAmount: Math.round(discountAmount),
      };
      console.log('utils.js - Transformed cart item:', transformedItem);
      return transformedItem;
    });

    return transformedItems;
  } catch (error) {
    console.error('utils.js - Error fetching cart:', error.message);
    throw error;
  }
};

export const saveUserCart = async (cart) => {
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  if (!userId || !token) {
    console.error('No userId or token, cannot save cart');
    throw new Error('User not logged in');
  }

  try {
    const cartPayload = cart.map(item => ({
      productId: item.id,
      quantity: item.quantity,
    }));
    console.log('Saving cart for user:', userId, 'Payload:', cartPayload);
    const response = await retryFetch(`${BASE_URL}/api/cart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ cart: cartPayload }),
    });
    console.log('Save cart response:', response);

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch (err) {
      console.error('Failed to parse response as JSON:', text);
      throw new Error('Server returned an invalid response: ' + text);
    }
    console.log('Save cart result:', result);

    return result;
  } catch (error) {
    console.error('Error saving cart:', error.message);
    throw error;
  }
};

// Function to validate a product ID exists
const validateProductId = async (productId) => {
  try {
    console.log('Validating product ID:', productId);
    const response = await retryFetch(`${BASE_URL}/api/products/${productId}`);
    console.log('Validate product response:', response.status, response.ok);
    const text = await response.text();
    const product = JSON.parse(text);
    console.log('Validated product (raw):', product);
    // Apply fallback for originalPrice
    const productWithFallback = applyPriceFallback(product);
    console.log('Validated product (with fallback applied):', productWithFallback);
    return productWithFallback;
  } catch (error) {
    console.error('Error validating product ID:', error.message);
    throw error;
  }
};

// Updated function to add a single item to the cart
export const addToCart = async (itemData) => {
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  if (!userId || !token) {
    console.error('No userId or token, cannot add to cart');
    throw new Error('User not logged in');
  }

  if (!itemData || !itemData.id) {
    console.error('Invalid item data for adding to cart:', itemData);
    throw new Error('Invalid item data');
  }

  try {
    // Force refresh product data to ensure we have the latest products
    await getProductsFromStorage(true);

    // Validate the product ID exists by fetching the product from the backend
    const product = await validateProductId(itemData.id);
    console.log('Validated product:', product);

    // Fetch the current cart
    const currentCart = await getUserCart();
    console.log('Current cart before adding item:', currentCart);

    // Check if the item already exists in the cart
    const existingItemIndex = currentCart.findIndex(item => item.id === itemData.id);
    let updatedCart;

    if (existingItemIndex !== -1) {
      // Item exists, increment quantity (if within stock limits)
      updatedCart = [...currentCart];
      const existingItem = updatedCart[existingItemIndex];
      const newQuantity = existingItem.quantity + 1;

      if (newQuantity > product.stock) {
        throw new Error('Stock limit reached for this item');
      }

      updatedCart[existingItemIndex].quantity = newQuantity;
      console.log('Incremented quantity for existing item:', updatedCart[existingItemIndex]);
    } else {
      // Item doesn't exist, add it with quantity 1
      const discountPercentage = product.originalPrice && product.price && product.originalPrice > product.price
        ? ((product.originalPrice - product.price) / product.originalPrice) * 100
        : 0;
      const discountAmount = product.originalPrice && product.price && product.originalPrice > product.price
        ? product.originalPrice - product.price
        : 0;
      const newItem = {
        id: product._id,
        name: product.name || 'Unknown Product',
        price: product.price || 0,
        originalPrice: product.originalPrice, // Already includes fallback
        image: product.image_url || null,
        stock: product.stock || 0,
        quantity: 1,
        discountPercentage: Math.round(discountPercentage),
        discountAmount: Math.round(discountAmount),
      };
      updatedCart = [...currentCart, newItem];
      console.log('Added new item to cart:', newItem);
    }

    // Save the updated cart
    await saveUserCart(updatedCart);
    console.log('Cart updated successfully with new item:', updatedCart);

    return updatedCart;
  } catch (error) {
    console.error('Error adding item to cart:', error.message);
    throw error;
  }
};

export const getFavoritesFromStorage = async () => {
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  if (!userId || !token) {
    console.warn('No userId or token, returning empty favorites');
    return [];
  }

  try {
    console.log('Fetching favorites for user:', userId);
    console.log('getFavoritesFromStorage called from:', new Error().stack);
    const response = await retryFetch(`${BASE_URL}/api/favorites`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    console.log('Favorites response:', response);

    const text = await response.text();
    let favorites;
    try {
      favorites = JSON.parse(text);
    } catch (err) {
      console.error('Failed to parse response as JSON:', text);
      throw new Error('Server returned an invalid response: ' + text);
    }
    console.log('Favorites data:', favorites);

    return favorites.map(fav => {
      // Apply fallback for productId
      const productWithFallback = applyPriceFallback(fav.productId);
      const discountPercentage = productWithFallback.originalPrice && productWithFallback.price && productWithFallback.originalPrice > productWithFallback.price
        ? ((productWithFallback.originalPrice - productWithFallback.price) / productWithFallback.originalPrice) * 100
        : 0;
      const discountAmount = productWithFallback.originalPrice && productWithFallback.price && productWithFallback.originalPrice > productWithFallback.price
        ? productWithFallback.originalPrice - productWithFallback.price
        : 0;
      return {
        id: productWithFallback._id,
        name: productWithFallback.name,
        image: productWithFallback.image_url,
        price: productWithFallback.price,
        originalPrice: productWithFallback.originalPrice, // Include originalPrice with fallback
        stock: productWithFallback.stock,
        discountPercentage: Math.round(discountPercentage),
        discountAmount: Math.round(discountAmount),
      };
    });
  } catch (error) {
    console.error('Error fetching favorites:', error.message);
    throw error;
  }
};

export const displayUpdateMarquee = async () => {
  try {
    console.log('Fetching latest update');
    const response = await retryFetch(`${BASE_URL}/api/updates/latest`);
    console.log('Update response:', response);

    const text = await response.text();
    let update;
    try {
      update = JSON.parse(text);
    } catch (err) {
      console.error('Failed to parse response as JSON:', text);
      throw new Error('Server returned an invalid response: ' + text);
    }
    console.log('Fetched update:', update);

    return update.text || 'Welcome to ChocoCraft! Check out our latest chocolates.';
  } catch (error) {
    console.error('Error fetching update:', error.message);
    return 'Welcome to ChocoCraft! Check out our latest chocolates.';
  }
};

export const placeOrder = async (cart, shipping, paymentMethod) => {
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  const isAdmin = localStorage.getItem('isAdmin') === 'true'; // Check if user is admin
  if (!userId || !token) {
    console.error('No userId or token found in localStorage');
    throw new Error('Please log in.');
  }

  // Validate token before proceeding
  const isTokenValid = validateToken(token);
  if (!isTokenValid) {
    console.warn('Invalid or expired token, redirecting to login');
    localStorage.removeItem('userId');
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
    throw new Error('Session expired');
  }

  if (
    !shipping ||
    !shipping.firstName ||
    !shipping.lastName ||
    !shipping.address ||
    !shipping.city ||
    !shipping.state ||
    !shipping.zip ||
    !shipping.phone
  ) {
    throw new Error('Please provide complete shipping information.');
  }

  if (!paymentMethod) {
    throw new Error('Please select a payment method.');
  }

  try {
    // Only attempt stock update if user is an admin
    if (isAdmin) {
      console.log('User is admin, updating product stock...');
      const products = await getProductsFromStorage();
      const updatedProducts = products.map(product => {
        const cartItem = cart.find(item => (item.id === product._id || item.id === product.id));
        if (cartItem) {
          const newStock = product.stock - cartItem.quantity;
          return { ...product, stock: newStock >= 0 ? newStock : 0 };
        }
        return product;
      });

      await Promise.all(updatedProducts.map(product =>
        retryFetch(`${BASE_URL}/api/products/${product._id || product.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ stock: product.stock }),
        }).then(async response => {
          console.log(`Stock update response for product ${product._id || product.id}: ${response.status}`);
          const text = await response.text();
          return JSON.parse(text);
        })
      ));
    } else {
      console.log('User is not an admin, skipping stock update. Stock should be updated by the backend.');
    }

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Construct the shipping object to match backend expectations
    const formattedShipping = {
      name: `${shipping.firstName} ${shipping.lastName}`.trim(), // Combine firstName and lastName
      address: shipping.address,
      addressOptional: shipping.addressOptional || '',
      city: shipping.city,
      state: shipping.state,
      zip: shipping.zip,
      country: shipping.country || 'India', // Default to India if not provided
      phone: shipping.phone,
    };

    const order = {
      userId,
      items: cart.map(item => {
        if (!item.image) {
          console.warn(`Item ${item.name} has no image, defaulting to empty string`);
        }
        return {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image || '', // Ensure image is always a string, even if undefined
        };
      }),
      total,
      date: new Date().toISOString(), // Ensure date is a valid ISO string
      shipping: formattedShipping,
      paymentMethod,
      status: 'pending',
    };

    console.log('Placing order...', order);
    const response = await retryFetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(order),
    });
    console.log('Order response:', response.status);

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch (err) {
      console.error('Failed to parse response as JSON:', text);
      throw new Error('Server returned an invalid response: ' + text);
    }
    console.log('Order result:', result);

    console.log('Clearing cart after order...');
    await retryFetch(`${BASE_URL}/api/cart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ cart: [] }),
    }).then(async response => {
      console.log(`Cart clear response: ${response.status}`);
      const text = await response.text();
      return JSON.parse(text);
    });

    localStorage.setItem('lastOrder', JSON.stringify(order));
    return order;
  } catch (error) {
    console.error('Error placing order:', error.message);
    throw error;
  }
};

export const showSuccessMessage = (message, setMessage) => {
  console.log('Showing success message:', message);
  setMessage(message);
  setTimeout(() => setMessage(''), 2500);
};

export const updateCartCount = async () => {
  try {
    const cart = await getUserCart();
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    console.log('Cart count updated:', count);
    return count;
  } catch (error) {
    console.error('Error updating cart count:', error.message);
    return 0;
  }
};

// Function to fetch notifications
export const getNotifications = async () => {
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  if (!userId || !token) {
    console.warn('No userId or token, cannot fetch notifications');
    throw new Error('User not logged in');
  }

  try {
    console.log('Fetching notifications for user:', userId);
    const response = await retryFetch(`${BASE_URL}/api/notifications`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    console.log('Notifications response:', response.status, response.ok);

    const text = await response.text();
    let notifications;
    try {
      notifications = JSON.parse(text);
      console.log('Fetched notifications:', notifications);
    } catch (err) {
      console.error('Failed to parse notifications response as JSON:', text);
      throw new Error('Server returned an invalid response: ' + text);
    }

    return notifications;
  } catch (error) {
    console.error('Error fetching notifications:', error.message);
    throw error;
  }
};

// Function to mark a notification as read
export const markNotificationAsRead = async (notificationId) => {
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  if (!userId || !token) {
    console.warn('No userId or token, cannot mark notification as read');
    throw new Error('User not logged in');
  }

  try {
    console.log(`Marking notification ${notificationId} as read for user: ${userId}`);
    const response = await retryFetch(`${BASE_URL}/api/notifications/${notificationId}/read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    console.log('Mark notification response:', response.status, response.ok);

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
      console.log('Mark notification result:', result);
    } catch (err) {
      console.error('Failed to parse mark notification response as JSON:', text);
      throw new Error('Server returned an invalid response: ' + text);
    }

    return result;
  } catch (error) {
    console.error('Error marking notification as read:', error.message);
    throw error;
  }
};

export { retryFetch };