function getCheckoutCart() {
  try {
    const cart = JSON.parse(localStorage.getItem('checkoutCart') || []);
    console.log('Retrieved checkoutCart from localStorage:', cart); // Debug log
    return cart;
  } catch (e) {
    console.error('Error reading checkout cart from localStorage:', e);
    return [];
  }
}

function getUserCart() {
  const userId = localStorage.getItem('userId');
  if (!userId) return [];

  try {
    const allCarts = JSON.parse(localStorage.getItem('userCarts') || {});
    return allCarts[userId] || [];
  } catch (e) {
    console.error('Error reading user cart from localStorage:', e);
    return [];
  }
}

function saveUserCart(cart) {
  const userId = localStorage.getItem('userId');
  if (!userId) return;

  try {
    const allCarts = JSON.parse(localStorage.getItem('userCarts') || {});
    allCarts[userId] = cart;
    localStorage.setItem('userCarts', JSON.stringify(allCarts));
  } catch (e) {
    console.error('Error saving user cart to localStorage:', e);
  }
}

function saveUserOrder(order) {
  const userId = localStorage.getItem('userId');
  if (!userId) return;

  try {
    const allOrders = JSON.parse(localStorage.getItem('userOrders') || {});
    if (!allOrders[userId]) {
      allOrders[userId] = [];
    }
    allOrders[userId].push(order);
    localStorage.setItem('userOrders', JSON.stringify(allOrders));
  } catch (e) {
    console.error('Error saving user order to localStorage:', e);
  }
}

function displayOrderSummary() {
  const orderSummary = document.getElementById('order-summary');
  const cartTotal = document.getElementById('cart-total');
  if (!orderSummary || !cartTotal) {
    console.error('Order summary elements not found');
    return;
  }

  const cart = getCheckoutCart();
  orderSummary.innerHTML = '';

  if (cart.length === 0) {
    orderSummary.innerHTML = '<p>No items in your order. Please return to cart and try again.</p>';
    cartTotal.textContent = '0.00';
    console.warn('Checkout cart is empty'); // Debug log
    return;
  }

  let total = 0;
  cart.forEach(item => {
    const orderItem = document.createElement('div');
    orderItem.className = 'cart-item';
    orderItem.innerHTML = `
      <div class="cart-item-info">
        <img src="${item.image}" alt="${item.name}">
        <div>
          <h4>${item.name}</h4>
          <p>₹${item.price.toFixed(2)} x ${item.quantity}</p>
        </div>
      </div>
    `;
    orderSummary.appendChild(orderItem);
    total += item.price * item.quantity;
  });

  cartTotal.textContent = total.toFixed(2);
}

function handleCheckout(event) {
  event.preventDefault();

  const isLoggedIn = !!localStorage.getItem('currentUserEmail');
  if (!isLoggedIn) {
    alert('Please log in to place your order.');
    window.location.href = 'login.html';
    return;
  }

  const cart = getCheckoutCart();
  console.log('Cart at checkout submission:', cart); // Debug log
  if (cart.length === 0) {
    alert('Your order is empty. Please add items to your cart and try again.');
    return;
  }

  const name = document.getElementById('name').value.trim();
  const address = document.getElementById('address').value.trim();
  const city = document.getElementById('city').value.trim();
  const state = document.getElementById('state').value.trim();
  const zip = document.getElementById('zip').value.trim();
  const paymentMethod = document.getElementById('payment-method').value;

  if (!name || !address || !city || !state || !zip || !paymentMethod) {
    alert('Please fill in all required fields.');
    return;
  }

  // Create order object with initial status
  const order = {
    id: 'order_' + Date.now(),
    items: cart,
    total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    shipping: {
      name,
      address,
      city,
      state,
      zip
    },
    paymentMethod,
    date: new Date().toISOString(),
    status: 'pending' // Initial status
  };

  // Save the order
  saveUserOrder(order);

  // Clear the user's cart
  const userId = localStorage.getItem('userId');
  if (userId) {
    const allCarts = JSON.parse(localStorage.getItem('userCarts') || {});
    allCarts[userId] = [];
    localStorage.setItem('userCarts', JSON.stringify(allCarts));
  }

  // Clear checkout cart
  localStorage.removeItem('checkoutCart');

  // Redirect to order success page
  window.location.href = 'order-success.html';
}

function updateCartCount() {
  const cart = getUserCart();
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartCountElements = document.querySelectorAll('#cart-count');
  cartCountElements.forEach(element => {
    element.textContent = cartCount;
  });
}

window.addEventListener('DOMContentLoaded', () => {
  console.log('Checkout page loaded, setting up event listeners...');
  displayOrderSummary();
  updateCartCount();

  const checkoutForm = document.getElementById('checkout-form');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', handleCheckout);
  } else {
    console.warn('Checkout form not found, checkout functionality will be disabled.');
  }
});