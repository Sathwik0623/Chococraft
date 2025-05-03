async function fetchAdminOrders() {
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  const isAdmin = localStorage.getItem('isAdmin') === 'true';

  if (!userId || !token || !isAdmin) {
    console.warn('Admin access required or user not logged in', { userId, token, isAdmin });
    alert('Please log in as an admin to view orders.');
    window.location.href = '/login.html';
    return [];
  }

  console.log(`Fetching admin orders with token ${token.substring(0, 10)}...`);

  try {
    const response = await fetch('http://localhost:3000/api/orders', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.status === 401 || response.status === 403) {
      console.warn(`Unauthorized or forbidden for user ${userId}`, { responseStatus: response.status });
      alert('Session expired or insufficient permissions. Please log in again.');
      localStorage.removeItem('userId');
      localStorage.removeItem('token');
      localStorage.removeItem('isAdmin');
      window.location.href = '/login.html';
      return [];
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch orders: ${response.status}`);
    }

    const orders = await response.json();
    console.log(`Fetched ${orders.length} orders for admin`, orders.map(o => o._id));
    return orders;
  } catch (err) {
    console.error('Failed to fetch admin orders:', err);
    alert('Could not load orders. Please try again later.');
    return [];
  }
}

async function updateOrderStatus(orderId, status) {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Session expired. Please log in again.');
    window.location.href = '/login.html';
    return;
  }

  try {
    const response = await fetch(`http://localhost:3000/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });

    if (response.status === 401 || response.status === 403) {
      console.warn(`Unauthorized or forbidden when updating order ${orderId}`);
      alert('Session expired or insufficient permissions. Please log in again.');
      localStorage.removeItem('userId');
      localStorage.removeItem('token');
      localStorage.removeItem('isAdmin');
      window.location.href = '/login.html';
      return;
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to update order status: ${response.status}`);
    }

    console.log(`Order ${orderId} status updated to ${status}`);
    showSuccessMessage(`Order ${status} successfully!`);
    await displayAdminOrders(); // Refresh the orders list
  } catch (err) {
    console.error(`Failed to update order ${orderId} status:`, err);
    alert(`Could not update order status: ${err.message}`);
  }
}

async function displayAdminOrders() {
  const orders = await fetchAdminOrders();
  const userOrdersList = document.getElementById('user-orders-list');
  if (!userOrdersList) {
    console.error('User orders list element not found');
    return;
  }

  userOrdersList.innerHTML = '';
  if (orders.length === 0) {
    userOrdersList.innerHTML = '<p>No orders found.</p>';
    return;
  }

  orders.forEach(order => {
    const status = order.status || 'Pending';
    const statusClass =
      status.toLowerCase() === 'delivered' ? 'accepted-status' :
      status.toLowerCase() === 'rejected' ? 'rejected-status' : '';

    // Filter out items where productId is null and log a warning
    const validItems = order.items.filter(item => {
      if (!item.productId) {
        console.warn(`Invalid productId in order ${order._id} for item:`, item);
        return false;
      }
      return true;
    });

    const itemsHTML = validItems.length > 0
      ? validItems.map(item => `
          <li>${item.productId.name} - ₹${item.price.toFixed(2)} x ${item.quantity}</li>
        `).join('')
      : '<li>No valid items found for this order.</li>';

    const orderItem = document.createElement('div');
    orderItem.className = 'order-item';
    orderItem.innerHTML = `
      <h4>Order ID: ${order._id}</h4>
      <p>User: ${order.userId.username} (${order.shipping.name})</p>
      <p>Address: ${order.shipping.address}, ${order.shipping.city}, ${order.shipping.state}, ${order.shipping.zip}</p>
      <p>Payment Method: ${order.paymentMethod}</p>
      <p>Total: ₹${order.total.toFixed(2)}</p>
      <p>Date: ${new Date(order.createdAt).toLocaleDateString()}</p>
      <ul>${itemsHTML}</ul>
      <p><strong>Status:</strong> <span class="${statusClass}">${status.charAt(0).toUpperCase() + status.slice(1)}</span></p>
      ${
        status === 'Pending' ? `
          <button class="approve-btn" data-id="${order._id}">Approve</button>
          <button class="reject-btn" data-id="${order._id}">Reject</button>
        ` : ''
      }
    `;
    userOrdersList.appendChild(orderItem);
  });

  // Add event listeners for approve/reject buttons
  document.querySelectorAll('.approve-btn').forEach(btn => {
    btn.addEventListener('click', () => updateOrderStatus(btn.dataset.id, 'Processing'));
  });
  document.querySelectorAll('.reject-btn').forEach(btn => {
    btn.addEventListener('click', () => updateOrderStatus(btn.dataset.id, 'Rejected'));
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

// Show success message (mirroring admin.js functionality)
function showSuccessMessage(message) {
  const adminContent = document.getElementById('admin-content');
  if (!adminContent) return;

  let successMessage = document.getElementById('successMessage');
  if (!successMessage) {
    successMessage = document.createElement('div');
    successMessage.id = 'successMessage';
    successMessage.className = 'success-message';
    adminContent.prepend(successMessage);
  }
  successMessage.innerHTML = `
    <span class="checkmark-circle">✓</span>
    <span class="message-text">${message}</span>
  `;
  successMessage.style.display = 'flex';
  successMessage.classList.remove('fade-out');
  setTimeout(() => {
    successMessage.classList.add('fade-out');
    setTimeout(() => {
      successMessage.style.display = 'none';
    }, 500);
  }, 2500);
}

// For orders.html standalone usage
window.addEventListener('DOMContentLoaded', async () => {
  if (document.getElementById('user-orders-list') && window.location.pathname.includes('orders.html')) {
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    if (!isAdmin) {
      alert('Access restricted to admins.');
      window.location.href = '/login.html';
      return;
    }
    await displayAdminOrders();
    await updateCartCount();
  }
});