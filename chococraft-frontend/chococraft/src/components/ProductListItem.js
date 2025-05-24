import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { addToCart, showSuccessMessage, getUserCart, saveUserCart } from '../utils';

const ProductListItem = ({ product, isFavorite, setMessage, refreshFavorites, discountPercentage, discountAmount }) => {
  const navigate = useNavigate();
  const [cartQuantity, setCartQuantity] = useState(0);

  // Fallback values to prevent undefined errors
  const safeOriginalPrice = Number(product.originalPrice) || Number(product.price) || 0;
  const safePrice = Number(product.price) || 0;
  const safeDiscountPercentage = Number(discountPercentage) || 0;
  const safeDiscountAmount = Number(discountAmount) || 0;

  console.log(`ProductListItem - Product: ${product.name}`, {
    originalPrice: safeOriginalPrice,
    price: safePrice,
    discountPercentage: safeDiscountPercentage,
    discountAmount: safeDiscountAmount,
    hasDiscount: safeDiscountPercentage > 0,
  });

  const fetchCartQuantity = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    try {
      const cart = await getUserCart();
      const cartItem = cart.find(item => item.id === product._id);
      setCartQuantity(cartItem ? cartItem.quantity : 0);
    } catch (error) {
      console.error('Error fetching cart quantity:', error.message);
    }
  };

  useEffect(() => {
    fetchCartQuantity();
  }, []);

  const handleClick = () => {
    navigate(`/product/${product._id}`);
  };

  const addToCartHandler = async (increment = true) => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/login');
      return;
    }

    if (product.stock === 0) {
      showSuccessMessage('Out of stock.', setMessage);
      return;
    }

    try {
      let cart = await getUserCart();
      const cartItem = cart.find(item => item.id === product._id);

      if (increment) {
        if (cartItem) {
          if (cartItem.quantity >= product.stock) {
            showSuccessMessage('Stock limit reached for this item.', setMessage);
            return;
          }
          cartItem.quantity += 1;
        } else {
          const itemData = {
            id: product._id,
            name: product.name,
            price: product.price,
            image: product.image_url || '',
            stock: product.stock,
            originalPrice: product.originalPrice,
            quantity: 1,
          };
          cart.push(itemData);
        }
        showSuccessMessage('Added to Cart', setMessage);
      } else {
        if (cartItem) {
          cartItem.quantity -= 1;
          if (cartItem.quantity <= 0) {
            cart = cart.filter(item => item.id !== product._id);
          }
          showSuccessMessage('Removed from Cart', setMessage);
        }
      }

      await saveUserCart(cart);
      setCartQuantity(increment ? cartQuantity + 1 : cartQuantity - 1);
    } catch (error) {
      console.error('ProductListItem.js - Error updating cart:', error.message);
      let errorMessage = 'Error updating cart. Please try again.';
      if (error.message.includes('Product with ID')) {
        errorMessage = 'Product not found. It may have been removed.';
      } else if (error.message.includes('Stock limit')) {
        errorMessage = 'Stock limit reached for this item.';
      } else if (error.message.includes('User not logged in')) {
        errorMessage = 'Please log in to add items to your cart.';
        navigate('/login');
      }
      showSuccessMessage(errorMessage, setMessage);
    }
  };

  const toggleFavorite = async () => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    if (!token || !userId) {
      navigate('/login');
      return;
    }

    try {
      if (isFavorite) {
        const response = await fetch(`http://localhost:5000/api/favorites/${product._id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('userId');
          localStorage.removeItem('token');
          localStorage.removeItem('isAdmin');
          navigate('/login');
          return;
        }

        if (!response.ok) throw new Error('Failed to remove favorite');
        showSuccessMessage('Removed from Favorites', setMessage);
      } else {
        const response = await fetch(`http://localhost:5000/api/favorites/add`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ productId: product._id }),
        });

        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('userId');
          localStorage.removeItem('token');
          localStorage.removeItem('isAdmin');
          navigate('/login');
          return;
        }

        if (!response.ok) throw new Error('Failed to add favorite');
        showSuccessMessage('Added to Favorites', setMessage);
      }

      if (refreshFavorites) {
        refreshFavorites();
      }
    } catch (error) {
      showSuccessMessage('Error updating favorite. Please try again.', setMessage);
    }
  };

  return (
    <div
      className="product-item"
      style={{
        width: '200px',
        padding: '10px',
        border: '1px solid #ccc',
        textAlign: 'center',
        opacity: product.stock === 0 ? 0.6 : 1, // Lightened effect when out of stock
        pointerEvents: product.stock === 0 ? 'auto' : 'auto', // Still allow interaction for favoriting
      }}
    >
      <div className="image-container" style={{ position: 'relative', width: '100%', height: '150px' }}>
        <img
          src={product.image_url ? `http://localhost:5000${product.image_url}` : 'https://placehold.co/150x150.png?text=No+Image'}
          alt={product.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => (e.target.src = 'https://placehold.co/150x150.png?text=No+Image')}
        />
        <button
          onClick={toggleFavorite}
          className="focus:outline-none"
          style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            left: 'auto',
            background: '#fff',
            border: 'none',
            cursor: 'pointer',
            zIndex: 10,
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
          }}
        >
          <i
            className={isFavorite ? 'fas fa-heart animate-heart' : 'far fa-heart animate-heart'}
            style={{ fontSize: '0.875rem', color: isFavorite ? 'red' : 'gray' }}
          />
        </button>
      </div>
      <h3 style={{ cursor: 'pointer', margin: '10px 0' }} onClick={handleClick}>{product.name}</h3>
      <div className="price-section mt-2">
        {safeDiscountPercentage > 0 ? (
          <>
            <span className="original-price">
              ₹{safeOriginalPrice.toFixed(2).toLocaleString('en-IN')}
            </span>
            <span className="discounted-price mx-2">
              ₹{safePrice.toFixed(2).toLocaleString('en-IN')}
            </span>
            <span className="discount-percentage">
              {safeDiscountPercentage.toFixed(0)}% off
            </span>
            {safeDiscountAmount >= 150 && (
              <div className="extra-discount mt-1">
                Extra ₹{safeDiscountAmount.toFixed(2).toLocaleString('en-IN')} off
              </div>
            )}
          </>
        ) : (
          <span className="discounted-price">
            ₹{safePrice.toFixed(2).toLocaleString('en-IN')}
          </span>
        )}
      </div>
      <p>Stock: {product.stock}</p>
      {product.description && <p>{product.description}</p>}
      {product.stock === 0 ? (
        <div
          className="out-of-stock"
          style={{
            color: '#ef4444', // Red color for "Out of Stock" text
            fontWeight: 'bold',
            marginTop: '10px',
          }}
        >
          Out of Stock
        </div>
      ) : cartQuantity === 0 ? (
        <button
          onClick={(e) => { e.stopPropagation(); addToCartHandler(true); }}
          style={{ backgroundColor: '#532A02', color: 'white', padding: '5px 10px', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '10px' }}
        >
          Add to Cart
        </button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '10px', gap: '5px' }}>
          <button
            onClick={(e) => { e.stopPropagation(); addToCartHandler(false); }}
            style={{ backgroundColor: '#ccc', color: 'black', padding: '5px 10px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            -
          </button>
          <span style={{ padding: '0 10px' }}>{cartQuantity}</span>
          <button
            onClick={(e) => { e.stopPropagation(); addToCartHandler(true); }}
            style={{ backgroundColor: '#532A02', color: 'white', padding: '5px 10px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            +
          </button>
        </div>
      )}
      <style jsx>{`
        .animate-heart {
          transition: all 0.3s ease;
        }
        .animate-heart:hover {
          transform: scale(1.2);
        }
        .animate-heart:active {
          transform: scale(0.9);
        }
        .price-section {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
          min-height: 40px; /* Ensure enough space for discount info */
        }
        .original-price {
          color: #888;
          text-decoration: line-through;
          font-size: 1rem;
        }
        .discounted-price {
          font-size: 1.25rem;
          font-weight: bold;
          color: #000000;
        }
        .discount-percentage {
          color: #22c55e;
          font-size: 1rem;
        }
        .extra-discount {
          color: #22c55e;
          font-size: 0.9rem;
          margin-top: 4px;
          width: 100%;
          text-align: center;
        }
        .out-of-stock {
          cursor: not-allowed; /* Indicate that the item cannot be interacted with for adding to cart */
        }
      `}</style>
    </div>
  );
};

export default ProductListItem;