import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();
  const BASE_URL = 'http://localhost:5000'; // Updated to match server.js port

  // Fetch admin orders
  const fetchAdminOrders = async () => {
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';

    if (!userId || !token || !isAdmin) {
      alert('Please log in as an admin to view orders.');
      navigate('/login');
      return [];
    }

    try {
      const response = await fetch(`${BASE_URL}/api/orders`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.status === 401 || response.status === 403) {
        alert('Session expired or insufficient permissions. Please log in again.');
        localStorage.removeItem('userId');
        localStorage.removeItem('token');
        localStorage.removeItem('isAdmin');
        navigate('/login');
        return [];
      }

      if (!response.ok) throw new Error('Failed to fetch orders');
      const ordersData = await response.json();
      console.log('Raw orders data (admin):', ordersData);
      return ordersData;
    } catch (err) {
      alert('Could not load orders. Please try again later.');
      return [];
    }
  };

  // Update order status
  const updateOrderStatus = async (orderId, status) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Session expired. Please log in again.');
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (response.status === 401 || response.status === 403) {
        alert('Session expired or insufficient permissions. Please log in again.');
        localStorage.removeItem('userId');
        localStorage.removeItem('token');
        localStorage.removeItem('isAdmin');
        navigate('/login');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update order status');
      }

      setSuccessMessage(`Order ${status} successfully!`);
      setTimeout(() => setSuccessMessage(''), 2500);
      const updatedOrders = await fetchAdminOrders();
      setOrders(updatedOrders);
    } catch (err) {
      alert(`Could not update order status: ${err.message}`);
    }
  };

  // Display orders
  useEffect(() => {
    const loadOrders = async () => {
      const isAdmin = localStorage.getItem('isAdmin') === 'true';
      if (!isAdmin) {
        alert('Access restricted to admins.');
        navigate('/login');
        return;
      }
      const ordersData = await fetchAdminOrders();
      setOrders(ordersData);
    };
    loadOrders();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-100 font-segoe">
      <header className="text-center py-10">
        <img src="/assets/images/logo.png" alt="ChocoCraft Logo" className="h-20 mx-auto" />
        <h1 className="text-3xl font-bold">My Orders</h1>
      </header>

      <main className="p-4">
        <div className="user-orders max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">My Orders</h2>
          {successMessage && (
            <div className="success-message flex items-center justify-center bg-green-500 text-white p-2 rounded mb-4 animate-fade-in">
              <span className="checkmark-circle mr-2">✓</span>
              <span>{successMessage}</span>
            </div>
          )}
          <div id="user-orders-list">
            {orders.length === 0 ? (
              <p>No orders found.</p>
            ) : (
              orders.map(order => {
                const status = order.status || 'Pending';
                const statusClass =
                  status.toLowerCase() === 'delivered' ? 'text-green-500' :
                  status.toLowerCase() === 'rejected' ? 'text-red-500' : 'text-yellow-500';

                const validItems = (order.items || []).filter(item => {
                  if (!item || !item.productId || !item.productId.name) {
                    console.warn(`Invalid item in order ${order._id}:`, item);
                    return false;
                  }
                  return true;
                });

                // Validate and format the date
                const orderDate = order.date ? new Date(order.date) : order.createdAt ? new Date(order.createdAt) : null;
                const formattedDate = orderDate && !isNaN(orderDate)
                  ? orderDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
                  : 'Date not available';

                return (
                  <div key={order._id} className="order-item bg-white p-4 rounded-lg shadow mb-4">
                    <h4 className="text-lg font-semibold">Order ID: {order._id}</h4>
                    <p>User: {(order.userId?.username || 'Unknown User')} ({order.shipping?.name || 'N/A'})</p>
                    <p>Address: {order.shipping?.address || 'N/A'}, {order.shipping?.city || 'N/A'}, {order.shipping?.state || 'N/A'}, {order.shipping?.zip || 'N/A'}</p>
                    <p>Payment Method: {order.paymentMethod || 'N/A'}</p>
                    <p>Total: ₹{(order.total || 0).toFixed(2)}</p>
                    <p>Date: {formattedDate}</p>
                    <ul className="list-disc pl-5">
                      {validItems.length > 0 ? (
                        validItems.map((item, index) => {
                          const imageUrl = item.productId.image_url ? `${BASE_URL}${item.productId.image_url}` : null;
                          console.log(`Attempting to load image for item ${item.productId.name}: ${imageUrl || 'No image URL'}`);
                          return (
                            <li key={index} className="flex items-center gap-2">
                              {imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt={item.productId.name}
                                  className="w-12 h-12 object-cover rounded"
                                  onError={(e) => {
                                    console.error(`Failed to load image: ${imageUrl}`);
                                    e.target.src = 'https://placehold.co/50x50?text=No+Image';
                                  }}
                                />
                              ) : (
                                <img
                                  src="https://placehold.co/50x50?text=No+Image"
                                  alt="No Image"
                                  className="w-12 h-12 object-cover rounded"
                                />
                              )}
                              <span>{item.productId.name} - ₹{(item.price || 0).toFixed(2)} x {item.quantity || 1}</span>
                            </li>
                          );
                        })
                      ) : (
                        <li>No valid items found for this order.</li>
                      )}
                    </ul>
                    <p>
                      <strong>Status:</strong> <span className={statusClass}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                    </p>
                    {status.toLowerCase() === 'pending' && (
                      <div className="mt-2">
                        <button
                          className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 mr-2"
                          onClick={() => updateOrderStatus(order._id, 'Processing')}
                        >
                          Approve
                        </button>
                        <button
                          className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                          onClick={() => updateOrderStatus(order._id, 'Rejected')}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      <footer className="bg-gray-800 text-white p-4 text-center">
        <img src="/assets/images/logo.png" alt="ChocoCraft Logo" className="h-10 mx-auto mb-2" />
        <p>© 2025 ChocoCraft. All rights reserved.</p>
        <div className="flex justify-center space-x-4 mt-2">
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
            <i className="fab fa-facebook-f" />
          </a>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
            <i className="fab fa-instagram" />
          </a>
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">
            <i className="fab fa-twitter" />
          </a>
        </div>
      </footer>

      <style jsx>{`
        .font-segoe {
          font-family: 'Segoe UI', sans-serif;
        }
        .animate-fade-in {
          animation: fadeIn 0.5s forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Orders;