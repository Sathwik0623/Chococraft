import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { retryFetch } from '../utils';

const OrderList = ({ isAdmin = false }) => {
  const [orders, setOrders] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Fetch all orders (for admin)
  const fetchAllOrders = async () => {
    if (!token) {
      setErrorMessage('Please log in to view orders.');
      setTimeout(() => navigate('/login'), 2500);
      return [];
    }

    try {
      const response = await retryFetch(`${BASE_URL}/api/orders`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.status === 401 || response.status === 403) {
        setErrorMessage('Session expired. Please log in again.');
        localStorage.removeItem('userId');
        localStorage.removeItem('token');
        localStorage.removeItem('isAdmin');
        setTimeout(() => navigate('/login'), 2500);
        return [];
      }

      const text = await response.text();
      let ordersData;
      try {
        ordersData = JSON.parse(text);
        console.log('Raw orders data (admin):', ordersData);
      } catch (err) {
        console.error('Failed to parse orders response as JSON:', text);
        throw new Error('Server returned an invalid response: ' + text);
      }

      if (!response.ok) {
        throw new Error(ordersData.error || `Failed to fetch orders with status ${response.status}`);
      }

      return ordersData;
    } catch (err) {
      console.error('Error fetching all orders:', err.message);
      setErrorMessage('Could not load orders. Please try again later.');
      return [];
    }
  };

  // Fetch user orders (for regular users)
  const fetchUserOrders = async () => {
    if (!userId || !token) {
      setErrorMessage('Please log in to view your orders.');
      setTimeout(() => navigate('/login'), 2500);
      return [];
    }

    try {
      const response = await retryFetch(`${BASE_URL}/api/orders/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.status === 401 || response.status === 403) {
        setErrorMessage('Session expired. Please log in again.');
        localStorage.removeItem('userId');
        localStorage.removeItem('token');
        localStorage.removeItem('isAdmin');
        setTimeout(() => navigate('/login'), 2500);
        return [];
      }

      const text = await response.text();
      let ordersData;
      try {
        ordersData = JSON.parse(text);
        console.log('Raw orders data (user):', ordersData);
      } catch (err) {
        console.error('Failed to parse user orders response as JSON:', text);
        throw new Error('Server returned an invalid response: ' + text);
      }

      if (!response.ok) {
        throw new Error(ordersData.error || `Failed to fetch user orders with status ${response.status}`);
      }

      return ordersData;
    } catch (err) {
      console.error('Error fetching user orders:', err.message);
      setErrorMessage('Could not load your orders. Please try again later.');
      return [];
    }
  };

  // Update order status (for admins)
  const updateOrderStatus = async (orderId, newStatus) => {
    if (!isAdmin) {
      setErrorMessage('Only admins can update order status.');
      return;
    }

    try {
      console.log(`Updating order ${orderId} to status ${newStatus}...`);
      const response = await retryFetch(`${BASE_URL}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.status === 401 || response.status === 403) {
        setErrorMessage('Session expired. Please log in again.');
        localStorage.removeItem('userId');
        localStorage.removeItem('token');
        localStorage.removeItem('isAdmin');
        setTimeout(() => navigate('/login'), 2500);
        return;
      }

      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (err) {
        console.error('Failed to parse response as JSON:', text);
        throw new Error('Server returned an invalid response: ' + text);
      }

      if (!response.ok) {
        throw new Error(result.error || `Failed to update order status with status ${response.status}`);
      }

      setOrders(orders.map(order =>
        order._id === orderId ? { ...order, status: newStatus } : order
      ));
      setErrorMessage('');
    } catch (error) {
      console.error('Error updating order status:', error.message);
      setErrorMessage('Failed to update order status: ' + error.message);
    }
  };

  // Initial load
  useEffect(() => {
    const loadOrders = async () => {
      setIsLoading(true);
      const ordersData = isAdmin ? await fetchAllOrders() : await fetchUserOrders();
      setOrders(ordersData);
      setIsLoading(false);
    };
    loadOrders();
  }, [isAdmin, navigate]);

  return (
    <div className="order-list font-segoe">
      {errorMessage && (
        <p className="text-center text-red-500">{errorMessage}</p>
      )}
      {isLoading ? (
        <p className="text-center text-gray-500">Loading orders...</p>
      ) : orders.length === 0 ? (
        <p className="text-center text-gray-500">{isAdmin ? 'No orders found.' : 'You have no recent orders.'}</p>
      ) : (
        <div className="user-orders-list flex flex-col gap-4">
          {orders.map(order => {
            const status = order.status || 'pending';
            const statusClass =
              status.toLowerCase() === 'delivered' ? 'text-green-500 font-bold' :
              status.toLowerCase() === 'rejected' ? 'text-red-500 font-bold' : // Updated to 'rejected'
              status.toLowerCase() === 'shipped' ? 'text-blue-500 font-bold' :
              'text-yellow-500 font-bold';

            // Validate and format the date
            const orderDate = order.date ? new Date(order.date) : null;
            const formattedDate = orderDate && !isNaN(orderDate)
              ? orderDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
              : order.createdAt
              ? new Date(order.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
              : 'Date not available';

            // Filter valid items
            const validItems = (order.items || []).filter(item => item && item.productId && item.productId.name);

            return (
              <div key={order._id} className="order-item bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold">Order #{order._id}</h3>
                {isAdmin && (
                  <p><strong>User:</strong> {order.userId?.username || 'Unknown User'}</p>
                )}
                <p><strong>Date:</strong> {formattedDate}</p>
                <div className="order-items mt-2">
                  {validItems.length > 0 ? (
                    validItems.map((item, index) => {
                      const itemName = item.productId.name || 'Unknown Item';
                      const imageUrl = item.productId.image_url ? `${BASE_URL}${item.productId.image_url}` : null;
                      console.log(`Attempting to load image for item ${itemName}: ${imageUrl || 'No image URL'}`);
                      return (
                        <div key={index} className="order-item-row flex items-center gap-2 mb-2">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={itemName}
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
                          <span>{itemName} – ₹{(item.price || 0).toFixed(2)} x {item.quantity || 1}</span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-gray-500">No valid items in this order.</p>
                  )}
                </div>
                <p><strong>Total:</strong> ₹{(order.total || 0).toFixed(2)}</p>
                <p>
                  <strong>Shipping:</strong> {order.shipping?.name || 'N/A'}, {order.shipping?.address || 'N/A'}, {order.shipping?.city || 'N/A'}, {order.shipping?.state || 'N/A'} - {order.shipping?.zip || 'N/A'}
                </p>
                <p><strong>Payment Method:</strong> {(order.paymentMethod || 'N/A').toUpperCase()}</p>
                <p>
                  <strong>Status:</strong> <span className={statusClass}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                </p>
                {isAdmin && (
                  <div className="order-controls mt-2 flex gap-2">
                    {status !== 'Shipped' && ( // Match the enum case
                      <button
                        className="btn bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                        onClick={() => updateOrderStatus(order._id, 'Shipped')} // Updated to 'Shipped'
                      >
                        Mark as Shipped
                      </button>
                    )}
                    {status !== 'Rejected' && ( // Match the enum case
                      <button
                        className="btn bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                        onClick={() => updateOrderStatus(order._id, 'Rejected')} // Updated to 'Rejected'
                      >
                        Cancel Order
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrderList;