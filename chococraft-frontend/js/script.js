async function getProductsFromStorage() {
  try {
    const response = await fetch('http://localhost:3000/products');
    if (!response.ok) throw new Error('Failed to fetch products');
    const products = await response.json();
    localStorage.setItem('products', JSON.stringify(products));
    return products;
  } catch (e) {
    console.error('Error fetching products:', e);
    return JSON.parse(localStorage.getItem('products')) || [];
  }
}

async function getUserCart() {
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  if (!userId || !token) {
    return [];
  }

  try {
    const response = await fetch('http://localhost:3000/api/cart', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch cart');
    const cartItems = await response.json();
    return cartItems.map(item => ({
      id: item.productId._id,
      name: item.productId.name,
      price: item.productId.price,
      image: item.productId.image_url,
      stock: item.productId.stock,
      quantity: item.quantity,
    }));
  } catch (e) {
    console.error('Error fetching cart:', e);
    return [];
  }
}

async function saveUserCart(cart) {
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  if (!userId || !token) {
    console.error('User not logged in');
    return;
  }

  try {
    const response = await fetch('http://localhost:3000/api/cart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ cart }),
    });
    if (!response.ok) throw new Error('Failed to save cart');
  } catch (e) {
    console.error('Error saving cart:', e);
    alert('Failed to save cart.');
  }
}

async function getFavoritesFromStorage() {
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  if (!userId || !token) {
    console.warn('No userId or token found, returning empty favorites');
    return [];
  }

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await fetch('http://localhost:3000/api/favorites', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        console.warn('Unauthorized or forbidden, redirecting to login');
        alert('Session expired. Please log in again.');
        localStorage.removeItem('userId');
        localStorage.removeItem('token');
        window.location.href = 'login.html';
        return [];
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch favorites: ${response.status} ${response.statusText}`);
      }

      const favorites = await response.json();
      if (!Array.isArray(favorites)) {
        console.error('Favorites response is not an array:', favorites);
        return [];
      }

      const mappedFavorites = favorites
        .filter(fav => fav.productId) // Ensure productId exists
        .map(fav => ({
          id: fav.productId._id,
          name: fav.productId.name,
          image: fav.productId.image_url,
          price: fav.productId.price,
          stock: fav.productId.stock,
        }));

      console.log('Fetched favorites:', mappedFavorites);
      return mappedFavorites;
    } catch (e) {
      attempt++;
      console.error(`Error fetching favorites (attempt ${attempt}/${maxRetries}):`, e);
      if (attempt === maxRetries) {
        console.error('Max retries reached, returning empty favorites');
        return [];
      }
      // Wait 1 second before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return [];
}

async function saveFavoritesToStorage(favorites) {
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  if (!userId || !token) {
    console.error('User not logged in');
    throw new Error('User not logged in');
  }

  // Since addToFavorites already adds the new favorite, we just need to save the latest one
  const newFavorite = favorites[favorites.length - 1]; // The last item is the newly added one
  try {
    const response = await fetch('http://localhost:3000/api/favorites/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ productId: newFavorite.id }),
    });

    if (response.status === 401 || response.status === 403) {
      console.warn('Unauthorized or forbidden, redirecting to login');
      alert('Session expired. Please log in again.');
      localStorage.removeItem('userId');
      localStorage.removeItem('token');
      window.location.href = 'login.html';
      throw new Error('Session expired');
    }

    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 409) {
        throw new Error('Product is already in favorites');
      } else if (response.status === 400) {
        throw new Error('Invalid product ID');
      } else {
        throw new Error(errorData.error || 'Failed to save favorite');
      }
    }

    console.log('Favorite saved successfully:', newFavorite.id);
  } catch (e) {
    console.error('Error saving favorite:', e);
    throw e;
  }
}

async function updateCartCount() {
  const cart = await getUserCart();
  const count = cart.reduce((total, item) => total + item.quantity, 0);
  document.querySelectorAll('#cart-count').forEach(el => {
    el.textContent = count;
  });
}

function displayProducts(products) {
  const grid = document.getElementById('product-grid');
  if (!grid) return;

  grid.innerHTML = products.length === 0 ? '<p>No products.</p>' : '';
  products.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <img src="${product.image_url || product.image}" alt="${product.name}">
      <h3>${product.name}</h3>
      <p>₹${product.price.toFixed(2)}</p>
      <p class="${product.stock === 0 ? 'stock-out' : ''}">
        ${product.stock > 0 ? `In Stock: ${product.stock}` : 'Out of Stock'}
      </p>
      <button class="btn add-to-cart" data-id="${product._id || product.id}" ${product.stock === 0 ? 'disabled' : ''}>Add to Cart</button>
      <button class="btn add-to-favorites" data-id="${product._id || product.id}">Add to Favorites</button>
    `;
    grid.appendChild(card);
  });

  document.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', addToCart);
  });

  document.querySelectorAll('.add-to-favorites').forEach(btn => {
    btn.addEventListener('click', addToFavorites);
  });
}

async function addToCart(event) {
  const userId = localStorage.getItem('userId');
  if (!userId) {
    alert('Please log in.');
    window.location.href = 'login.html';
    return;
  }

  const id = event.target.getAttribute('data-id');
  const products = await getProductsFromStorage();
  const product = products.find(p => (p._id || p.id) === id);
  if (!product || product.stock === 0) {
    alert('Out of stock.');
    return;
  }

  let cart = await getUserCart();
  const item = cart.find(i => i.id === id);
  if (item) {
    if (item.quantity < product.stock) {
      item.quantity += 1;
    } else {
      alert('Stock limit reached.');
      return;
    }
  } else {
    cart.push({ id: product._id || product.id, name: product.name, price: product.price, image: product.image_url || product.image, stock: product.stock, quantity: 1 });
  }

  await saveUserCart(cart);
  await updateCartCount();
  showSuccessMessage('Added to cart', 'cart-success');
}

async function addToFavorites(event) {
  const userId = localStorage.getItem('userId');
  if (!userId) {
    alert('Please log in to add to favorites.');
    window.location.href = 'login.html';
    return;
  }

  const id = event.target.getAttribute('data-id');
  console.log('Adding product to favorites:', id);
  const products = await getProductsFromStorage();
  const product = products.find(p => (p._id || p.id) === id);
  if (!product) {
    console.error(`Product with ID ${id} not found`);
    alert('Product not found.');
    return;
  }

  let favorites = await getFavoritesFromStorage();
  if (favorites.some(fav => fav.id === id)) {
    alert('Product is already in favorites.');
    return;
  }

  favorites.push({
    id: product._id || product.id,
    name: product.name,
    image: product.image_url || product.image,
    price: product.price,
    stock: product.stock,
  });

  try {
    await saveFavoritesToStorage(favorites);
    showSuccessMessage('Added to favorites', 'fav-success');
    if (window.location.pathname.includes('favorites.html') && typeof window.renderFavorites === 'function') {
      const updatedFavorites = await getFavoritesFromStorage();
      window.renderFavorites(updatedFavorites);
    }
  } catch (e) {
    console.error('Failed to add to favorites:', e.message);
    if (e.message === 'Product is already in favorites') {
      alert('Product is already in favorites.');
    } else if (e.message === 'Invalid product ID') {
      alert('Invalid product. Please try again.');
    } else if (e.message === 'Session expired') {
      // Redirect already handled in saveFavoritesToStorage
    } else {
      alert('Error updating favorites. Please try again.');
    }
  }
}

function filterProducts(term) {
  getProductsFromStorage().then(products => {
    const filtered = products.filter(p => p.name.toLowerCase().includes(term.toLowerCase()));
    displayProducts(filtered);
  });
}

function displayUpdateMarquee() {
  const marquee = document.getElementById('update-marquee');
  if (marquee) {
    fetch('http://localhost:3000/updates/latest')
      .then(response => response.json())
      .then(data => {
        marquee.textContent = data.text || 'Welcome to ChocoCraft!';
        localStorage.setItem('updateText', data.text);
      })
      .catch(() => {
        marquee.textContent = localStorage.getItem('updateText') || 'Welcome to ChocoCraft!';
      });
  }
}

function placeOrder(cart, shipping, paymentMethod) {
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  if (!userId || !token) {
    alert('Please log in.');
    window.location.href = 'login.html';
    return;
  }

  if (!shipping || !shipping.name || !shipping.address || !shipping.city || !shipping.state || !shipping.zip) {
    alert('Please provide complete shipping information.');
    return;
  }

  if (!paymentMethod) {
    alert('Please select a payment method.');
    return;
  }

  getProductsFromStorage().then(products => {
    cart.forEach(cartItem => {
      const product = products.find(p => (p._id || p.id) === cartItem.id);
      if (product) {
        product.stock -= cartItem.quantity;
        if (product.stock < 0) product.stock = 0;
      }
    });

    Promise.all(products.map(product =>
      fetch(`http://localhost:3000/products/${product._id || product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: product.stock }),
      })
    )).then(() => {
      const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const order = {
        id: 'order_' + Date.now(),
        userId,
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image
        })),
        total,
        date: new Date().toISOString(),
        shipping: {
          name: shipping.name,
          address: shipping.address,
          city: shipping.city,
          state: shipping.state,
          zip: shipping.zip
        },
        paymentMethod: paymentMethod,
        status: 'pending'
      };

      fetch('http://localhost:3000/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, items: order.items, total: order.total, shipping: order.shipping, paymentMethod: order.paymentMethod }),
      })
        .then(response => {
          if (!response.ok) throw new Error('Failed to create order');
          return response.json();
        })
        .then(() => {
          fetch('http://localhost:3000/api/cart', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ cart: [] }),
          }).then(() => {
            updateCartCount();
            localStorage.setItem('lastOrder', JSON.stringify(order));
            window.location.href = 'order-success.html';
          });
        })
        .catch(e => {
          console.error('Error placing order:', e);
          alert('Failed to place order. Please try again.');
        });
    });
  });
}

function showSuccessMessage(message, messageClass) {
  const existingMessages = document.querySelectorAll(`.${messageClass}`);
  existingMessages.forEach(msg => msg.remove());

  const successMsg = document.createElement('div');
  successMsg.className = messageClass;
  successMsg.innerHTML = `
    <span class="success-text">${message}</span>
  `;

  if (messageClass === 'signup-success') {
    const signupContent = document.querySelector('.signup-content');
    if (signupContent) {
      signupContent.appendChild(successMsg);
    } else {
      document.body.appendChild(successMsg);
    }
  } else {
    document.body.appendChild(successMsg);
  }

  successMsg.style.display = 'flex';
  setTimeout(() => {
    successMsg.classList.add('fade-out');
    setTimeout(() => successMsg.remove(), 500);
  }, 2500);
}

window.addEventListener('DOMContentLoaded', () => {
  getProductsFromStorage().then(products => displayProducts(products));
  updateCartCount();
  displayUpdateMarquee();

  const search = document.getElementById('searchInput');
  if (search) {
    search.addEventListener('input', e => filterProducts(e.target.value.trim()));
  }
});