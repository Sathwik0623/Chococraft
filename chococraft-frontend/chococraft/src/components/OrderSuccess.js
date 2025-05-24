import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './OrderSuccess.css';

// Note: Assuming nav.js functionality is handled elsewhere or in a separate component
// For simplicity, I'll include the necessary logic directly here
const OrderSuccess = () => {
  const [order, setOrder] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [menuActive, setMenuActive] = useState(false);
  const [backBtnActive, setBackBtnActive] = useState(false);
  const navigate = useNavigate();

  // Fetch order details and cart count on mount
  useEffect(() => {
    // Retrieve the last order from localStorage
    const lastOrder = localStorage.getItem('lastOrder');
    if (lastOrder) {
      const parsedOrder = JSON.parse(lastOrder);
      setOrder(parsedOrder);
    } else {
      // If no order is found, redirect to home after 3 seconds
      setTimeout(() => navigate('/'), 3000);
    }

    // Update cart count (adapted from the sample's updateCartCount)
    const updateCartCount = async () => {
      const userId = localStorage.getItem('userId');
      const token = localStorage.getItem('token');
      if (!userId || !token) {
        setCartCount(0);
        return;
      }

      try {
        const response = await fetch('http://localhost:5000/api/cart', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (!response.ok) throw new Error('Failed to fetch cart');
        const cart = await response.json();
        const count = cart.reduce((sum, item) => sum + item.quantity, 0);
        setCartCount(count);
      } catch (e) {
        console.error('Error fetching cart count:', e);
        setCartCount(0);
      }
    };

    updateCartCount();

    // Check if back button should be active
    if (window.history.length > 1) {
      setBackBtnActive(true);
    }
  }, [navigate]);

  // Toggle hamburger menu
  const handleHamburgerClick = () => {
    setMenuActive(!menuActive);
    setBackBtnActive(false);
  };

  // Handle menu link clicks
  const handleMenuLinkClick = () => {
    if (window.history.length > 1) {
      setBackBtnActive(true);
    }
    setMenuActive(false);
  };

  // Handle back button click
  const handleBackClick = (e) => {
    e.preventDefault();
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      setMenuActive(false);
      setBackBtnActive(false);
    }
  };

  // Handle continue shopping
  const handleContinueShopping = () => {
    localStorage.removeItem('lastOrder'); // Clean up
    navigate('/');
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
    navigate('/login');
  };

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-600">No order found. Redirecting...</p>
      </div>
    );
  }

  // Generate a mock order ID (same as before, since backend doesn't provide it)
  const orderId = order.date ? `ORD-${order.date.replace(/[^0-9]/g, '').slice(0, 12)}` : 'ORD-UNKNOWN';

  return (
    <div className="min-h-screen bg-gray-100 font-segoe flex flex-col">
      {/* Navigation */}
      {/*  */}

      {/* Header */}
      <header className="text-center py-10 bg-white shadow-md">
        <img src="/assets/images/logo.png" alt="ChocoCraft Logo" height="50" />
        <h1 className="text-3xl font-bold text-gray-900 mt-4">Order Confirmation</h1>
        <h2 className="text-2xl text-gray-600 mt-2">Thank You for Your Purchase!</h2>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 md:p-8">
        <div className="success-section">
          <i className="fas fa-check-circle checkmark"></i>
          <h2>Order Placed Successfully!</h2>
          <p>Your order has been confirmed and is being processed.</p>
          <div className="order-details">
            <p><strong>Order ID:</strong> {orderId}</p>
            <p><strong>Total:</strong> ₹{order.total.toFixed(2)}</p>
            <p><strong>Date:</strong> {new Date(order.date).toLocaleString()}</p>
          </div>
          <button onClick={handleContinueShopping} className="btn">Continue Shopping</button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white p-4 text-center">
        <img src="/assets/images/logo.png" alt="ChocoCraft Logo" height="40" />
        <p>© 2025 ChocoCraft. All rights reserved.</p>
        <div className="socials">
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
            <i className="fab fa-facebook-f"></i>
          </a>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
            <i className="fab fa-instagram"></i>
          </a>
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">
            <i className="fab fa-twitter"></i>
          </a>
        </div>
      </footer>
    </div>
  );
};

export default OrderSuccess;