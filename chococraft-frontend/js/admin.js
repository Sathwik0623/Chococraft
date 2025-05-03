document.addEventListener('DOMContentLoaded', () => {
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  const isAdmin = localStorage.getItem('isAdmin') === 'true';

  if (!userId || !token || !isAdmin) {
    alert('Please log in as an admin to access this page.');
    window.location.href = '../html/login.html';
    return;
  }

  const adminContent = document.getElementById('admin-content');

  if (!adminContent) {
    console.error('Admin content element not found');
    return;
  }

  // Function to render different admin sections
  function renderSection(section) {
    adminContent.innerHTML = ''; // Clear previous content

    switch (section) {
      case 'orders':
        adminContent.innerHTML = `
          <div id="manage-orders" class="admin-card">
            <h3>Manage Orders</h3>
            <div id="user-orders-list"></div>
          </div>
        `;
        displayAdminOrders(); // Call the function from orders.js
        break;

      case 'add-product':
        adminContent.innerHTML = `
          <div class="admin-card" id="add-product">
            <h3>Add Product</h3>
            <form id="product-form" enctype="multipart/form-data">
              <div class="form-group">
                <label for="name">Product Name:</label>
                <input type="text" id="name" name="name" required>
              </div>
              <div class="form-group">
                <label for="price">Price (₹):</label>
                <input type="number" id="price" name="price" step="0.01" required>
              </div>
              <div class="form-group">
                <label for="stock">Stock:</label>
                <input type="number" id="stock" name="stock" required>
              </div>
              <div class="form-group">
                <label for="imageFile">Choose Photo from Computer:</label>
                <input type="file" id="imageFile" name="image" accept="image/*">
                <div id="image-preview"></div>
              </div>
              <button type="submit" class="btn">Save Product</button>
            </form>
          </div>
          <div class="admin-card" id="existing-products">
            <h3>Existing Products</h3>
            <ul id="product-list" class="product-list"></ul>
          </div>
        `;
        loadProducts();
        document.getElementById('product-form').addEventListener('submit', handleProductFormSubmission);
        break;

      case 'manage-updates':
        adminContent.innerHTML = `
          <div class="admin-card" id="manage-updates">
            <h3>Manage Updates</h3>
            <form id="update-form">
              <div class="form-group">
                <label for="update-text">Update Text:</label>
                <input type="text" id="update-text" name="update-text" placeholder="Enter update (e.g., 50% off all products above 1000 order)" required>
              </div>
              <button type="submit" class="btn">Save Update</button>
            </form>
            <h3>Manage Banners</h3>
            <form id="banner-form" enctype="multipart/form-data">
              <div class="form-group">
                <label for="banner-image">Upload Banner Image:</label>
                <input type="file" id="banner-image" name="banner-image" accept="image/*" required>
                <div id="banner-preview"></div>
              </div>
              <button type="submit" class="btn">Upload Banner</button>
            </form>
            <h4>Existing Banners</h4>
            <ul id="banner-list" class="banner-list"></ul>
          </div>
        `;
        loadBanners();
        document.getElementById('update-form').addEventListener('submit', handleUpdateFormSubmission);
        document.getElementById('banner-form').addEventListener('submit', handleBannerFormSubmission);
        break;

      case 'manage-about-us':
        adminContent.innerHTML = `
          <div class="admin-card" id="manage-about-us">
            <h3>Manage About Us</h3>
            <form id="about-us-form">
              <div class="form-group">
                <label for="about-us-text">About Us Text:</label>
                <textarea id="about-us-text" name="about-us-text" placeholder="Enter About Us content" required rows="4"></textarea>
              </div>
              <button type="submit" class="btn">Save About Us</button>
            </form>
          </div>
        `;
        document.getElementById('about-us-form').addEventListener('submit', handleAboutUsFormSubmission);
        break;

      case 'manage-contact-us':
        adminContent.innerHTML = `
          <div class="admin-card" id="manage-contact-us">
            <h3>Manage Contact Us</h3>
            <form id="contact-us-form">
              <div class="form-group">
                <label for="contact-us-text">Contact Information Text:</label>
                <textarea id="contact-us-text" name="contact-us-text" placeholder="Enter Contact Information (e.g., email, phone)" required rows="4"></textarea>
              </div>
              <button type="submit" class="btn">Save Contact Information</button>
            </form>
            <h3>User Messages</h3>
            <ul id="user-messages" class="message-list"></ul>
          </div>
        `;
        loadUserMessages();
        document.getElementById('contact-us-form').addEventListener('submit', handleContactUsFormSubmission);
        break;

      case 'existing-products':
        adminContent.innerHTML = `
          <div class="admin-card" id="existing-products">
            <h3>Existing Products</h3>
            <ul id="product-list" class="product-list"></ul>
          </div>
        `;
        loadProducts();
        break;

      default:
        adminContent.innerHTML = '<p>Please select an option from the navigation bar.</p>';
    }
  }

  // Handle navigation menu clicks
  const navMenu = document.getElementById('admin-menu');
  if (navMenu) {
    navMenu.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (link && link.href.includes('#')) {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        renderSection(targetId);
      } else if (link && link.textContent === 'Orders') {
        e.preventDefault();
        renderSection('orders');
      }
    });
  }

  // Handle product form submission
  async function handleProductFormSubmission(e) {
    e.preventDefault();
    const productForm = e.target;
    const formData = new FormData(productForm);
    const productId = productForm.dataset.productId;

    try {
      const url = productId ? `http://localhost:3000/products/${productId}` : 'http://localhost:3000/products';
      const method = productId ? 'PUT' : 'POST';

      if (method === 'PUT' && !formData.get('image')) {
        formData.delete('image');
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.status === 401 || response.status === 403) {
        alert('Session expired. Please log in again.');
        window.location.href = '../html/login.html';
        return;
      }

      const result = await response.json();
      if (response.ok) {
        showSuccessMessage(`Product ${productId ? 'updated' : 'added'} successfully!`);
        productForm.reset();
        delete productForm.dataset.productId;
        const imagePreview = document.getElementById('image-preview');
        if (imagePreview) imagePreview.innerHTML = '';
        loadProducts();
      } else {
        throw new Error(result.error || 'Failed to save product');
      }
    } catch (error) {
      console.error(`Error ${productId ? 'updating' : 'adding'} product:`, error);
      alert(`Failed to ${productId ? 'update' : 'add'} product: ${error.message}`);
    }
  }

  // Handle update form submission
  async function handleUpdateFormSubmission(e) {
    e.preventDefault();
    const updateText = document.getElementById('update-text').value.trim();
    if (!updateText) {
      alert('Please enter an update text.');
      return;
    }
    try {
      const response = await fetch('http://localhost:3000/updates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ text: updateText }),
      });

      if (response.status === 401 || response.status === 403) {
        alert('Session expired. Please log in again.');
        window.location.href = '../html/login.html';
        return;
      }

      const result = await response.json();
      if (response.ok) {
        showSuccessMessage('Update saved successfully!');
        e.target.reset();
      } else {
        throw new Error(result.error || 'Failed to save update');
      }
    } catch (error) {
      console.error('Error saving update:', error);
      alert('Failed to save update: ' + error.message);
    }
  }

  // Handle banner form submission
  async function handleBannerFormSubmission(e) {
    e.preventDefault();
    const bannerForm = e.target;
    const formData = new FormData(bannerForm);
    const bannerId = bannerForm.dataset.bannerId;

    try {
      const url = bannerId ? `http://localhost:3000/banners/${bannerId}` : 'http://localhost:3000/banners';
      const method = bannerId ? 'PUT' : 'POST';

      if (method === 'PUT' && !formData.get('banner-image')) {
        formData.delete('banner-image');
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.status === 401 || response.status === 403) {
        alert('Session expired. Please log in again.');
        window.location.href = '../html/login.html';
        return;
      }

      const result = await response.json();
      if (response.ok) {
        showSuccessMessage(`Banner ${bannerId ? 'updated' : 'added'} successfully!`);
        bannerForm.reset();
        delete bannerForm.dataset.bannerId;
        const bannerPreview = document.getElementById('banner-preview');
        if (bannerPreview) bannerPreview.innerHTML = '';
        loadBanners();
      } else {
        throw new Error(result.error || 'Failed to save banner');
      }
    } catch (error) {
      console.error(`Error ${bannerId ? 'updating' : 'adding'} banner:`, error);
      alert(`Failed to ${bannerId ? 'update' : 'add'} banner: ${error.message}`);
    }
  }

  // Handle About Us form submission
  async function handleAboutUsFormSubmission(e) {
    e.preventDefault();
    const aboutUsText = document.getElementById('about-us-text').value.trim();
    if (!aboutUsText) {
      alert('Please enter About Us content.');
      return;
    }
    try {
      const response = await fetch('http://localhost:3000/about-us', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ text: aboutUsText }),
      });

      if (response.status === 401 || response.status === 403) {
        alert('Session expired. Please log in again.');
        window.location.href = '../html/login.html';
        return;
      }

      const result = await response.json();
      if (response.ok) {
        showSuccessMessage('About Us content saved successfully!');
        e.target.reset();
      } else {
        throw new Error(result.error || 'Failed to save About Us content');
      }
    } catch (error) {
      console.error('Error saving About Us content:', error);
      alert(`Failed to save About Us content: ${error.message}`);
    }
  }

  // Handle Contact Us form submission
  async function handleContactUsFormSubmission(e) {
    e.preventDefault();
    const contactUsText = document.getElementById('contact-us-text').value.trim();
    if (!contactUsText) {
      alert('Please enter Contact Information content.');
      return;
    }
    try {
      const response = await fetch('http://localhost:3000/contact-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ text: contactUsText }),
      });

      if (response.status === 401 || response.status === 403) {
        alert('Session expired. Please log in again.');
        window.location.href = '../html/login.html';
        return;
      }

      const result = await response.json();
      if (response.ok) {
        showSuccessMessage('Contact Information saved successfully!');
        e.target.reset();
      } else {
        throw new Error(result.error || 'Failed to save Contact Information');
      }
    } catch (error) {
      console.error('Error saving Contact Information:', error);
      alert(`Failed to save Contact Information: ${error.message}`);
    }
  }

  // Load user messages from the backend
  async function loadUserMessages() {
    const userMessagesList = document.getElementById('user-messages');
    if (!userMessagesList) return;

    userMessagesList.innerHTML = '';

    try {
      const response = await fetch('http://localhost:3000/contact-messages', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        alert('Session expired. Please log in again.');
        window.location.href = '../html/login.html';
        return;
      }

      const messages = await response.json();
      if (messages.length === 0) {
        userMessagesList.innerHTML = '<li>No user messages available.</li>';
        return;
      }

      messages.forEach(message => {
        const li = document.createElement('li');
        li.innerHTML = `
          <div style="margin-bottom: 10px;">
            <strong>Name:</strong> ${message.name}<br>
            <strong>Email:</strong> ${message.email}<br>
            <strong>Message:</strong> ${message.message}<br>
            <strong>Submitted:</strong> ${new Date(message.createdAt).toLocaleString()}
          </div>
        `;
        userMessagesList.appendChild(li);
      });
    } catch (error) {
      console.error('Error loading user messages:', error);
      userMessagesList.innerHTML = '<li>Error loading user messages. Please try again later.</li>';
    }
  }

  // Load products from the backend
  async function loadProducts() {
    const productList = document.getElementById('product-list');
    if (!productList) return;

    productList.innerHTML = '';

    try {
      const response = await fetch('http://localhost:3000/products', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        alert('Session expired. Please log in again.');
        window.location.href = '../html/login.html';
        return;
      }

      const products = await response.json();
      if (products.length === 0) {
        productList.innerHTML = '<li>No products available.</li>';
        return;
      }

      products.forEach(product => {
        const li = document.createElement('li');
        li.innerHTML = `
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
            <img src="http://localhost:3000/${product.image_url}" alt="${product.name}" style="width:50px; height:50px; object-fit:cover; border-radius:5px;">
            <div>
              <strong>${product.name}</strong><br>
              ₹${product.price} | Stock: ${product.stock}
            </div>
            <button class="btn edit-btn" data-id="${product._id}">Edit</button>
            <button class="btn delete-btn" data-id="${product._id}">Delete</button>
          </div>
        `;
        productList.appendChild(li);
      });

      document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', () => editProduct(button.dataset.id));
      });
      document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', () => deleteProduct(button.dataset.id));
      });
    } catch (error) {
      console.error('Error loading products:', error);
      productList.innerHTML = '<li>Error loading products. Please try again later.</li>';
    }
  }

  // Load banners from the backend
  async function loadBanners() {
    const bannerList = document.getElementById('banner-list');
    if (!bannerList) return;

    bannerList.innerHTML = '';

    try {
      const response = await fetch('http://localhost:3000/banners', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        alert('Session expired. Please log in again.');
        window.location.href = '../html/login.html';
        return;
      }

      const banners = await response.json();
      if (banners.length === 0) {
        bannerList.innerHTML = '<li>No banners available.</li>';
        return;
      }

      banners.forEach(banner => {
        const li = document.createElement('li');
        li.innerHTML = `
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
            <img src="http://localhost:3000/${banner.image_url}" alt="Banner" style="width:100px; height:50px; object-fit:cover; border-radius:5px;">
            <button class="btn edit-banner-btn" data-id="${banner._id}">Edit</button>
            <button class="btn delete-banner-btn" data-id="${banner._id}">Delete</button>
          </div>
        `;
        bannerList.appendChild(li);
      });

      document.querySelectorAll('.edit-banner-btn').forEach(button => {
        button.addEventListener('click', () => editBanner(button.dataset.id));
      });
      document.querySelectorAll('.delete-banner-btn').forEach(button => {
        button.addEventListener('click', () => deleteBanner(button.dataset.id));
      });
    } catch (error) {
      console.error('Error loading banners:', error);
      bannerList.innerHTML = '<li>Error loading banners. Please try again later.</li>';
    }
  }

  // Edit product function
  async function editProduct(productId) {
    try {
      const response = await fetch(`http://localhost:3000/products/${productId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        alert('Session expired. Please log in again.');
        window.location.href = '../html/login.html';
        return;
      }

      const product = await response.json();
      document.getElementById('name').value = product.name;
      document.getElementById('price').value = product.price;
      document.getElementById('stock').value = product.stock;
      const imagePreview = document.getElementById('image-preview');
      if (imagePreview) {
        imagePreview.innerHTML = '';
        const img = document.createElement('img');
        img.src = `http://localhost:3000/${product.image_url}`;
        img.style.maxWidth = '150px';
        img.style.height = 'auto';
        img.style.borderRadius = '5px';
        img.style.marginTop = '10px';
        imagePreview.appendChild(img);
      }

      const productForm = document.getElementById('product-form');
      productForm.dataset.productId = productId;
      productForm.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      console.error('Error editing product:', error);
      alert(`Failed to edit product: ${error.message}`);
    }
  }

  // Edit banner function
  async function editBanner(bannerId) {
    try {
      const response = await fetch(`http://localhost:3000/banners/${bannerId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        alert('Session expired. Please log in again.');
        window.location.href = '../html/login.html';
        return;
      }

      const banner = await response.json();
      const bannerPreview = document.getElementById('banner-preview');
      if (bannerPreview) {
        bannerPreview.innerHTML = '';
        const img = document.createElement('img');
        img.src = `http://localhost:3000/${banner.image_url}`;
        img.style.maxWidth = '150px';
        img.style.height = 'auto';
        img.style.borderRadius = '5px';
        img.style.marginTop = '10px';
        bannerPreview.appendChild(img);
      }

      const bannerForm = document.getElementById('banner-form');
      bannerForm.dataset.bannerId = bannerId;
      bannerForm.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      console.error('Error editing banner:', error);
      alert(`Failed to edit banner: ${error.message}`);
    }
  }

  // Delete product function
  async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const response = await fetch(`http://localhost:3000/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        alert('Session expired. Please log in again.');
        window.location.href = '../html/login.html';
        return;
      }

      const result = await response.json();
      if (response.ok) {
        showSuccessMessage('Product deleted successfully!');
        loadProducts();
      } else {
        throw new Error(result.error || 'Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert(`Failed to delete product: ${error.message}`);
    }
  }

  // Delete banner function
  async function deleteBanner(bannerId) {
    if (!confirm('Are you sure you want to delete this banner?')) return;

    try {
      const response = await fetch(`http://localhost:3000/banners/${bannerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        alert('Session expired. Please log in again.');
        window.location.href = '../html/login.html';
        return;
      }

      const result = await response.json();
      if (response.ok) {
        showSuccessMessage('Banner deleted successfully!');
        loadBanners();
      } else {
        throw new Error(result.error || 'Failed to delete banner');
      }
    } catch (error) {
      console.error('Error deleting banner:', error);
      alert(`Failed to delete banner: ${error.message}`);
    }
  }

  // Show success message
  function showSuccessMessage(message) {
    let successMessage = document.getElementById('successMessage');
    if (!successMessage) {
      successMessage = document.createElement('div');
      successMessage.id = 'successMessage';
      successMessage.className = 'success-message';
      adminContent.prepend(successMessage);
    }
    successMessage.innerHTML = `
      <span class="checkmark-circle">✓</span>
      <span class="message-text">${message}</span>
    `;
    successMessage.style.display = 'flex';
    successMessage.classList.remove('fade-out');
    setTimeout(() => {
      successMessage.classList.add('fade-out');
      setTimeout(() => {
        successMessage.style.display = 'none';
      }, 500);
    }, 2500);
  }

  // Default to Add Product section on load
  renderSection('add-product');
});