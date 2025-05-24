import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFavoritesFromStorage, getUserCart, saveUserCart, showSuccessMessage } from '../utils';
import './Favorites.css';

const Favorites = () => {
  const [favorites, setFavorites] = useState([]);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const BASE_URL = 'http://localhost:5000';
  const FALLBACK_IMAGE = 'http://localhost:5000/uploads/placeholder.png';

  const fetchFavorites = async () => {
    const favoritesData = await getFavoritesFromStorage();
    console.log('Fetched favorites:', favoritesData);
    setFavorites(favoritesData);
  };

  const removeFavorite = async (productId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No token found, redirecting to login');
      navigate('/login');
      return;
    }

    if (!productId) {
      console.error('Cannot remove favorite: productId is undefined');
      showSuccessMessage('Error: Invalid product ID. Please try again.', setMessage);
      return;
    }

    console.log('Attempting to remove favorite with productId:', productId);

    try {
      const response = await fetch(`${BASE_URL}/api/favorites/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      console.log('Remove favorite response:', {
        status: response.status,
        statusText: response.statusText,
      });

      if (response.status === 401 || response.status === 403) {
        console.log('Unauthorized or forbidden, clearing session and redirecting to login');
        localStorage.removeItem('userId');
        localStorage.removeItem('token');
        localStorage.removeItem('isAdmin');
        navigate('/login');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to remove favorite:', errorData);
        throw new Error(`Failed to remove favorite: ${errorData.error || 'Unknown error'}`);
      }

      showSuccessMessage('Removed from Favorites', setMessage);
      const updatedFavorites = await getFavoritesFromStorage();
      setFavorites(updatedFavorites);
    } catch (e) {
      console.error('Error in removeFavorite:', e.message);
      showSuccessMessage(`Error removing favorite: ${e.message}. Please try again.`, setMessage);
    }
  };

  const addToCart = async (productId, name, price, image_url, stock) => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/login');
      return;
    }

    if (stock === 0) {
      alert('Out of stock.');
      return;
    }

    let cart = await getUserCart();
    const cartItem = cart.find(item => item.id === productId);

    if (cartItem) {
      if (cartItem.quantity < stock) {
        cartItem.quantity += 1;
      } else {
        alert('Stock limit reached.');
        return;
      }
    } else {
      cart.push({ id: productId, name, price, quantity: 1, image_url });
    }

    await saveUserCart(cart);
    showSuccessMessage('Moved to Cart', setMessage);
  };

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/login?redirectReason=favorites');
      return;
    }
    fetchFavorites();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 font-segoe">
      <header className="text-center py-8 bg-white shadow-sm">
        <img src="/assets/images/logo.png" alt="ChocoCraft Logo" className="h-16 mx-auto" />
        <h1 className="text-3xl font-bold text-gray-800 mt-4">Your Favorites</h1>
      </header>

      <main className="p-6">
        {message && (
          <div className="success-message fixed left-1/2 transform -translate-x-1/2 top-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-md animate-fade-out">
            {message}
          </div>
        )}
        <div className="favorites-content w-full">
          {favorites.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-gray-600">Your favorites list is empty.</p>
              <button
                onClick={() => navigate('/')}
                className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-md hover:scale-105"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <div className="favorites-list flex flex-col gap-4">
              {favorites.map((product, index) => {
                console.log('Product details:', {
                  name: product.name,
                  id: product.id,
                  image: product.image,
                  stock: product.stock,
                  price: product.price,
                });
                const imageUrl = product.image ? `${BASE_URL}${product.image}` : FALLBACK_IMAGE;
                console.log('Image URL for', product.name, ':', imageUrl);

                return (
                  <div
                    key={product.id || index}
                    className="favorite-item relative bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow"
                  >
                    <div className="top-right-buttons absolute top-2 right-2 flex items-start space-x-2">
                      <button
                        className={`move-to-cart-button px-3 py-1 rounded-lg text-sm font-medium transition-transform duration-200 shadow-md mt-1 ${
                          product.stock > 0
                            ? 'bg-choco-brown text-white hover:bg-choco-brown-dark hover:scale-105'
                            : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                        }`}
                        onClick={() => addToCart(product.id, product.name, product.price, product.image, product.stock)}
                        disabled={product.stock <= 0}
                      >
                        Move to Cart
                      </button>
                      <button
                        onClick={() => removeFavorite(product.id)}
                        className="delete-button focus:outline-none"
                      >
                        <i className="fas fa-trash text-lg text-gray-500 hover:text-red-500" />
                      </button>
                    </div>
                    <div className="flex items-center flex-shrink-0">
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className="w-20 h-20 object-cover rounded-lg mr-4"
                      />
                      <div className="product-details">
                        <h3 className="text-lg font-semibold text-gray-800 truncate">{product.name}</h3>
                        <p className="text-gray-900 font-medium">₹{product.price}</p>
                        <p className={`text-sm ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {product.stock > 0 ? `In Stock: ${product.stock}` : 'Out of Stock'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <footer className="bg-gray-800 text-white p-6 text-center">
        <img src="/assets/images/logo.png" alt="ChocoCraft Logo" className="h-10 mx-auto mb-3" />
        <p className="text-sm">© 2025 ChocoCraft. All rights reserved.</p>
        <div className="flex justify-center space-x-4 mt-3">
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 transition-colors">
            <i className="fab fa-facebook-f" />
          </a>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 transition-colors">
            <i className="fab fa-instagram" />
          </a>
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 transition-colors">
            <i className="fab fa-twitter" />
          </a>
        </div>
      </footer>
    </div>
  );
};

export default Favorites;