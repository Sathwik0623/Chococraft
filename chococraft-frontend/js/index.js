const BASE_URL = 'http://localhost:3000';

// Fallback image URL for broken images
const FALLBACK_IMAGE = 'https://via.placeholder.com/140x140.png?text=No+Image';

// Update cart count
async function updateCartCount() {
  const cart = await getCartFromStorage();
  const cartCountElements = document.querySelectorAll('#cart-count');
  cartCountElements.forEach(el => {
    el.textContent = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
  });
}

// Fetch cart from backend or localStorage
async function getCartFromStorage() {
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  if (!userId || !token) {
    return JSON.parse(localStorage.getItem('cart')) || [];
  }

  try {
    const response = await fetch(`${BASE_URL}/api/cart`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('isAdmin');
      return [];
    }

    if (!response.ok) throw new Error('Failed to fetch cart');
    const cartItems = await response.json();
    const cart = cartItems.map(item => ({
      id: item.productId._id,
      name: item.productId.name,
      price: item.productId.price,
      image: item.productId.image_url,
      quantity: item.quantity,
    }));
    localStorage.setItem('cart', JSON.stringify(cart));
    return cart;
  } catch (e) {
    console.error('Error fetching cart from backend:', e);
    return JSON.parse(localStorage.getItem('cart')) || [];
  }
}

// Debounce utility to limit the frequency of cart save requests
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Save cart to backend and localStorage with debouncing
const debouncedSaveCartToStorage = debounce(async (cart) => {
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  if (userId && token) {
    try {
      const cartPayload = cart.map(item => ({
        productId: item.id,
        quantity: item.quantity,
      }));
      const response = await fetch(`${BASE_URL}/api/cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ cart: cartPayload }),
      });

      if (response.status === 401 || response.status === 403) {
        alert('Session expired. Please log in again.');
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('isAdmin');
        window.location.href = 'login.html';
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save cart: ${response.status} - ${errorText}`);
      }
    } catch (e) {
      console.error('Error saving cart to backend:', e.message);
      alert('Failed to save cart. Changes may not persist.');
    }
  }

  localStorage.setItem('cart', JSON.stringify(cart));
  await updateCartCount();
}, 500);

// Wrapper function to use the debounced version
async function saveCartToStorage(cart) {
  debouncedSaveCartToStorage(cart);
}

// Fetch user's favorites from backend with retry logic
async function fetchFavorites() {
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  if (!userId || !token) {
    return [];
  }

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await fetch(`${BASE_URL}/api/favorites`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('isAdmin');
        alert('Session expired. Please log in again.');
        window.location.href = 'login.html';
        return [];
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch favorites: ${response.status}`);
      }

      const favorites = await response.json();
      return favorites.map(fav => fav.productId._id);
    } catch (e) {
      attempt++;
      console.error(`Error fetching favorites (attempt ${attempt}/${maxRetries}):`, e);
      if (attempt === maxRetries) {
        console.error('Max retries reached for fetching favorites');
        return [];
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return [];
}

// Toggle favorite status
async function toggleFavorite(productId) {
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  if (!userId || !token) {
    showFavoritesLoginMessage();
    return false;
  }

  try {
    const favorites = await fetchFavorites();
    const isFavorited = favorites.includes(productId);

    if (isFavorited) {
      const response = await fetch(`${BASE_URL}/api/favorites/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        alert('Session expired. Please log in again.');
        window.location.href = 'login.html';
        return false;
      }

      if (!response.ok) throw new Error('Failed to remove favorite');
      showFavoriteMessage('Removed from Favorites');
      return false;
    } else {
      const response = await fetch(`${BASE_URL}/api/favorites/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ productId }),
      });

      if (response.status === 401 || response.status === 403) {
        alert('Session expired. Please log in again.');
        window.location.href = 'login.html';
        return false;
      }

      if (response.status === 409) {
        showFavoriteMessage('Product already in favorites');
        return true;
      }

      if (!response.ok) throw new Error('Failed to add favorite');
      showFavoriteMessage('Added to Favorites');
      return true;
    }
  } catch (e) {
    console.error('Error toggling favorite:', e);
    showFavoriteMessage('Error updating favorites. Please try again.');
    return null;
  }
}

// Fetch and display products from backend
async function displayProducts() {
  console.log('Starting displayProducts function');
  const productGrid = document.getElementById('product-list');
  if (!productGrid) {
    console.error('product-list element not found');
    return;
  }

  productGrid.innerHTML = '<p>Loading products...</p>';

  try {
    console.log('Fetching products from', `${BASE_URL}/products`);
    const response = await fetch(`${BASE_URL}/products`);
    if (!response.ok) throw new Error('Failed to fetch products');
    const products = await response.json();
    console.log('Products fetched:', products);

    if (!products.length) {
      productGrid.innerHTML = '<p>No products available.</p>';
      return;
    }

    const favoriteIds = await fetchFavorites();

    productGrid.innerHTML = '';

    for (const product of products) {
      console.log(`Processing product: ${product.name}, image_url: ${product.image_url}`);
      const productCard = document.createElement('div');
      productCard.className = 'product-card';

      const isFavorited = favoriteIds.includes(product._id);
      const heartClass = isFavorited ? 'fas fa-heart favorited' : 'far fa-heart';

      const img = document.createElement('img');
      const imageUrl = `${BASE_URL}/${product.image_url}`;
      console.log(`Attempting to load image for ${product.name}: ${imageUrl}`);

      const imgTest = new Image();
      imgTest.src = imageUrl;
      const imageLoaded = await new Promise(resolve => {
        imgTest.onload = () => resolve(true);
        imgTest.onerror = () => {
          console.error(`Pre-fetch failed for ${product.name}: ${imageUrl}`);
          resolve(false);
        };
      });

      img.src = imageLoaded ? imageUrl : FALLBACK_IMAGE;
      img.alt = product.name;
      img.style.width = '100%';
      img.style.height = '140px';
      img.style.objectFit = 'cover';
      img.style.objectPosition = 'center';
      img.onerror = () => {
        console.error(`Failed to load image for ${product.name}: ${img.src}`);
        img.src = FALLBACK_IMAGE;
      };
      img.onload = () => {
        console.log(`Image loaded successfully for ${product.name}: ${img.src}`);
      };

      productCard.appendChild(img);
      productCard.innerHTML += `
        <div class="heart-icon">
          <i class="${heartClass}" data-id="${product._id}"></i>
        </div>
        <h3>${product.name}</h3>
        <p class="price">₹${product.price}</p>
        <p class="stock-status">${product.stock > 0 ? `In Stock: ${product.stock}` : '<span class="stock-out">Out of Stock</span>'}</p>
        <button class="btn add-to-cart" data-id="${product._id}" ${product.stock <= 0 ? 'disabled' : ''}>Add to Cart</button>
      `;

      productCard.querySelector('.add-to-cart').addEventListener('click', () => addToCart(product._id, product.name, product.price, product.image_url, product.stock));

      const heartIcon = productCard.querySelector('.heart-icon i');
      heartIcon.addEventListener('click', async () => {
        const newFavoritedState = await toggleFavorite(product._id);
        if (newFavoritedState !== null) {
          heartIcon.className = newFavoritedState ? 'fas fa-heart favorited' : 'far fa-heart';
          const updatedFavoriteIds = await fetchFavorites();
          document.querySelectorAll('.heart-icon i').forEach(icon => {
            const id = icon.dataset.id;
            icon.className = updatedFavoriteIds.includes(id) ? 'fas fa-heart favorited' : 'far fa-heart';
          });
        }
      });

      productGrid.appendChild(productCard);
    }
  } catch (error) {
    console.error('Error fetching products:', error);
    productGrid.innerHTML = '<p>Error loading products. Please try again later.</p>';
  }
}

// Add product to cart
async function addToCart(id, name, price, image_url, stock) {
  const userId = localStorage.getItem('userId');
  if (!userId) {
    showLoginMessage();
    return;
  }

  if (stock === 0) {
    alert('Out of stock.');
    return;
  }

  let cart = await getCartFromStorage();
  const cartItem = cart.find(item => item.id === id);

  if (cartItem) {
    if (cartItem.quantity < stock) {
      cartItem.quantity += 1;
    } else {
      alert('Stock limit reached.');
      return;
    }
  } else {
    cart.push({ id, name, price, quantity: 1, image: image_url });
  }

  await saveCartToStorage(cart);
  showSuccessMessage('Added to Cart');
}

// Show success message for cart actions
function showSuccessMessage(message) {
  const successMessage = document.getElementById('successMessage');
  if (successMessage) {
    successMessage.textContent = message;
    successMessage.style.display = 'block';
    successMessage.style.position = 'fixed';
    successMessage.style.left = '50%';
    successMessage.style.transform = 'translateX(-50%)';
    successMessage.style.top = '10px';
    successMessage.classList.remove('fade-out');
    setTimeout(() => {
      successMessage.classList.add('fade-out');
      setTimeout(() => {
        successMessage.style.display = 'none';
        successMessage.style.position = '';
        successMessage.style.left = '';
        successMessage.style.transform = '';
        successMessage.style.top = '';
      }, 500);
    }, 2500);
  }
}

// Show success message for favorite actions
function showFavoriteMessage(message) {
  const favoriteMessage = document.getElementById('favoriteMessage');
  if (favoriteMessage) {
    favoriteMessage.textContent = message;
    favoriteMessage.style.display = 'block';
    favoriteMessage.style.position = 'fixed';
    favoriteMessage.style.left = '50%';
    favoriteMessage.style.transform = 'translateX(-50%)';
    favoriteMessage.style.top = '10px';
    favoriteMessage.classList.remove('fade-out');
    setTimeout(() => {
      favoriteMessage.classList.add('fade-out');
      setTimeout(() => {
        favoriteMessage.style.display = 'none';
        favoriteMessage.style.position = '';
        favoriteMessage.style.left = '';
        favoriteMessage.style.transform = '';
        favoriteMessage.style.top = '';
      }, 500);
    }, 2500);
  }
}

// Show message for favorites login prompt
function showFavoritesLoginMessage() {
  const favoritesMessage = document.getElementById('favoritesMessage');
  if (favoritesMessage) {
    favoritesMessage.textContent = 'Please login to view your list';
    favoritesMessage.style.display = 'block';
    favoritesMessage.style.position = 'fixed';
    favoritesMessage.style.left = '50%';
    favoritesMessage.style.transform = 'translateX(-50%)';
    favoritesMessage.style.top = '10px';
    favoritesMessage.classList.remove('fade-out');
    setTimeout(() => {
      favoritesMessage.classList.add('fade-out');
      setTimeout(() => {
        favoritesMessage.style.display = 'none';
        favoritesMessage.style.position = '';
        favoritesMessage.style.left = '';
        favoritesMessage.style.transform = '';
        favoritesMessage.style.top = '';
        window.location.href = 'login.html?redirectReason=addFavorite';
      }, 500);
    }, 2500);
  } else {
    window.location.href = 'login.html?redirectReason=addFavorite';
  }
}

// Show message for login prompt when adding to cart
function showLoginMessage() {
  const loginMessage = document.getElementById('loginMessage');
  if (loginMessage) {
    loginMessage.textContent = 'Please log in to add items to your cart';
    loginMessage.style.display = 'block';
    loginMessage.style.position = 'fixed';
    loginMessage.style.left = '50%';
    loginMessage.style.transform = 'translateX(-50%)';
    loginMessage.style.top = '10px';
    loginMessage.classList.remove('fade-out');
    setTimeout(() => {
      loginMessage.classList.add('fade-out');
      setTimeout(() => {
        loginMessage.style.display = 'none';
        loginMessage.style.position = '';
        loginMessage.style.left = '';
        loginMessage.style.transform = '';
        loginMessage.style.top = '';
        window.location.href = 'login.html';
      }, 500);
    }, 2500);
  } else {
    window.location.href = 'login.html';
  }
}

// Display update in marquee
async function displayUpdateMarquee() {
  const updateMarquee = document.getElementById('update-bar');
  if (updateMarquee) {
    try {
      const response = await fetch(`${BASE_URL}/updates/latest`);
      if (!response.ok) throw new Error('Failed to fetch update');
      const update = await response.json();
      updateMarquee.innerHTML = `<marquee>${update.text}</marquee>`;
    } catch (error) {
      console.error('Error fetching update:', error);
      updateMarquee.innerHTML = '<marquee>Welcome to ChocoCraft! Check out our latest chocolates.</marquee>';
    }
  }
}

// Load banners
async function loadBanners() {
  try {
    const response = await fetch(`${BASE_URL}/banners`);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const banners = await response.json();
    console.log('Banners fetched:', banners);
    return banners;
  } catch (error) {
    console.error('Error loading banners:', error);
    return [];
  }
}

// Initialize banner slideshow
async function initBannerSlideshow() {
  const bannerSection = document.getElementById('banner-section');
  const welcomeSection = document.getElementById('welcome-section');
  const bannerContainer = document.getElementById('banner-container');
  const prevButton = document.getElementById('prev-banner');
  const nextButton = document.getElementById('next-banner');

  if (!bannerSection || !welcomeSection || !bannerContainer || !prevButton || !nextButton) {
    console.error('Banner elements not found');
    return;
  }

  const banners = await loadBanners();
  console.log('Number of banners:', banners.length);

  if (banners.length === 0) {
    welcomeSection.style.display = 'block';
    bannerContainer.style.display = 'none';
    console.log('No banners, showing welcome section');
    return;
  }

  banners.forEach((banner, index) => {
    const bannerItem = document.createElement('div');
    bannerItem.className = 'banner-item';
    bannerItem.style.display = index === 0 ? 'block' : 'none';
    const img = document.createElement('img');
    img.src = `${BASE_URL}/${banner.image_url}`;
    img.alt = 'Banner';
    img.onerror = () => {
      console.error(`Failed to load banner image: ${img.src}`);
      img.src = FALLBACK_IMAGE;
    };
    bannerItem.appendChild(img);
    bannerContainer.appendChild(bannerItem);
    console.log(`Added banner item ${index}:`, `${BASE_URL}/${banner.image_url}`);
  });

  welcomeSection.style.display = 'none';
  bannerContainer.style.display = 'block';
  console.log('Banner section displayed');

  let currentIndex = 0;
  const bannerItems = document.querySelectorAll('.banner-item');
  console.log('Banner items found:', bannerItems.length);

  function showBanner(index) {
    bannerItems.forEach((item, i) => {
      item.style.display = i === index ? 'block' : 'none';
    });
  }

  function nextBanner() {
    currentIndex = (currentIndex + 1) % bannerItems.length;
    showBanner(currentIndex);
  }

  function prevBanner() {
    currentIndex = (currentIndex - 1 + bannerItems.length) % bannerItems.length;
    showBanner(currentIndex);
  }

  setInterval(nextBanner, 5000);
  nextButton.addEventListener('click', nextBanner);
  prevButton.addEventListener('click', prevBanner);
}

// Search functionality with better UX
async function handleSearch(searchTerm) {
  const productGrid = document.getElementById('product-list');
  if (!productGrid) return;

  try {
    const response = await fetch(`${BASE_URL}/products`);
    if (!response.ok) throw new Error('Failed to fetch products');
    const products = await response.json();

    const filteredProducts = products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filteredProducts.length === 0) {
      productGrid.innerHTML = '<p>No products match your search.</p>';
      return;
    }

    productGrid.innerHTML = '';
    const favoriteIds = await fetchFavorites();

    for (const product of filteredProducts) {
      const productCard = document.createElement('div');
      productCard.className = 'product-card';

      const isFavorited = favoriteIds.includes(product._id);
      const heartClass = isFavorited ? 'fas fa-heart favorited' : 'far fa-heart';

      const img = document.createElement('img');
      const imageUrl = `${BASE_URL}/${product.image_url}`;
      const imgTest = new Image();
      imgTest.src = imageUrl;
      const imageLoaded = await new Promise(resolve => {
        imgTest.onload = () => resolve(true);
        imgTest.onerror = () => resolve(false);
      });

      img.src = imageLoaded ? imageUrl : FALLBACK_IMAGE;
      img.alt = product.name;
      img.style.width = '100%';
      img.style.height = '140px';
      img.style.objectFit = 'cover';
      img.style.objectPosition = 'center';
      img.onerror = () => (img.src = FALLBACK_IMAGE);

      productCard.appendChild(img);
      productCard.innerHTML += `
        <div class="heart-icon">
          <i class="${heartClass}" data-id="${product._id}"></i>
        </div>
        <h3>${product.name}</h3>
        <p class="price">₹${product.price}</p>
        <p class="stock-status">${product.stock > 0 ? `In Stock: ${product.stock}` : '<span class="stock-out">Out of Stock</span>'}</p>
        <button class="btn add-to-cart" data-id="${product._id}" ${product.stock <= 0 ? 'disabled' : ''}>Add to Cart</button>
      `;

      productCard.querySelector('.add-to-cart').addEventListener('click', () => addToCart(product._id, product.name, product.price, product.image_url, product.stock));

      const heartIcon = productCard.querySelector('.heart-icon i');
      heartIcon.addEventListener('click', async () => {
        const newFavoritedState = await toggleFavorite(product._id);
        if (newFavoritedState !== null) {
          heartIcon.className = newFavoritedState ? 'fas fa-heart favorited' : 'far fa-heart';
          const updatedFavoriteIds = await fetchFavorites();
          document.querySelectorAll('.heart-icon i').forEach(icon => {
            const id = icon.dataset.id;
            icon.className = updatedFavoriteIds.includes(id) ? 'fas fa-heart favorited' : 'far fa-heart';
          });
        }
      });

      productGrid.appendChild(productCard);
    }
  } catch (error) {
    console.error('Error during search:', error);
    productGrid.innerHTML = '<p>Error searching products. Please try again.</p>';
  }
}

// Initialize page
window.addEventListener('DOMContentLoaded', async () => {
  console.log('Index page loaded');
  await displayProducts();
  await updateCartCount();
  await displayUpdateMarquee();
  await initBannerSlideshow();

  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => handleSearch(e.target.value.trim()));
  }
});