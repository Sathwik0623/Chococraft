import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './OrderList.css';

const OrderList = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState([]);
  const [orderTimeFilter, setOrderTimeFilter] = useState('2025');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const BASE_URL = 'http://localhost:5000';

  const fetchUserOrders = async () => {
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');
    if (!userId || !token) {
      alert('Please log in to view your orders.');
      navigate('/login');
      return [];
    }

    try {
      const response = await fetch(`${BASE_URL}/api/orders/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.status === 401 || response.status === 403) {
        alert('Session expired. Please log in again.');
        localStorage.removeItem('userId');
        localStorage.removeItem('token');
        localStorage.removeItem('isAdmin');
        navigate('/login');
        return [];
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.status} ${response.statusText}`);
      }

      const ordersData = await response.json();
      return ordersData;
    } catch (err) {
      alert(`Could not load your orders. Please try again later. Error: ${err.message}`);
      return [];
    }
  };

  const handleCancelOrder = async (orderId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in to cancel your order.');
      navigate('/login');
      return;
    }

    if (!confirm('Are you sure you want to cancel this order?')) return;

    try {
      const response = await fetch(`${BASE_URL}/api/orders/${orderId}/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to cancel order: ${response.status} ${response.statusText}`);
      }

      const updatedOrder = await response.json();
      setOrders(orders.map(order =>
        order._id === orderId ? { ...order, status: updatedOrder.status } : order
      ));
      setFilteredOrders(filteredOrders.map(order =>
        order._id === orderId ? { ...order, status: updatedOrder.status } : order
      ));
      alert('Order cancelled successfully.');
    } catch (err) {
      alert(`Could not cancel the order. Please try again later. Error: ${err.message}`);
    }
  };

  const applyFilters = (orders) => {
    let filtered = [...orders];

    if (orderStatusFilter.length > 0) {
      filtered = filtered.filter(order =>
        orderStatusFilter.includes(order.status.toLowerCase())
      );
    }

    if (orderTimeFilter) {
      const now = new Date();
      if (orderTimeFilter === 'last 30 days') {
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 30);
        filtered = filtered.filter(order => new Date(order.createdAt) >= thirtyDaysAgo);
      } else if (orderTimeFilter === 'older') {
        filtered = filtered.filter(order =>
          new Date(order.createdAt).getFullYear() < 2022
        );
      } else {
        filtered = filtered.filter(order =>
          new Date(order.createdAt).getFullYear().toString() === orderTimeFilter
        );
      }
    }

    if (searchQuery) {
      filtered = filtered.filter(order =>
        order.items.some(item =>
          item.productId?.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    return filtered;
  };

  const handleStatusFilterChange = (status) => {
    setOrderStatusFilter(prev => {
      if (prev.includes(status)) {
        return prev.filter(s => s !== status);
      } else {
        return [...prev, status];
      }
    });
  };

  const handleTimeFilterChange = (time) => {
    setOrderTimeFilter(time);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSearch = () => {
    setFilteredOrders(applyFilters(orders));
  };

  useEffect(() => {
    const loadOrders = async () => {
      if (localStorage.getItem('isAdmin') === 'true') {
        navigate('/admin');
        return;
      }
      const ordersData = await fetchUserOrders();
      setOrders(ordersData);
      setFilteredOrders(ordersData);
    };
    loadOrders();
  }, [navigate]);

  useEffect(() => {
    setFilteredOrders(applyFilters(orders));
  }, [orders, orderStatusFilter, orderTimeFilter, searchQuery]);

  const canCancelOrder = (createdAt) => {
    const orderDate = new Date(createdAt);
    const now = new Date();
    const diffInHours = (now - orderDate) / (1000 * 60 * 60);
    return diffInHours <= 24;
  };

  return (
    <div className="min-h-screen bg-gray-100 font-segoe flex flex-col">
      <header className="text-center py-4 bg-white shadow-md">
        <h1 className="text-xl font-bold text-gray-900">My Orders</h1>
      </header>

      <main className="flex-grow p-4 md:p-8 flex">
        {/* Filters Container */}
        <aside className="w-1/4 pr-4">
          <div className="filter-container">
            <h3 className="text-lg font-bold mb-4">Filters</h3>
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">ORDER STATUS</h4>
              {['On the way', 'Delivered', 'Cancelled', 'Returned'].map(status => (
                <label key={status} className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    checked={orderStatusFilter.includes(status)}
                    onChange={() => handleStatusFilterChange(status)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-600 capitalize">{status}</span>
                </label>
              ))}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">ORDER TIME</h4>
              {['last 30 days', '2024', '2023', '2022', 'Older'].map(time => (
                <label key={time} className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    checked={orderTimeFilter === time}
                    onChange={() => handleTimeFilterChange(time)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-600 capitalize">{time}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* Orders Container */}
        <div className="flex-grow orders-list ai-style-change-1">
          <div className="flex justify-between items-center mb-4">
            <input
              type="text"
              placeholder="Search your orders here"
              value={searchQuery}
              onChange={handleSearchChange}
              className="border border-gray-300 rounded-lg p-2 w-3/4"
            />
            <button
              onClick={handleSearch}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              Search Orders
            </button>
          </div>

          <div className="orders-container">
            {filteredOrders.length === 0 ? (
              <p className="text-gray-600 text-center">You have no recent orders.</p>
            ) : (
              filteredOrders.map(order => {
                const validItems = order.items.filter(item => item.productId != null);
                if (validItems.length === 0) return null;

                const firstItem = validItems[0];
                const status = order.status?.toLowerCase() || 'pending';
                let displayStatus, statusClass, statusText, dotClass;

                // Status display logic with colored dots
                if (status === 'delivered') {
                  displayStatus = `Delivered on ${new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
                  statusClass = 'text-green-600 font-semibold';
                  dotClass = 'dot dot-green';
                  statusText = 'Your item has been delivered';
                } else if (status === 'cancelled' || status === 'rejected') {
                  displayStatus = `Cancelled on ${new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
                  statusClass = 'text-red-600 font-semibold';
                  dotClass = 'dot dot-red';
                  statusText = '';
                } else if (status === 'pending' || status === 'on the way') {
                  displayStatus = `Pending since ${new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
                  statusClass = 'text-yellow-600 font-semibold';
                  dotClass = 'dot dot-yellow';
                  statusText = '';
                } else {
                  displayStatus = `Expected delivery on ${new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
                  statusClass = 'text-green-600 font-semibold';
                  dotClass = 'dot dot-green';
                  statusText = '';
                }

                const isCancellable = canCancelOrder(order.createdAt) && status !== 'delivered' && (status !== 'cancelled' && status !== 'rejected');
                const hasInstallation = firstItem.productId.name.toLowerCase().includes('washing machine');

                return (
                  <div key={order._id} className="order-item">
                    <div className="flex flex-row items-center gap-4">
                      <img
                        src={`${BASE_URL}${firstItem.productId.image_url}`}
                        alt={firstItem.productId.name}
                        className="w-12 h-12 object-cover rounded flex-shrink-0"
                        style={{ minWidth: '48px' }}
                        onError={(e) => (e.target.src = 'https://via.placeholder.com/48x48.png?text=No+Image')}
                      />
                      <div className="flex flex-row items-center gap-4 flex-1" style={{ minWidth: 0 }}>
                        {/* Product Name */}
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-800">{firstItem.productId.name}</p>
                        </div>
                        {/* Price (Centered) */}
                        <div className="price-container">
                          <p className="text-sm font-semibold text-gray-800">₹{order.total.toFixed(2)}</p>
                        </div>
                        {/* Status and Buttons (Moved to the right) */}
                        <div className="status-section flex flex-col items-end">
                          <div className="status-dot-text flex flex-row items-center gap-2">
                            <span className={dotClass}></span>
                            <p className={statusClass}>{displayStatus}</p>
                          </div>
                          {statusText && <p className="text-xs text-gray-500 text-right">{statusText}</p>}
                          {status === 'delivered' && (
                            <button className="text-blue-600 text-sm font-semibold mt-1">
                              Rate & Review Product
                            </button>
                          )}
                          {isCancellable && (
                            <button
                              onClick={() => handleCancelOrder(order._id)}
                              className="text-red-600 text-sm font-semibold mt-1"
                            >
                              Cancel Order
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {hasInstallation && status === 'delivered' && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center justify-center w-8 h-8 bg-yellow-100 rounded-full">
                          <span className="text-yellow-600">🛠️</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">Installation and Demo</p>
                          <p className="text-xs text-gray-500">FREE</p>
                          <p className="text-xs text-green-600">
                            Completed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }).filter(order => order != null)
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default OrderList;