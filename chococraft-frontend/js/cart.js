// cart.js
async function fetchCartFromBackend() {
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  if (!userId || !token) return [];

  try {
    const response = await fetch('http://localhost:3000/api/cart', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('userId');
      localStorage.removeItem('token');
      window.location.href = 'login.html';
      return [];
    }

    if (!response.ok) throw new Error('Failed to fetch cart');
    const cartItems = await response.json();
    return cartItems.map(item => ({
      id: item.productId._id,
      name: item.productId.name,
      price: item.productId.price,
      image: item.productId.image_url.startsWith('http') ? item.productId.image_url : `http://localhost:3000/${item.productId.image_url}`,
      quantity: item.quantity,
      stock: item.productId.stock,
    }));
  } catch (e) {
    console.error('Error fetching cart:', e);
    return [];
  }
}

// Debounce utility
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Save cart to backend with debouncing
const debouncedSaveCartToBackend = debounce(async (cart) => {
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  if (!userId || !token) return;

  try {
    const cartPayload = cart.map(item => ({
      productId: item.id,
      quantity: item.quantity,
    }));
    const response = await fetch('http://localhost:3000/api/cart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ cart: cartPayload }),
    });

    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('userId');
      localStorage.removeItem('token');
      window.location.href = 'login.html';
      return;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to save cart: ${response.status} - ${errorText}`);
    }
  } catch (e) {
    console.error('Error saving cart:', e.message);
    alert('Failed to update cart. Changes may not persist.');
  }
}, 500);

// Wrapper function
async function saveCartToBackend(cart) {
  debouncedSaveCartToBackend(cart);
}

async function displayCart() {
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  const cartItems = document.getElementById('cart-items');
  const cartTotal = document.getElementById('cart-total');
  const checkoutBtn = document.getElementById('checkout-btn');
  const checkoutSection = document.querySelector('.checkout');
  const loginRequiredMessage = document.getElementById('loginRequiredMessage');

  if (!cartItems || !cartTotal || !checkoutBtn || !loginRequiredMessage) {
    console.error('Cart elements not found');
    return;
  }

  let cart = [];
  if (userId && token) {
    cart = await fetchCartFromBackend();
  } else {
    // Fallback to localStorage if user is not logged in
    cart = JSON.parse(localStorage.getItem('cart')) || [];
  }

  if (!userId || !token) {
    loginRequiredMessage.style.display = 'block';
  } else {
    loginRequiredMessage.style.display = 'none';
  }

  cartItems.style.display = 'block';
  cartTotal.parentElement.style.display = 'block';
  checkoutBtn.style.display = 'block';

  cartItems.innerHTML = '';
  if (cart.length === 0) {
    cartItems.innerHTML = '<p>Your cart is empty.</p>';
    cartTotal.textContent = '0.00';
    checkoutBtn.disabled = true;
    checkoutSection.style.display = 'none';
    return;
  }

  let total = 0;
  cart.forEach(item => {
    const cartItem = document.createElement('div');
    cartItem.className = 'cart-item';
    cartItem.innerHTML = `
      <div class="cart-item-info">
        <img src="${item.image}" alt="${item.name}">
        <div>
          <h4>${item.name}</h4>
          <p>₹${item.price.toFixed(2)}</p>
        </div>
      </div>
      <div class="cart-item-quantity">
        <button class="btn decrease-quantity" data-id="${item.id}">-</button>
        <span>${item.quantity}</span>
        <button class="btn increase-quantity" data-id="${item.id}">+</button>
      </div>
      <button class="btn remove-item" data-id="${item.id}">Remove</button>
    `;
    cartItems.appendChild(cartItem);
    total += item.price * item.quantity;
  });

  cartTotal.textContent = total.toFixed(2);
  checkoutBtn.disabled = false;

  document.querySelectorAll('.decrease-quantity').forEach(btn => {
    btn.removeEventListener('click', updateQuantityHandler);
    btn.addEventListener('click', updateQuantityHandler);
  });
  document.querySelectorAll('.increase-quantity').forEach(btn => {
    btn.removeEventListener('click', updateQuantityHandler);
    btn.addEventListener('click', updateQuantityHandler);
  });
  document.querySelectorAll('.remove-item').forEach(btn => {
    btn.removeEventListener('click', removeItemHandler);
    btn.addEventListener('click', removeItemHandler);
  });
}

async function updateQuantityHandler(event) {
  const id = event.target.getAttribute('data-id');
  const change = event.target.classList.contains('decrease-quantity') ? -1 : 1;
  await updateQuantity(id, change);
}

async function removeItemHandler(event) {
  const id = event.target.getAttribute('data-id');
  await removeItem(id);
}

async function updateQuantity(id, change) {
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  let cart = [];

  if (userId && token) {
    cart = await fetchCartFromBackend();
  } else {
    cart = JSON.parse(localStorage.getItem('cart')) || [];
  }

  const item = cart.find(i => i.id === id);
  if (!item) {
    console.error(`Item with ID ${id} not found in cart`);
    return;
  }

  // Log the current state for debugging
  console.log(`Updating quantity for ${item.name}: current=${item.quantity}, change=${change}`);

  // Update quantity
  item.quantity += change;

  // If quantity becomes 0 or negative, remove the item
  if (item.quantity <= 0) {
    console.log(`Quantity reached 0 for ${item.name}, removing item`);
    await removeItem(id);
    return;
  }

  // Check stock limit
  if (item.stock && item.quantity > item.stock) {
    console.log(`Stock limit reached for ${item.name}: stock=${item.stock}`);
    item.quantity = item.stock;
    alert('Stock limit reached.');
  }

  // Save updated cart
  if (userId && token) {
    await saveCartToBackend(cart);
  } else {
    localStorage.setItem('cart', JSON.stringify(cart));
  }

  // Update UI
  await updateCartCount();
  await displayCart();
}

async function removeItem(id) {
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  let cart = [];

  if (userId && token) {
    cart = await fetchCartFromBackend();
  } else {
    cart = JSON.parse(localStorage.getItem('cart')) || [];
  }

  console.log(`Removing item with ID ${id}`);
  cart = cart.filter(i => i.id !== id);

  if (userId && token) {
    await saveCartToBackend(cart);
  } else {
    localStorage.setItem('cart', JSON.stringify(cart));
  }

  await updateCartCount();
  await displayCart();
}

async function handleCheckout(event) {
  event.preventDefault();
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');

  if (!userId || !token) {
    window.location.href = 'login.html';
    return;
  }

  const checkoutSection = document.querySelector('.checkout');
  const cartSection = document.querySelector('.cart');
  if (checkoutSection && cartSection) {
    cartSection.style.display = 'none';
    checkoutSection.style.display = 'block';
  }
}

async function handlePlaceOrder(event) {
  event.preventDefault();
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  if (!userId || !token) {
    alert('Please log in to place an order.');
    window.location.href = 'login.html';
    return;
  }

  const shipping = {
    name: document.getElementById('name').value.trim(),
    address: document.getElementById('address').value.trim(),
    city: document.getElementById('city').value.trim(),
    state: document.getElementById('state').value.trim(),
    zip: document.getElementById('zip').value.trim(),
  };

  const paymentMethod = document.getElementById('payment-method').value;
  if (!shipping.name || !shipping.address || !shipping.city || !shipping.state || !shipping.zip || !paymentMethod) {
    alert('Please fill in all shipping details and select a payment method.');
    return;
  }

  const cart = await fetchCartFromBackend();
  if (cart.length === 0) {
    alert('Your cart is empty.');
    return;
  }

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const order = {
    id: 'order_' + Date.now(),
    userId,
    items: cart.map(item => ({
      productId: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.image,
    })),
    total,
    date: new Date().toISOString(),
    shipping,
    paymentMethod,
    status: 'Pending',
  };

  try {
    const response = await fetch('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        userId,
        items: order.items,
        total: order.total,
        shipping: order.shipping,
        paymentMethod: order.paymentMethod,
      }),
    });

    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('userId');
      localStorage.removeItem('token');
      alert('Session expired. Please log in again.');
      window.location.href = 'login.html';
      return;
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create order');
    }

    // Clear cart after order placement
    await saveCartToBackend([]);

    // Save order to localStorage for order-success.html
    localStorage.setItem('lastOrder', JSON.stringify(order));
    window.location.href = 'order-success.html';
  } catch (e) {
    console.error('Error placing order:', e);
    alert(`Failed to place order: ${e.message}`);
  }
}

async function updateCartCount() {
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  let cart = [];

  if (userId && token) {
    try {
      const response = await fetch('http://localhost:3000/api/cart', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch cart');
      cart = await response.json();
    } catch (e) {
      console.error('Error fetching cart count:', e);
      cart = [];
    }
  } else {
    cart = JSON.parse(localStorage.getItem('cart')) || [];
  }

  const count = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
  document.querySelectorAll('#cart-count').forEach(el => el.textContent = count);
}

document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.querySelector('.hamburger');
  const menu = document.querySelector('.menu');
  const backBtn = document.querySelector('.back-btn');

  if (hamburger && menu && backBtn) {
    hamburger.addEventListener('click', () => {
      menu.classList.toggle('active');
      backBtn.classList.remove('active');
    });

    menu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        if (window.history.length > 1) {
          backBtn.classList.add('active');
        }
        menu.classList.remove('active');
      });
    });

    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.history.length > 1) {
        history.back();
      } else {
        menu.classList.remove('active');
        backBtn.classList.remove('active');
      }
    });
  }

  displayCart();
  updateCartCount();
  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', handleCheckout);
  }
  const checkoutForm = document.getElementById('checkout-form');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', handlePlaceOrder);
  }
});