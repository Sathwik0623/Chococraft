// user-orders.js
async function fetchUserOrders() {
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  if (!userId || !token) {
    console.warn('No userId or token found, redirecting to login');
    alert('Please log in to view your orders.');
    window.location.href = 'login.html';
    return [];
  }

  console.log(`Fetching orders for user ${userId} with token ${token.substring(0, 10)}...`);

  try {
    const res = await fetch(`http://localhost:3000/orders/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        console.warn(`Unauthorized or forbidden for user ${userId}, redirecting to login`);
        alert('Session expired. Please log in again.');
        localStorage.removeItem('userId');
        localStorage.removeItem('token');
        window.location.href = 'login.html';
        return [];
      }
      throw new Error(`Server error (${res.status})`);
    }
    const orders = await res.json();
    console.log(`Fetched ${orders.length} orders for user ${userId}`);
    return orders;
  } catch (err) {
    console.error('Failed to fetch orders:', err);
    alert('Could not load your orders. Please try again later.');
    return [];
  }
}

function renderOrders(orders) {
  const orderList = document.getElementById('user-orders-list');
  if (!orderList) {
    console.error('User orders list element not found');
    return;
  }
  orderList.innerHTML = '';

  if (orders.length === 0) {
    orderList.innerHTML = '<p>You have no recent orders.</p>';
    return;
  }

  orders.forEach(order => {
    const status = order.status || 'Pending';
    const statusClass =
      status.toLowerCase() === 'delivered' ? 'accepted-status' :
      status.toLowerCase() === 'rejected' ? 'rejected-status' : '';

    const itemsHTML = order.items.map(item => `
      <div class="order-item-row">
        <img src="${item.productId.image_url}" alt="${item.productId.name}" width="50" height="50" />
        <span>${item.productId.name} – ₹${item.price.toFixed(2)} x ${item.quantity}</span>
      </div>
    `).join('');

    const formattedDate = new Date(order.createdAt).toLocaleString();

    orderList.innerHTML += `
      <div class="order-item">
        <h3>Order #${order._id}</h3>
        <p><strong>Date:</strong> ${formattedDate}</p>
        <div class="order-items">${itemsHTML}</div>
        <p><strong>Total:</strong> ₹${order.total.toFixed(2)}</p>
        <p><strong>Shipping:</strong>
          ${order.shipping.name}, ${order.shipping.address}, ${order.shipping.city}, ${order.shipping.state} - ${order.shipping.zip}
        </p>
        <p><strong>Payment Method:</strong> ${order.paymentMethod.toUpperCase()}</p>
        <p>
          <strong>Status:</strong>
          <span class="${statusClass}">
            ${status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </p>
      </div>
    `;
  });
}

async function updateCartCount() {
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  if (!userId || !token) {
    document.querySelectorAll('#cart-count').forEach(el => el.textContent = '0');
    return;
  }

  try {
    const response = await fetch('http://localhost:3000/api/cart', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch cart');
    const cart = await response.json();
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.querySelectorAll('#cart-count').forEach(el => el.textContent = count);
  } catch (e) {
    console.error('Error fetching cart count:', e);
    document.querySelectorAll('#cart-count').forEach(el => el.textContent = '0');
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  if (localStorage.getItem('isAdmin') === 'true') {
    console.log('Admin user detected, redirecting to admin.html');
    window.location.href = 'admin.html';
    return;
  }

  const orders = await fetchUserOrders();
  renderOrders(orders);
  await updateCartCount();
});