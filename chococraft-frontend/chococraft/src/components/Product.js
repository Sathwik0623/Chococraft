import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { addToCart, showSuccessMessage, getUserCart, saveUserCart } from '../utils';

const Product = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [cartQuantity, setCartQuantity] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);

  const fetchProduct = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/products/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch product with status ${response.status}`);
      }
      const data = await response.json();
      setProduct(data);
      setError('');

      // Calculate discount percentage and amount
      const percentage = data.originalPrice && data.price
        ? ((data.originalPrice - data.price) / data.originalPrice) * 100
        : 0;
      const amount = data.originalPrice && data.price
        ? data.originalPrice - data.price
        : 0;
      setDiscountPercentage(Math.round(percentage));
      setDiscountAmount(Math.round(amount));

      console.log(`Product.js - Product: ${data.name}`, {
        originalPrice: data.originalPrice,
        price: data.price,
        discountPercentage: Math.round(percentage),
        discountAmount: Math.round(amount),
      });
    } catch (err) {
      console.error('Error fetching product:', err.message);
      setError('Failed to load product. Please try again.');
    }
  };

  const fetchCartQuantity = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    try {
      const cart = await getUserCart();
      const cartItem = cart.find(item => item.id === id);
      setCartQuantity(cartItem ? cartItem.quantity : 0);
    } catch (err) {
      console.error('Error fetching cart quantity:', err.message);
    }
  };

  useEffect(() => {
    fetchProduct();
    fetchCartQuantity();
  }, [id]);

  const addToCartHandler = async (increment = true) => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/login');
      return;
    }

    if (!product) return;

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
      console.error('Product.js - Error updating cart:', error.message);
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

  if (error) {
    return (
      <div className="error-message" style={{ color: 'red', textAlign: 'center', margin: '20px' }}>
        {error}
      </div>
    );
  }

  if (!product) {
    return <div style={{ textAlign: 'center', margin: '20px' }}>Loading...</div>;
  }

  return (
    <div className="product-detail-container" style={{ maxWidth: '800px', margin: '20px auto', padding: '20px' }}>
      {message && (
        <div className="success-message" style={{ backgroundColor: '#28a745', color: 'white', padding: '10px', marginBottom: '20px', textAlign: 'center', borderRadius: '5px' }}>
          {message}
        </div>
      )}
      <div className="product-content" style={{ display: 'flex', flexDirection: 'row', gap: '20px', flexWrap: 'wrap' }}>
        <div className="product-image" style={{ flex: '1', minWidth: '300px' }}>
          <img
            src={product.image_url ? `http://localhost:5000${product.image_url}` : 'https://via.placeholder.com/300'}
            alt={product.name}
            style={{ width: '100%', height: 'auto', maxHeight: '400px', objectFit: 'cover', borderRadius: '8px' }}
            onError={e => (e.target.src = 'https://via.placeholder.com/300')}
          />
        </div>
        <div className="product-info" style={{ flex: '1', minWidth: '300px' }}>
          <h1 style={{ fontSize: '2rem', color: '#4a2c1f', marginBottom: '10px' }}>{product.name}</h1>
          <div className="price-section" style={{ marginBottom: '15px' }}>
            {product.originalPrice && product.originalPrice > product.price ? (
              <>
                <span className="original-price" style={{ color: '#22c55e', textDecoration: 'line-through', fontSize: '1.2rem', marginRight: '10px' }}>
                  ₹{Math.round(product.originalPrice).toLocaleString('en-IN')}
                </span>
                <span className="discounted-price" style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#000000' }}>
                  ₹{Math.round(product.price).toLocaleString('en-IN')}
                </span>
                <span className="discount-percentage" style={{ color: '#22c55e', fontSize: '1.2rem', marginLeft: '10px' }}>
                  {discountPercentage}% off
                </span>
                {discountAmount >= 15000 && (
                  <div className="extra-discount" style={{ color: '#22c55e', fontSize: '1rem', marginTop: '5px' }}>
                    Extra ₹{discountAmount.toLocaleString('en-IN')} off
                  </div>
                )}
              </>
            ) : (
              <span className="discounted-price" style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#000000' }}>
                ₹{Math.round(product.price).toLocaleString('en-IN')}
              </span>
            )}
          </div>
          <p style={{ marginBottom: '10px' }}><strong>Stock:</strong> {product.stock}</p>
          {product.description && (
            <p style={{ marginBottom: '20px' }}><strong>Description:</strong> {product.description}</p>
          )}
          {cartQuantity === 0 ? (
            <button
              onClick={() => addToCartHandler(true)}
              style={{
                backgroundColor: '#4a2c1f',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '1rem',
              }}
              disabled={product.stock === 0}
            >
              {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => addToCartHandler(false)}
                style={{
                  backgroundColor: '#ccc',
                  color: 'black',
                  padding: '10px',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                -
              </button>
              <span style={{ fontSize: '1rem' }}>{cartQuantity}</span>
              <button
                onClick={() => addToCartHandler(true)}
                style={{
                  backgroundColor: '#4a2c1f',
                  color: 'white',
                  padding: '10px',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
                disabled={cartQuantity >= product.stock}
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        .product-detail-container {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .product-content {
          display: flex;
          flex-direction: row;
          gap: 20px;
          flex-wrap: wrap;
        }
        .product-image {
          flex: 1;
          min-width: 300px;
        }
        .product-info {
          flex: 1;
          min-width: 300px;
        }
        .price-section {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }
        .original-price {
          color: #22c55e;
          text-decoration: line-through;
          font-size: 1.2rem;
        }
        .discounted-price {
          font-size: 1.5rem;
          font-weight: bold;
          color: #000000;
        }
        .discount-percentage {
          color: #22c55e;
          font-size: 1.2rem;
        }
        .extra-discount {
          color: #22c55e;
          font-size: 1rem;
          margin-top: 5px;
          width: 100%;
        }
        @media (max-width: 768px) {
          .product-content {
            flex-direction: column;
            align-items: center;
          }
          .product-image,
          .product-info {
            width: 100%;
            min-width: unset;
          }
        }
      `}</style>
    </div>
  );
};

export default Product;