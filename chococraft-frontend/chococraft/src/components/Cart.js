import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getUserCart, saveUserCart, showSuccessMessage, addToCart } from '../utils';

const Cart = () => {
  const [cart, setCart] = useState([]);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const BASE_URL = 'http://localhost:5000';
  const FALLBACK_IMAGE = 'https://via.placeholder.com/60x60.png?text=No+Image';

  const fetchCart = async () => {
    try {
      const cartItems = await getUserCart();
      console.log('Cart.js - Fetched cart items:', cartItems);
      if (!Array.isArray(cartItems)) {
        console.error('Cart.js - Expected cartItems to be an array, got:', cartItems);
        setCart([]);
        showSuccessMessage('Cart is empty or invalid data received.', setMessage);
        return;
      }
      const validatedItems = cartItems.filter(item => {
        const isValid = item && item.id && item.name && typeof item.price === 'number' && typeof item.quantity === 'number';
        if (!isValid) {
          console.warn('Cart.js - Invalid cart item:', item);
        }
        return isValid;
      });
      console.log('Cart.js - Setting validated cart items:', validatedItems);
      setCart(validatedItems);
      if (validatedItems.length === 0 && cartItems.length > 0) {
        showSuccessMessage('Some cart items were invalid and have been removed.', setMessage);
      }
    } catch (error) {
      console.error('Cart.js - Failed to fetch cart:', error.message);
      setCart([]);
      showSuccessMessage('Failed to load cart. Please try again.', setMessage);
    }
  };

  const updateCartItem = async (id, delta, itemData = null) => {
    try {
      if (itemData && delta > 0) {
        console.log('Cart.js - Adding new item to cart:', itemData);
        await addToCart(itemData);
        showSuccessMessage('Item added to cart', setMessage);
      } else {
        let updatedCart = [...cart];
        const itemIndex = updatedCart.findIndex(item => item.id === id);
        if (itemIndex === -1) {
          console.warn('Cart.js - Item not found in cart for update:', id);
          showSuccessMessage('Item not found in cart.', setMessage);
          return;
        }

        const item = updatedCart[itemIndex];
        const newQuantity = item.quantity + delta;

        if (newQuantity <= 0) {
          updatedCart = updatedCart.filter(item => item.id !== id);
          showSuccessMessage('Item removed from cart', setMessage);
        } else if (newQuantity > item.stock) {
          showSuccessMessage('Stock limit reached.', setMessage);
          return;
        } else {
          updatedCart[itemIndex].quantity = newQuantity;
          showSuccessMessage('Cart updated', setMessage);
        }

        setCart(updatedCart);
        await saveUserCart(updatedCart);
        console.log('Cart.js - Cart updated successfully:', updatedCart);
      }

      await fetchCart();
    } catch (error) {
      console.error('Cart.js - Failed to save cart update:', error.message);
      let errorMessage = 'Failed to update cart. Please try again.';
      if (error.message.includes('Product with ID')) {
        errorMessage = 'Product not found. It may have been removed.';
      } else if (error.message.includes('Stock limit')) {
        errorMessage = 'Stock limit reached for this item.';
      } else if (error.message.includes('User not logged in')) {
        errorMessage = 'Please log in to add items to your cart.';
        navigate('/login?redirectReason=cart');
      }
      showSuccessMessage(errorMessage, setMessage);
      fetchCart();
    }
  };

  const removeItem = async (id) => {
    try {
      const updatedCart = cart.filter(item => item.id !== id);
      setCart(updatedCart);
      await saveUserCart(updatedCart);
      showSuccessMessage('Item removed from cart', setMessage);
      await fetchCart();
    } catch (error) {
      console.error('Cart.js - Failed to remove cart item:', error.message);
      showSuccessMessage('Failed to remove item. Please try again.', setMessage);
      fetchCart();
    }
  };

  const calculateTotal = () => {
    const subtotal = cart.reduce((total, item) => {
      const discountedPrice = item.discountedPrice || item.price;
      return total + discountedPrice * item.quantity;
    }, 0);
    const platformFee = 5;
    return (subtotal + platformFee).toFixed(2);
  };

  const calculateOriginalTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2);
  };

  const calculateDiscount = () => {
    const original = parseFloat(calculateOriginalTotal());
    const discounted = cart.reduce((total, item) => {
      const discountedPrice = item.discountedPrice || item.price;
      return total + discountedPrice * item.quantity;
    }, 0);
    return (original - discounted).toFixed(2);
  };

  const calculateSavings = () => {
    const discount = parseFloat(calculateDiscount());
    const coupon = cart.reduce((total, item) => total + (item.couponDiscount || 0), 0);
    const deliverySavings = cart.reduce((total, item) => total + (item.deliveryCharge || 0), 0);
    return (discount + coupon + deliverySavings).toFixed(2);
  };

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      console.log('Cart.js - No userId found, redirecting to login');
      navigate('/login?redirectReason=cart');
      return;
    }

    console.log('Cart.js - Running useEffect to fetch cart');
    fetchCart();

    const handleFocus = () => {
      console.log('Cart.js - Window focused, refreshing cart');
      fetchCart();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [navigate, location]);

  return (
    <div className="min-h-screen bg-gray-100 font-segoe">
      <header className="text-center py-10">
        <img src="/assets/images/logo.png" alt="ChocoCraft Logo" className="h-20 mx-auto" />
        <h1 className="text-3xl font-bold">Your Cart</h1>
      </header>

      <main className="relative" style={{ margin: '0', padding: '0 16px' }}>
        {message && (
          <div className="success-message fixed left-1/2 transform -translate-x-1/2 top-4 bg-green-500 text-white p-2 rounded animate-fade-out">
            {message}
          </div>
        )}
        <div className="cart-content w-full">
          <div className="cart-items flex flex-col md:flex-row w-full">
            {/* Cart Items Container */}
            <div className="cart-items-list md:w-2/3">
              {cart.length === 0 ? (
                <p className="text-center w-full p-12">Your cart is empty.</p>
              ) : (
                <>
                  {cart.map(item => (
                    <div key={item.id} className="cart-item bg-white flex items-start min-h-[140px] w-full">
                      <div className="p-6 w-full">
                        {/* Image and Name in a Row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img
                            src={item.image ? `${BASE_URL}${item.image}` : FALLBACK_IMAGE}
                            alt={item.name || 'Product'}
                            style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }}
                            onError={(e) => (e.target.src = FALLBACK_IMAGE)}
                          />
                          <h3 className="text-lg font-semibold text-gray-800 flex-1">
                            {item.name || 'Unknown Product'}
                          </h3>
                        </div>

                        {/* Price and Discount */}
                        <div style={{ marginTop: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.875rem', color: '#6b7280', textDecoration: 'line-through' }}>
                              ₹{item.price.toFixed(2)}
                            </span>
                            <span style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937' }}>
                              ₹{(item.discountedPrice || item.price).toFixed(2)}
                            </span>
                            <span style={{ fontSize: '0.875rem', color: '#22c55e' }}>
                              {item.discountPercentage || 0}% OFF 1 coupon applied
                            </span>
                          </div>
                        </div>

                        {/* Quantity Controls and Remove Option */}
                        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d1d5db', borderRadius: '4px' }}>
                            <button
                              style={{
                                padding: '2px 8px',
                                backgroundColor: '#f3f4f6',
                                border: 'none',
                                borderRadius: '4px 0 0 4px',
                                cursor: 'pointer',
                              }}
                              onClick={() => updateCartItem(item.id, -1)}
                            >
                              −
                            </button>
                            <span style={{ padding: '2px 12px', fontSize: '0.875rem' }}>{item.quantity}</span>
                            <button
                              style={{
                                padding: '2px 8px',
                                backgroundColor: '#f3f4f6',
                                border: 'none',
                                borderRadius: '0 4px 4px 0',
                                cursor: 'pointer',
                              }}
                              onClick={() => updateCartItem(item.id, 1)}
                            >
                              +
                            </button>
                          </div>
                          <button
                            style={{
                              color: '#6b7280',
                              fontSize: '0.875rem',
                              textTransform: 'uppercase',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                            onClick={() => removeItem(item.id)}
                            onMouseEnter={(e) => {
                              e.target.style.textDecoration = 'none';
                              e.target.style.color = '#3b82f6';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.textDecoration = 'none';
                              e.target.style.color = '#6b7280';
                            }}
                          >
                            REMOVE
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Checkout Button Below Cart Items */}
                  <div style={{ padding: '24px 24px 48px 24px', textAlign: 'center' }}>
                    <button
                      className="place-order-btn w-full max-w-md px-4 py-3 rounded text-base font-semibold"
                      onClick={() => navigate('/checkout')}
                    >
                      Proceed to Checkout
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Pricing Summary Container */}
            <div className="pricing-summary md:w-1/3 bg-white p-8 shadow-sm">
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '20px', textAlign: 'center' }}>
                PRICE DETAILS
              </h3>
              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', color: '#4b5563', marginBottom: '16px' }}>
                  <span>Price ({cart.length} item{cart.length > 1 ? 's' : ''})</span>
                  <span style={{ color: '#1f2937' }}>₹{calculateOriginalTotal()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', color: '#4b5563', marginBottom: '16px' }}>
                  <span>Discount</span>
                  <span style={{ color: '#22c55e' }}>− ₹{calculateDiscount()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', color: '#4b5563', marginBottom: '16px' }}>
                  <span>Coupons for you</span>
                  <span style={{ color: '#22c55e' }}>
                    − ₹{cart.reduce((total, item) => total + (item.couponDiscount || 0), 0).toFixed(2)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', color: '#4b5563', marginBottom: '16px' }}>
                  <span>Platform Fee</span>
                  <span style={{ color: '#1f2937' }}>₹5</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', color: '#4b5563', marginBottom: '16px' }}>
                  <span>Delivery Charges</span>
                  <span style={{ color: '#22c55e' }}>Free</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', borderTop: '1px solid #e5e7eb', paddingTop: '16px', marginTop: '16px', marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px' }}>
                  <span>Total Amount</span>
                  <span>₹{calculateTotal()}</span>
                </div>
                <p style={{ fontSize: '1rem', color: '#22c55e', fontWeight: '500', textAlign: 'center', marginBottom: '24px' }}>
                  YOU WILL SAVE ₹{calculateSavings()} ON THIS ORDER
                </p>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', textAlign: 'center' }}>
                  Safe and Secure Payments. Easy returns. 100% Authentic products.
                </p>
              </div>
            </div>
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

      <style>
        {`
          .font-segoe {
            font-family: 'Segoe UI', sans-serif;
          }
          .animate-fade-out {
            animation: fadeOut 0.5s forwards 2s;
          }
          @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
          }
          .cart-content {
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
          }
          .cart-items {
            display: flex;
            flex-direction: row;
            width: 100%;
            max-width: 100%;
            margin: 0;
            box-sizing: border-box;
            gap: 16px;
          }
          .cart-items-list {
            width: calc(67% - 8px);
            flex-shrink: 0;
          }
          .cart-item {
            width: 100%;
            flex-shrink: 0;
          }
          .pricing-summary {
            width: calc(33% - 8px);
            background-color: white;
            flex-shrink: 0;
          }
          .place-order-btn {
            background: linear-gradient(90deg, #472f2f, #472f2f);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            border: none;
            font-size: 16px;
            font-weight: 500;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            cursor: pointer;
          }
          .place-order-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            background: linear-gradient(90deg, #b45f06, #8f4b05);
          }
          .place-order-btn:active {
            transform: scale(0.98);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          @media (max-width: 767px) {
            .cart-items {
              flex-direction: column;
              gap: 16px;
            }
            .cart-items-list {
              width: 100%;
            }
            .pricing-summary {
              width: 100%;
            }
          }
        `}
      </style>
    </div>
  );
};

export default Cart;