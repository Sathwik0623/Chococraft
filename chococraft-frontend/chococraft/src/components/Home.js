import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { getProductsFromStorage, getFavoritesFromStorage, displayUpdateMarquee } from '../utils';
import Product from './ProductListItem';

const Home = ({ searchTerm = '' }) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [specialCategories, setSpecialCategories] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [banners, setBanners] = useState([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [marqueeText, setMarqueeText] = useState('Welcome to ChocoCraft! Check out our latest chocolates.');
  const [navbarHeight, setNavbarHeight] = useState(72);
  const isFetchingRef = useRef(false);
  const lastRefreshRef = useRef(0);
  const location = useLocation();

  const fetchProducts = async (forceRefresh = true) => {
    try {
      const productsData = await getProductsFromStorage(forceRefresh);
      console.log('Home.js - Fetched Products:', productsData);
      setProducts(productsData);
      setFilteredProducts(productsData);
      setError('');
    } catch (err) {
      console.error('Home.js - Error fetching products:', err.message);
      setError('Failed to load products. Please try again.');
    }
  };

  const fetchBanners = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/banners');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch banners with status ${response.status}`);
      }
      const data = await response.json();
      setBanners(data);
    } catch (err) {
      console.error('Home.js - Error fetching banners:', err.message);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/categories?visible=true');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch categories with status ${response.status}`);
      }
      const data = await response.json();
      setCategories(data);
      setError('');
    } catch (err) {
      console.error('Home.js - Error fetching categories:', err.message);
      setError('Failed to load categories. Please try again.');
    }
  };

  const fetchSpecialCategories = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/public/special-categories');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch special categories with status ${response.status}`);
      }
      const data = await response.json();
      const visibleSpecialCategories = data.filter(category => category.isVisible === true);
      setSpecialCategories(visibleSpecialCategories);
      setError('');
    } catch (err) {
      console.error('Home.js - Error fetching special categories:', err.message);
      setError('Failed to load special categories. Please try again.');
    }
  };

  const fetchFavorites = async () => {
    try {
      const favoritesData = await getFavoritesFromStorage();
      console.log('Home.js - Fetched Favorites:', favoritesData);
      setFavorites(favoritesData);
    } catch (err) {
      console.error('Home.js - Error fetching favorites:', err.message);
      setError('Failed to load favorites. Please try again.');
    }
  };

  const refreshFavorites = () => {
    fetchFavorites();
  };

  const loadData = async () => {
    if (isFetchingRef.current) return;
    const now = Date.now();
    if (now - lastRefreshRef.current < 10000) return;
    isFetchingRef.current = true;
    lastRefreshRef.current = now;
    setIsLoading(true);

    try {
      const params = new URLSearchParams(location.search);
      const forceRefresh = params.get('refresh') === 'true';
      await Promise.all([
        fetchProducts(true), // Force refresh to ensure fresh data
        fetchBanners(),
        fetchCategories(),
        fetchSpecialCategories(),
        fetchFavorites(),
      ]);
      const updatedMarqueeText = await displayUpdateMarquee();
      setMarqueeText(updatedMarqueeText || 'Welcome to ChocoCraft! Check out our latest chocolates.');
    } catch (err) {
      console.error('Home.js - Error in loadData:', err.message);
      setError('Failed to load data. Please try again.');
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const calculateNavbarHeight = () => {
      const navbar = document.querySelector('nav.navbar');
      if (navbar) {
        setNavbarHeight(navbar.offsetHeight);
      }
    };
    setTimeout(calculateNavbarHeight, 500);
    window.addEventListener('resize', calculateNavbarHeight);
    return () => window.removeEventListener('resize', calculateNavbarHeight);
  }, []);

  useEffect(() => {
    loadData();
    return () => {};
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex(prevIndex => (prevIndex + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredProducts(products);
    } else {
      const lowerQuery = searchTerm.toLowerCase();
      const filtered = products.filter(
        product =>
          product.name.toLowerCase().includes(lowerQuery) ||
          (product.description && product.description.toLowerCase().includes(lowerQuery))
      );
      setFilteredProducts(filtered);
    }
  }, [searchTerm, products]);

  const productsByCategory = categories.reduce((acc, category) => {
    const categoryProducts = filteredProducts.filter(product => product.categoryId === category._id);
    acc[category._id] = categoryProducts;
    return acc;
  }, {});

  const productsBySpecialCategory = specialCategories.reduce((acc, specialCategory) => {
    const specialCategoryProducts = filteredProducts.filter(product =>
      specialCategory.productIds.some(id => product._id?.toString() === id?.toString())
    );
    acc[specialCategory._id] = specialCategoryProducts;
    return acc;
  }, {});

  const handleRefresh = () => {
    fetchProducts(true);
    fetchCategories();
    fetchSpecialCategories();
    fetchFavorites();
  };

  return (
    <div className="home-container">
      <div
        className="banner-container"
        style={{
          textAlign: 'center',
          position: 'relative',
          marginTop: `${navbarHeight}px`,
          marginBottom: 0,
          zIndex: 1,
        }}
      >
        {banners.length > 0 && (
          <div className="banner-slide">
            <img
              src={`http://localhost:5000${banners[currentBannerIndex].image_url}`}
              alt="Banner"
              style={{
                width: '100%',
                maxWidth: '100%',
                height: 'auto',
                maxHeight: '400px',
                objectFit: 'cover',
                opacity: 1,
                transition: 'opacity 0.5s ease-in-out',
              }}
              onError={e => (e.target.src = 'https://via.placeholder.com/800x200')}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '10px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '8px',
              }}
            >
              {banners.map((_, index) => (
                <span
                  key={index}
                  style={{
                    width: '10px',
                    height: '10px',
                    backgroundColor: currentBannerIndex === index ? '#007bff' : '#ccc',
                    borderRadius: '50%',
                    cursor: 'pointer',
                  }}
                  onClick={() => setCurrentBannerIndex(index)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <marquee id="update-marquee" style={{ marginTop: 0, marginBottom: 0 }}>
        {marqueeText}
      </marquee>

      <main style={{ width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
        {message && (
          <div className="success-message fixed left-1/2 transform -translate-x-1/2 top-4 bg-green-500 text-white p-2 rounded animate-fade-out">
            {message}
          </div>
        )}
        {error && (
          <div className="error-message" style={{ color: 'red', textAlign: 'center', margin: '10px 0' }}>
            {error}
          </div>
        )}
        {searchTerm && (
          <div style={{ textAlign: 'center', margin: '10px 0' }}>
            {filteredProducts.length > 0 ? (
              <p>Showing {filteredProducts.length} results for "{searchTerm}"</p>
            ) : (
              <p>No results found for "{searchTerm}"</p>
            )}
          </div>
        )}
        <section id="categories-and-products" style={{ width: '100%', maxWidth: '100%' }}>
          <button onClick={handleRefresh} className="btn" disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Refresh Data'}
          </button>
          {specialCategories.length > 0 && (
            <div id="special-categories">
              {specialCategories.map(specialCategory => (
                <div key={specialCategory._id} className="category-section" style={{ marginBottom: '20px' }}>
                  <h2 style={{ margin: '10px 0', fontSize: '1.5rem', color: '#4a2c1f' }}>
                    {specialCategory.name}
                  </h2>
                  <div
                    className="product-list"
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      flexWrap: 'nowrap',
                      gap: '20px',
                      overflowX: 'auto',
                      scrollBehavior: 'smooth',
                      padding: '10px',
                      boxSizing: 'border-box',
                      width: '100%',
                      WebkitOverflowScrolling: 'touch',
                    }}
                  >
                    {productsBySpecialCategory[specialCategory._id]?.length === 0 ? (
                      <p>No products in this special category.</p>
                    ) : (
                      productsBySpecialCategory[specialCategory._id].map(product => {
                        const discountPercentage = product.originalPrice && product.price && product.originalPrice > product.price
                          ? ((product.originalPrice - product.price) / product.originalPrice) * 100
                          : 0;
                        const discountAmount = product.originalPrice && product.price && product.originalPrice > product.price
                          ? product.originalPrice - product.price
                          : 0;
                        const isProductFavorite = favorites.some(fav => fav.id.toString() === product._id.toString());
                        console.log(`Home.js - Special Category Product: ${product.name}`, {
                          originalPrice: product.originalPrice,
                          price: product.price,
                          discountPercentage: discountPercentage.toFixed(2),
                          discountAmount: discountAmount.toFixed(2),
                          isFavorite: isProductFavorite,
                        });
                        return (
                          <div
                            key={product._id}
                            className="product-card-wrapper"
                            style={{
                              flex: '0 0 auto',
                              minWidth: '200px',
                              maxWidth: '200px',
                              height: 'auto',
                            }}
                          >
                            <Product
                              product={product}
                              isFavorite={isProductFavorite}
                              setMessage={setMessage}
                              refreshFavorites={refreshFavorites}
                              discountPercentage={discountPercentage}
                              discountAmount={discountAmount}
                            />
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {categories.length > 0 && (
            <div id="categories">
              {categories.map(category => (
                <div key={category._id} className="category-section" style={{ marginBottom: '20px' }}>
                  <h2 style={{ margin: '10px 0', fontSize: '1.5rem', color: '#4a2c1f' }}>
                    {category.name}
                  </h2>
                  <div
                    className="product-list"
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      flexWrap: 'nowrap',
                      gap: '20px',
                      overflowX: 'auto',
                      scrollBehavior: 'smooth',
                      padding: '10px',
                      boxSizing: 'border-box',
                      width: '100%',
                      WebkitOverflowScrolling: 'touch',
                    }}
                  >
                    {productsByCategory[category._id]?.length === 0 ? (
                      <p>No products in this category.</p>
                    ) : (
                      productsByCategory[category._id].map(product => {
                        const discountPercentage = product.originalPrice && product.price && product.originalPrice > product.price
                          ? ((product.originalPrice - product.price) / product.originalPrice) * 100
                          : 0;
                        const discountAmount = product.originalPrice && product.price && product.originalPrice > product.price
                          ? product.originalPrice - product.price
                          : 0;
                        const isProductFavorite = favorites.some(fav => fav.id.toString() === product._id.toString());
                        console.log(`Home.js - Category Product: ${product.name}`, {
                          originalPrice: product.originalPrice,
                          price: product.price,
                          discountPercentage: discountPercentage.toFixed(2),
                          discountAmount: discountAmount.toFixed(2),
                          isFavorite: isProductFavorite,
                        });
                        return (
                          <div
                            key={product._id}
                            className="product-card-wrapper"
                            style={{
                              flex: '0 0 auto',
                              minWidth: '200px',
                              maxWidth: '200px',
                              height: 'auto',
                            }}
                          >
                            <Product
                              product={product}
                              isFavorite={isProductFavorite}
                              setMessage={setMessage}
                              refreshFavorites={refreshFavorites}
                              discountPercentage={discountPercentage}
                              discountAmount={discountAmount}
                            />
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div
            id="products"
            style={{ marginTop: (categories.length > 0 || specialCategories.length > 0) ? '40px' : '0' }}
          >
            <h2 style={{ margin: '10px 0', fontSize: '1.5rem', color: '#4a2c1f' }}>All Products</h2>
            <div
              className="product-list"
              style={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'nowrap',
                gap: '20px',
                overflowX: 'auto',
                scrollBehavior: 'smooth',
                padding: '10px',
                boxSizing: 'border-box',
                width: '100%',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {isLoading && filteredProducts.length === 0 ? (
                <p>Loading products...</p>
              ) : filteredProducts.length === 0 ? (
                <p>No products found.</p>
              ) : (
                filteredProducts.map(product => {
                  const discountPercentage = product.originalPrice && product.price && product.originalPrice > product.price
                    ? ((product.originalPrice - product.price) / product.originalPrice) * 100
                    : 0;
                  const discountAmount = product.originalPrice && product.price && product.originalPrice > product.price
                    ? product.originalPrice - product.price
                    : 0;
                  const isProductFavorite = favorites.some(fav => fav.id.toString() === product._id.toString());
                  console.log(`Home.js - All Products - Product: ${product.name}`, {
                    originalPrice: product.originalPrice,
                    price: product.price,
                    discountPercentage: discountPercentage.toFixed(2),
                    discountAmount: discountAmount.toFixed(2),
                    isFavorite: isProductFavorite,
                  });
                  return (
                    <div
                      key={product._id}
                      className="product-card-wrapper"
                      style={{
                        flex: '0 0 auto',
                        minWidth: '200px',
                        maxWidth: '200px',
                        height: 'auto',
                      }}
                    >
                      <Product
                        product={product}
                        isFavorite={isProductFavorite}
                        setMessage={setMessage}
                        refreshFavorites={refreshFavorites}
                        discountPercentage={discountPercentage}
                        discountAmount={discountAmount}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </main>

      <footer>
        <img
          src="/assets/images/logo.png"
          alt="ChocoCraft Logo"
          className="h-10 mx-auto mb-2"
          onError={e => (e.target.src = 'https://via.placeholder.com/40')}
        />
        <p>© 2025 ChocoCraft. All rights reserved.</p>
        <div className="socials">
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
            <i className="fab fa-facebook-f" />
          </a>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
            <i className="fab fa-instagram" />
          </a>
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">
            <i className="fa-brands fa-x-twitter" />
          </a>
        </div>
      </footer>

      <style jsx>{`
        .home-container {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
          background-color: #D9C8B0;
        }

        marquee {
          background-color: #F4E8D6;
          padding: 10px 0;
          font-size: 1.1rem;
          color: #4a2c1f;
        }

        .banner-slide img {
          opacity: 1;
        }

        .product-list {
          display: flex !important;
          flex-direction: row !important;
          flex-wrap: nowrap !important;
          overflow-x: auto !important;
          overflow-y: hidden !important;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: auto;
          scrollbar-color: #4b2e2e #F4E8D6;
          width: 100%;
          box-sizing: border-box;
        }

        .product-list::-webkit-scrollbar {
          height: 10px;
          display: block !important;
        }

        .product-list::-webkit-scrollbar-thumb {
          background-color: #4b2e2e;
          border-radius: 5px;
        }

        .product-list::-webkit-scrollbar-track {
          background-color: #f1f1f1;
        }

        .product-card-wrapper {
          flex: 0 0 auto;
          transition: transform 0.3s ease;
        }

        .product-card-wrapper:hover {
          transform: scale(1.05);
        }

        .product-card-wrapper:active {
          transform: scale(1.05);
        }

        .animate-fade-out {
          animation: fadeOut 0.5s forwards 2s;
        }

        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }

        .btn {
          background-color: #4a2c1f;
          color: white;
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          margin: 10px auto;
          display: block;
        }

        .btn:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default Home;