import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserCart, placeOrder, showSuccessMessage } from '../utils';
import './Checkout.css';

const Checkout = () => {
  const [cart, setCart] = useState([]);
  const [shipping, setShipping] = useState({
    country: 'India',
    firstName: '',
    lastName: '',
    address: '',
    addressOptional: '',
    city: '',
    state: 'Telangana',
    zip: '',
    phone: '',
    saveInfo: false,
    textUpdates: false,
  });
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery');
  const [discountCode, setDiscountCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const fetchCart = async () => {
    try {
      const response = await getUserCart('6816bad5effb5c70f845d4b3');
      const cartItems = response.map(item => ({
        id: item.id || item.productId?._id,
        name: item.name || item.productId?.name,
        quantity: item.quantity,
        price: item.price || item.productId?.price,
        size: item.size || '-',
        image: item.image || item.productId?.image_url,
      }));
      setCart(cartItems);
    } catch (error) {
      console.error('Error fetching cart:', error);
      setCart([]);
    }
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2);
  };

  const handleShippingChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'country') {
      setShipping({ ...shipping, country: value, state: '' });
    } else {
      setShipping({ ...shipping, [name]: type === 'checkbox' ? checked : value });
    }
  };

  const handlePaymentMethodChange = (e) => {
    setPaymentMethod(e.target.value);
  };

  const handleDiscountCodeChange = (e) => {
    setDiscountCode(e.target.value);
  };

  const handleApplyDiscount = (e) => {
    e.preventDefault();
    console.log('Applying discount code:', discountCode);
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    try {
      // Prepare order data
      const orderData = {
        items: cart,
        total: parseFloat(calculateTotal()),
        date: new Date().toISOString(),
      };
      
      // Save order to localStorage for OrderSuccess.js to retrieve
      localStorage.setItem('lastOrder', JSON.stringify(orderData));
      
      // Call placeOrder API
      await placeOrder(cart, shipping, paymentMethod);
      
      // Navigate to order success page
      navigate('/order-success');
    } catch (err) {
      if (err.message === 'Session expired') {
        showSuccessMessage('Your session has expired. Please log in again.', setErrorMessage);
        setTimeout(() => navigate('/login'), 2500);
      } else if (err.message.includes('Permission denied')) {
        showSuccessMessage('You do not have permission to perform this action.', setErrorMessage);
      } else if (err.message.includes('Failed to create order')) {
        showSuccessMessage('Unable to place order. Please check your shipping information and try again.', setErrorMessage);
      } else {
        showSuccessMessage(err.message, setErrorMessage);
      }
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const countries = [
    'India',
    'United States',
    'United Kingdom',
    'Canada',
    'Australia',
    'Germany',
    'France',
    'Japan',
    'China',
    'Brazil',
  ];

  const countryStates = {
    India: ['Telangana', 'Andhra Pradesh', 'Karnataka', 'Tamil Nadu', 'Maharashtra'],
    'United States': ['California', 'Texas', 'New York', 'Florida', 'Illinois'],
    'United Kingdom': ['England', 'Scotland', 'Wales', 'Northern Ireland'],
    Canada: ['Ontario', 'Quebec', 'British Columbia', 'Alberta'],
    Australia: ['New South Wales', 'Victoria', 'Queensland', 'Western Australia'],
    Germany: ['Bavaria', 'Berlin', 'Hamburg', 'Saxony'],
    France: ['Île-de-France', 'Provence-Alpes-Côte d\'Azur', 'Occitanie'],
    Japan: ['Tokyo', 'Osaka', 'Kyoto', 'Hokkaido'],
    China: ['Beijing', 'Shanghai', 'Guangdong', 'Zhejiang'],
    Brazil: ['São Paulo', 'Rio de Janeiro', 'Minas Gerais', 'Bahia'],
  };

  const statesForSelectedCountry = countryStates[shipping.country] || [];

  return (
    <div className="min-h-screen bg-gray-100 font-segoe">
      <header className="text-center py-10 bg-white shadow-md relative z-10">
        <img src="/assets/images/logo.png" alt="ChocoCraft Logo" className="h-20 mx-auto" />
        <h1 className="text-3xl font-bold text-gray-900 mt-4">Checkout</h1>
      </header>

      <main className="p-4 md:p-4 relative z-0">
        {errorMessage && (
          <div className="error-message fixed left-1/2 transform -translate-x-1/2 top-4 z-20">
            {errorMessage}
          </div>
        )}
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6">
          {/* Left Side: Shipping Address, Payment Method, and Place Order */}
          <div className="md:w-2/3 checkout-container animate-slide-in">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Shipping Address</h2>
            <form onSubmit={handlePlaceOrder}>
              <div className="form-section">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="input-group">
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={shipping.firstName}
                      onChange={handleShippingChange}
                      required
                      placeholder=" "
                      className="w-full"
                    />
                    <label htmlFor="firstName">First Name</label>
                  </div>
                  <div className="input-group">
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={shipping.lastName}
                      onChange={handleShippingChange}
                      required
                      placeholder=" "
                      className="w-full"
                    />
                    <label htmlFor="lastName">Last Name</label>
                  </div>
                </div>
                <div className="input-group">
                  <select
                    id="country"
                    name="country"
                    value={shipping.country}
                    onChange={handleShippingChange}
                    className="w-full"
                  >
                    {countries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                  <label htmlFor="country">Country/Region</label>
                </div>
                <div className="input-group">
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={shipping.address}
                    onChange={handleShippingChange}
                    required
                    placeholder=" "
                    className="w-full"
                  />
                  <label htmlFor="address">Address</label>
                </div>
                <div className="input-group">
                  <input
                    type="text"
                    id="addressOptional"
                    name="addressOptional"
                    value={shipping.addressOptional}
                    onChange={handleShippingChange}
                    placeholder=" "
                    className="w-full"
                  />
                  <label htmlFor="addressOptional">Apartment, suite, etc. (optional)</label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="input-group">
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={shipping.city}
                      onChange={handleShippingChange}
                      required
                      placeholder=" "
                      className="w-full"
                    />
                    <label htmlFor="city">City</label>
                  </div>
                  <div className="input-group">
                    <select
                      id="state"
                      name="state"
                      value={shipping.state}
                      onChange={handleShippingChange}
                      className="w-full"
                      required
                    >
                      <option value="">Select a state</option>
                      {statesForSelectedCountry.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                    <label htmlFor="state">State</label>
                  </div>
                  <div className="input-group">
                    <input
                      type="text"
                      id="zip"
                      name="zip"
                      value={shipping.zip}
                      onChange={handleShippingChange}
                      required
                      placeholder=" "
                      className="w-full"
                    />
                    <label htmlFor="zip">PIN Code</label>
                  </div>
                </div>
                <div className="input-group">
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={shipping.phone}
                    onChange={handleShippingChange}
                    required
                    placeholder=" "
                    className="w-full"
                  />
                  <label htmlFor="phone">Phone</label>
                </div>
                <div className="flex flex-col space-y-4">
                  <label className="checkbox-group">
                    <input
                      type="checkbox"
                      name="saveInfo"
                      checked={shipping.saveInfo}
                      onChange={handleShippingChange}
                    />
                    <span>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    </span>
                    Save this information for next time
                  </label>
                  <label className="checkbox-group">
                    <input
                      type="checkbox"
                      name="textUpdates"
                      checked={shipping.textUpdates}
                      onChange={handleShippingChange}
                    />
                    <span>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    </span>
                    Text me with news and offers
                  </label>
                </div>
              </div>

              {/* Payment Method Section */}
              <h2 className="text-xl font-semibold text-gray-900 mb-4 mt-8">Payment Method</h2>
              <div className="form-section border border-gray-200 rounded-lg p-4">
                <div className="flex flex-col space-y-4">
                  <label className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="Cash on Delivery"
                      checked={paymentMethod === 'Cash on Delivery'}
                      onChange={handlePaymentMethodChange}
                      className="w-5 h-5 text-blue-600"
                      required
                    />
                    <span className="text-gray-800">Cash on Delivery</span>
                  </label>
                  <label className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="Credit/Debit Card"
                      checked={paymentMethod === 'Credit/Debit Card'}
                      onChange={handlePaymentMethodChange}
                      className="w-5 h-5 text-blue-600"
                    />
                    <span className="text-gray-800">Credit/Debit Card</span>
                  </label>
                  <label className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="UPI"
                      checked={paymentMethod === 'UPI'}
                      onChange={handlePaymentMethodChange}
                      className="w-5 h-5 text-blue-600"
                    />
                    <span className="text-gray-800">UPI</span>
                  </label>
                </div>
              </div>

              {/* Enlarged Place Order Button */}
              <button
                type="submit"
                className="place-order-btn w-full mt-6 text-lg py-4"
              >
                Place Order
              </button>
            </form>
          </div>

          {/* Right Side: Order Summary */}
          <div className="md:w-1/3 checkout-container animate-slide-in order-1 md:order-2">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
            <div className="form-section">
              {cart.length === 0 ? (
                <p className="text-gray-600">Your cart is empty.</p>
              ) : (
                <>
                  <div className="order-items mb-6">
                    {cart.map(item => (
                      <div key={item.id} className="order-item-card flex items-center space-x-4 mb-4">
                        <div>
                          <img
                            src={`http://localhost:5000${item.image}`}
                            alt={item.name}
                            className="w-16 h-16 object-cover rounded"
                            onError={(e) => (e.target.src = 'https://via.placeholder.com/60')}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">{item.name}</p>
                        </div>
                        <p className="text-sm font-medium text-gray-800">₹{(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="discount-form flex items-center space-x-2 mb-6">
                    <input
                      type="text"
                      value={discountCode}
                      onChange={handleDiscountCodeChange}
                      placeholder="Discount code"
                      className="flex-1 p-2 border border-gray-300 rounded"
                    />
                    <button
                      onClick={handleApplyDiscount}
                      className="apply-discount-btn p-2 bg-gray-200 text-gray-800 rounded"
                    >
                      Apply
                    </button>
                  </div>
                  <div className="order-totals pt-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Subtotal</span>
                      <span>₹{calculateTotal()}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Shipping</span>
                      <span className="italic">Enter shipping address</span>
                    </div>
                    <div className="flex justify-between text-base font-semibold text-gray-900 mt-4">
                      <span>Total</span>
                      <span>INR ₹{calculateTotal()}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-gray-800 text-white p-4 text-center relative z-10">
        <img src="/assets/images/logo.png" alt="ChocoCraft Logo" className="h-10 mx-auto mb-2" />
        <p>© 2025 ChocoCraft. All rights reserved.</p>
        <div className="flex justify-center space-x-4 mt-2">
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

export default Checkout;