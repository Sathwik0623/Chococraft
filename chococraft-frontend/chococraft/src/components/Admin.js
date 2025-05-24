import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import OrderList from './UserOrderList';
import { invalidateProductCache, retryFetch, showSuccessMessage } from '../utils';

const Admin = ({ section: initialSection = 'dashboard' }) => {
  const [section, setSection] = useState(initialSection);
  const [products, setProducts] = useState([]);
  const [banners, setBanners] = useState([]);
  const [userMessages, setUserMessages] = useState([]);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [categories, setCategories] = useState([]);
  const [specialCategories, setSpecialCategories] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingBanner, setEditingBanner] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSpecialCategory, setEditingSpecialCategory] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [recentOrders, setRecentOrders] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    if (!userId || !token || !isAdmin) {
      setErrorMessage('Please log in as an admin to access this page.');
      setTimeout(() => navigate('/login'), 2500);
    }
  }, [userId, token, isAdmin, navigate]);

  useEffect(() => {
    const path = location.pathname;
    const sections = {
      'dashboard': 'dashboard',
      'add-product': 'add-product',
      'manage-updates': 'manage-updates',
      'manage-about-us': 'manage-about-us',
      'manage-contact-us': 'manage-contact-us',
      'existing-products': 'existing-products',
      'orders': 'orders',
      'manage-categories': 'manage-categories',
      'manage-special-categories': 'manage-special-categories',
    };
     let newSection = initialSection;
  for (const key of Object.keys(sections)) {
    if (path.includes(key)) {
      newSection = sections[key];
      break;
    }
  }
  // If path is exactly /admin or /admin/, default to dashboard
  if (path === '/admin' || path === '/admin/' || path === '/admin/dashboard') {
    newSection = 'dashboard';
  }
    setSection(newSection);
  }, [location.pathname, initialSection]);

  const loadUserMessages = useCallback(async () => {
    try {
      setIsMessagesLoading(true);
      const response = await retryFetch(`${BASE_URL}/api/contact-messages`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.status === 401 || response.status === 403) {
        setErrorMessage('Session expired. Please log in again.');
        localStorage.clear();
        setTimeout(() => navigate('/login'), 2500);
        return;
      }
      const text = await response.text();
      let messages;
      try {
        messages = JSON.parse(text);
      } catch (err) {
        throw new Error('Invalid server response');
      }
      if (!response.ok) {
        throw new Error(messages.error || `Failed to fetch messages (status: ${response.status})`);
      }
      const normalizedMessages = messages.map(msg => ({
        _id: msg._id || `temp-${Math.random()}`,
        name: msg.title ? msg.title.replace('Message from ', '') : msg.name || 'Unknown',
        email: msg.email || 'N/A',
        message: msg.message || 'No content',
        createdAt: msg.createdAt || new Date().toISOString(),
        isRead: msg.isRead ?? false,
      }));
      setUserMessages(normalizedMessages);
      setUnreadMessagesCount(normalizedMessages.filter(msg => !msg.isRead).length);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage('Failed to load messages: ' + error.message);
      setUserMessages([]);
      setUnreadMessagesCount(0);
    } finally {
      setIsMessagesLoading(false);
    }
  }, [token, navigate]);

  const markMessageAsRead = useCallback(async (messageId) => {
    try {
      const response = await retryFetch(`${BASE_URL}/api/contact-messages/${messageId}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.status === 401 || response.status === 403) {
        setErrorMessage('Session expired. Please log in again.');
        localStorage.clear();
        setTimeout(() => navigate('/login'), 2500);
        return;
      }
      if (response.status === 404) {
        console.warn('Read endpoint not found, updating client-side');
      } else if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to mark message as read: ${text}`);
      }
    } catch (error) {
      console.warn('Error marking message, proceeding client-side:', error.message);
    }
    setUserMessages(prev =>
      prev.map(msg => (msg._id === messageId ? { ...msg, isRead: true } : msg))
    );
    setUnreadMessagesCount(prev => Math.max(0, prev - 1));
  }, [token, navigate]);

  const loadProducts = useCallback(async () => {
    try {
      const response = await retryFetch(`${BASE_URL}/api/products`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.status === 401 || response.status === 403) {
        setErrorMessage('Session expired. Please log in again.');
        localStorage.clear();
        setTimeout(() => navigate('/login'), 2500);
        return;
      }
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        throw new Error('Server returned an invalid response: ' + text);
      }
      if (!response.ok) {
        throw new Error(data.error || `Failed to fetch products with status ${response.status}`);
      }
      console.log('Loaded products:', data); // Debugging
      setProducts(data);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage('Failed to load products: ' + error.message);
      setProducts([]);
    }
  }, [token, navigate]);

  const loadBanners = useCallback(async () => {
    try {
      const response = await retryFetch(`${BASE_URL}/api/banners`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.status === 401 || response.status === 403) {
        setErrorMessage('Session expired. Please log in again.');
        localStorage.clear();
        setTimeout(() => navigate('/login'), 2500);
        return;
      }
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        throw new Error('Server returned an invalid response: ' + text);
      }
      if (!response.ok) {
        throw new Error(data.error || `Failed to fetch banners with status ${response.status}`);
      }
      setBanners(data);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage('Failed to load banners: ' + error.message);
      setBanners([]);
    }
  }, [token, navigate]);

  const loadCategories = useCallback(async () => {
    try {
      const response = await retryFetch(`${BASE_URL}/api/categories`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.status === 401 || response.status === 403) {
        setErrorMessage('Session expired. Please log in again.');
        localStorage.clear();
        setTimeout(() => navigate('/login'), 2500);
        return;
      }
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        throw new Error('Server returned an invalid response: ' + text);
      }
      if (!response.ok) {
        throw new Error(data.error || `Failed to fetch categories with status ${response.status}`);
      }
      setCategories(data);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage('Failed to load categories: ' + error.message);
      setCategories([]);
    }
  }, [token, navigate]);

  const loadSpecialCategories = useCallback(async () => {
    try {
      const response = await retryFetch(`${BASE_URL}/api/special-categories`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.status === 401 || response.status === 403) {
        setErrorMessage('Session expired. Please log in again.');
        localStorage.clear();
        setTimeout(() => navigate('/login'), 2500);
        return;
      }
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        throw new Error('Server returned an invalid response: ' + text);
      }
      if (!response.ok) {
        throw new Error(data.error || `Failed to fetch special categories with status ${response.status}`);
      }
      setSpecialCategories(data);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage('Failed to load special categories: ' + error.message);
      setSpecialCategories([]);
    }
  }, [token, navigate]);

  const loadDashboardData = useCallback(async () => {
    setTotalOrders(0);
  setTotalSales(0);
  setPendingOrders(0);
  setRecentOrders([]);
  setErrorMessage('');
  setIsLoading(true);
    try {
      setIsLoading(true);
      const ordersResponse = await retryFetch(`${BASE_URL}/api/orders`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (ordersResponse.status === 401 || ordersResponse.status === 403) {
        setErrorMessage('Session expired. Please log in again.');
        localStorage.clear();
        setTimeout(() => navigate('/login'), 2500);
        return;
      }
      const ordersText = await ordersResponse.text();
      let ordersData;
      try {
        ordersData = JSON.parse(ordersText);
      } catch (err) {
        throw new Error('Server returned an invalid response for orders: ' + ordersText);
      }
      console.log('Orders data:', ordersData); // Debugging
      if (!ordersResponse.ok) {
        throw new Error(ordersData.error || `Failed to fetch orders with status ${ordersResponse.status}`);
      }

      setTotalOrders(ordersData.length || 0);
      const sales = ordersData.reduce((sum, order) => sum + (order.total || 0), 0);
      setTotalSales(sales);
      const pending = ordersData.filter(order => order.status && order.status.toLowerCase() === 'pending').length;
      setPendingOrders(pending);
      const sortedOrders = ordersData.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      const recent = sortedOrders.slice(0, 5).map(order => ({
        id: order._id ? order._id.slice(-6) : 'N/A',
        customer: order.userId?.username || 'Unknown',
        date: order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A',
        total: order.total ? `₹${order.total.toFixed(2)}` : 'N/A', // Added total
        status: order.status || 'Unknown',
      }));
      setRecentOrders(recent);
      await loadProducts();
    } catch (error) {
      console.error('Dashboard data error:', error); // Debugging
      setErrorMessage('Failed to load dashboard data: ' + error.message);
      setTotalOrders(0);
      setTotalSales(0);
      setPendingOrders(0);
      setRecentOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [token, navigate, loadProducts]);

  useEffect(() => {
    if (!isAdmin) return;
    const loadData = async () => {
      setIsLoading(true);
      try {
        await loadUserMessages();
        if (section === 'dashboard') {
          await loadDashboardData();
        }
        if (section === 'add-product' || section === 'existing-products') {
          await Promise.all([loadProducts(), loadCategories()]);
        }
        if (section === 'manage-updates') {
          await loadBanners();
        }
        if (section === 'manage-contact-us') {
          await loadUserMessages();
        }
        if (section === 'manage-categories') {
          await Promise.all([loadCategories(), loadProducts(), loadSpecialCategories()]);
        }
        if (section === 'manage-special-categories') {
          await Promise.all([loadSpecialCategories(), loadProducts()]);
        }
      } catch (err) {
        console.error('Load data error:', err); // Debugging
        setErrorMessage('Failed to load data: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [section, isAdmin, loadUserMessages, loadProducts, loadBanners, loadCategories, loadSpecialCategories, loadDashboardData]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleNavigation = (newSection) => {
    if (section === newSection && newSection === 'dashboard') {
    // Force reload dashboard data
    loadDashboardData();
    setIsSidebarOpen(true); // Ensure sidebar stays open
    return;
  }
    setSection(newSection);
    navigate(`/admin/${newSection === 'dashboard' ? 'dashboard' : newSection}`);
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }
  //  if (newSection === 'dashboard') {
  //   setTimeout(() => {
  //     loadDashboardData();
  //   }, 0);
  // }
  };

  const handleProductFormSubmission = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const productId = editingProduct?._id;
    const originalPrice = parseFloat(formData.get('originalPrice'));
    const discountedPrice = parseFloat(formData.get('price'));

    if (discountedPrice >= originalPrice) {
      setErrorMessage('Discounted price must be less than the original price.');
      return;
    }

    const categoryId = formData.get('categoryId');
    try {
      setIsLoading(true);
      const url = productId ? `${BASE_URL}/api/products/${productId}` : `${BASE_URL}/api/products`;
      const method = productId ? 'PUT' : 'POST';
      if (method === 'PUT' && !formData.get('image')) {
        formData.delete('image');
      }
      const response = await retryFetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (response.status === 401 || response.status === 403) {
        setErrorMessage('Session expired. Please log in again.');
        localStorage.clear();
        setTimeout(() => navigate('/login'), 2500);
        return;
      }
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (err) {
        throw new Error('Server returned an invalid response: ' + text);
      }
      console.log('Product submission result:', result); // Debugging
      if (!response.ok) {
        throw new Error(result.error || `Failed to save product with status ${response.status}`);
      }
      const categoryName = categoryId && categoryId !== ''
        ? categories.find(cat => cat._id === categoryId)?.name || 'Unknown'
        : 'None';
      showSuccessMessage(
        `Product ${productId ? 'updated' : 'added'} successfully${categoryId && categoryId !== '' ? ` in category "${categoryName}"` : ''}!`,
        setSuccessMessage
      );
      e.target.reset();
      setEditingProduct(null);
      invalidateProductCache();
      await loadProducts();
    } catch (error) {
      setErrorMessage(`Failed to ${productId ? 'update' : 'add'} product: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateFormSubmission = async (e) => {
    e.preventDefault();
    const updateText = e.target['update-text'].value.trim();
    if (!updateText) {
      setErrorMessage('Please enter an update text.');
      return;
    }
    try {
      setIsLoading(true);
      const response = await retryFetch(`${BASE_URL}/api/updates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ text: updateText }),
      });
      if (response.status === 401 || response.status === 403) {
        setErrorMessage('Session expired. Please log in again.');
        localStorage.clear();
        setTimeout(() => navigate('/login'), 2500);
        return;
      }
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (err) {
        throw new Error('Server returned an invalid response: ' + text);
      }
      if (!response.ok) {
        throw new Error(result.error || `Failed to save update with status ${response.status}`);
      }
      showSuccessMessage('Update saved successfully!', setSuccessMessage);
      e.target.reset();
    } catch (error) {
      setErrorMessage('Failed to save update: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationFormSubmission = async (e) => {
    e.preventDefault();
    const notificationText = e.target['notification-text'].value.trim();
    if (!notificationText) {
      setErrorMessage('Please enter a notification message.');
      return;
    }
    try {
      setIsLoading(true);
      const response = await retryFetch(`${BASE_URL}/api/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: 'ChocoCraft Update',
          message: notificationText,
        }),
      });
      if (response.status === 401 || response.status === 403) {
        setErrorMessage('Session expired. Please log in again.');
        localStorage.clear();
        setTimeout(() => navigate('/login'), 2500);
        return;
      }
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (err) {
        throw new Error('Server returned an invalid response: ' + text);
      }
      if (!response.ok) {
        throw new Error(result.error || `Failed to save notification with status ${response.status}`);
      }
      showSuccessMessage('Notification sent successfully!', setSuccessMessage);
      e.target.reset();
    } catch (error) {
      setErrorMessage('Failed to send notification: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBannerFormSubmission = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const bannerId = editingBanner?._id;

    try {
      setIsLoading(true);
      const url = bannerId ? `${BASE_URL}/api/banners/${bannerId}` : `${BASE_URL}/api/banners`;
      const method = bannerId ? 'PUT' : 'POST';
      if (method === 'PUT' && !formData.get('banner-image')) {
        formData.delete('banner-image');
      }
      const response = await retryFetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (response.status === 401 || response.status === 403) {
        setErrorMessage('Session expired. Please log in again.');
        localStorage.clear();
        setTimeout(() => navigate('/login'), 2500);
        return;
      }
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (err) {
        throw new Error('Server returned an invalid response: ' + text);
      }
      if (!response.ok) {
        throw new Error(result.error || `Failed to save banner with status ${response.status}`);
      }
      showSuccessMessage(`Banner ${bannerId ? 'updated' : 'added'} successfully!`, setSuccessMessage);
      e.target.reset();
      setEditingBanner(null);
      await loadBanners();
    } catch (error) {
      setErrorMessage(`Failed to ${bannerId ? 'update' : 'add'} banner: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAboutUsFormSubmission = async (e) => {
    e.preventDefault();
    const aboutUsText = e.target['about-us-text'].value.trim();
    if (!aboutUsText) {
      setErrorMessage('Please enter About Us content.');
      return;
    }
    try {
      setIsLoading(true);
      const response = await retryFetch(`${BASE_URL}/api/about-us`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ text: aboutUsText }),
      });
      if (response.status === 401 || response.status === 403) {
        setErrorMessage('Session expired. Please log in again.');
        localStorage.clear();
        setTimeout(() => navigate('/login'), 2500);
        return;
      }
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (err) {
        throw new Error('Server returned an invalid response: ' + text);
      }
      if (!response.ok) {
        throw new Error(result.error || `Failed to save About Us content with status ${response.status}`);
      }
      showSuccessMessage('About Us content saved successfully!', setSuccessMessage);
      e.target.reset();
    } catch (error) {
      setErrorMessage('Failed to save About Us content: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactUsFormSubmission = async (e) => {
    e.preventDefault();
    const contactUsText = e.target['contact-us-text'].value.trim();
    if (!contactUsText) {
      setErrorMessage('Please enter Contact Information content.');
      return;
    }
    try {
      setIsLoading(true);
      const response = await retryFetch(`${BASE_URL}/api/contact-info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ text: contactUsText }),
      });
      if (response.status === 401 || response.status === 403) {
        setErrorMessage('Session expired. Please log in again.');
        localStorage.clear();
        setTimeout(() => navigate('/login'), 2500);
        return;
      }
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (err) {
        throw new Error('Server returned an invalid response: ' + text);
      }
      if (!response.ok) {
        throw new Error(result.error || `Failed to save Contact Information with status ${response.status}`);
      }
      showSuccessMessage('Contact Information saved successfully!', setSuccessMessage);
      e.target.reset();
    } catch (error) {
      setErrorMessage('Failed to save Contact Information: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryFormSubmission = async (e) => {
    e.preventDefault();
    const categoryName = e.target['category-name'].value.trim();
    const isVisible = e.target['category-visible'].checked;
    const categoryId = editingCategory?._id;

    if (!categoryName) {
      setErrorMessage('Please enter a category name.');
      return;
    }

    try {
      setIsLoading(true);
      const url = categoryId ? `${BASE_URL}/api/categories/${categoryId}` : `${BASE_URL}/api/categories`;
      const method = categoryId ? 'PUT' : 'POST';
      const response = await retryFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: categoryName, isVisible }),
      });
      if (response.status === 401 || response.status === 403) {
        setErrorMessage('Session expired. Please log in again.');
        localStorage.clear();
        setTimeout(() => navigate('/login'), 2500);
        return;
      }
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (err) {
        throw new Error('Server returned an invalid response: ' + text);
      }
      if (!response.ok) {
        throw new Error(result.error || `Failed to save category with status ${response.status}`);
      }
      showSuccessMessage(`Category ${categoryId ? 'updated' : 'added'} successfully!`, setSuccessMessage);
      e.target.reset();
      setEditingCategory(null);
      await loadCategories();
    } catch (error) {
      setErrorMessage(`Failed to ${categoryId ? 'update' : 'add'} category: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpecialCategoryCreation = async (e) => {
    e.preventDefault();
    const specialCategoryName = e.target['special-category-name'].value.trim();
    const selectedProducts = Array.from(e.target['products'].selectedOptions).map(option => option.value);
    const isVisible = e.target['special-category-visibility'].value === 'Yes';

    if (!specialCategoryName) {
      setErrorMessage('Please enter a special category name.');
      return;
    }
    if (selectedProducts.length === 0) {
      setErrorMessage('Please select at least one product.');
      return;
    }

    try {
      setIsLoading(true);
      const url = `${BASE_URL}/api/special-categories`;
      const response = await retryFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: specialCategoryName, productIds: selectedProducts, isVisible }),
      });
      if (response.status === 401 || response.status === 403) {
        setErrorMessage('Session expired. Please log in again.');
        localStorage.clear();
        setTimeout(() => navigate('/login'), 2500);
        return;
      }
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (err) {
        throw new Error('Server returned an invalid response: ' + text);
      }
      if (!response.ok) {
        throw new Error(result.error || `Failed to save special category with status ${response.status}`);
      }
      showSuccessMessage('Special Category added successfully!', setSuccessMessage);
      e.target.reset();
      await loadSpecialCategories();
    } catch (error) {
      setErrorMessage('Failed to add special category: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpecialCategoryFormSubmission = async (e) => {
    e.preventDefault();
    const specialCategoryName = e.target['special-category-name'].value.trim();
    const isVisible = e.target['special-category-visible'].checked;
    const selectedProducts = Array.from(e.target['products'].selectedOptions).map(option => option.value);
    const specialCategoryId = editingSpecialCategory?._id;

    if (!specialCategoryName) {
      setErrorMessage('Please enter a special category name.');
      return;
    }
    if (selectedProducts.length === 0) {
      setErrorMessage('Please select at least one product.');
      return;
    }

    try {
      setIsLoading(true);
      const url = specialCategoryId ? `${BASE_URL}/api/special-categories/${specialCategoryId}` : `${BASE_URL}/api/special-categories`;
      const method = specialCategoryId ? 'PUT' : 'POST';
      const response = await retryFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: specialCategoryName, productIds: selectedProducts, isVisible }),
      });
      if (response.status === 401 || response.status === 403) {
        setErrorMessage('Session expired. Please log in again.');
        localStorage.clear();
        setTimeout(() => navigate('/login'), 2500);
        return;
      }
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (err) {
        throw new Error('Server returned an invalid response: ' + text);
      }
      if (!response.ok) {
        throw new Error(result.error || `Failed to save special category with status ${response.status}`);
      }
      showSuccessMessage(`Special Category ${specialCategoryId ? 'updated' : 'added'} successfully!`, setSuccessMessage);
      e.target.reset();
      setEditingSpecialCategory(null);
      await loadSpecialCategories();
    } catch (error) {
      setErrorMessage(`Failed to ${specialCategoryId ? 'update' : 'add'} special category: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const editProduct = async (productId) => {
    try {
      setIsLoading(true);
      const response = await retryFetch(`${BASE_URL}/api/products/${productId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.status === 401 || response.status === 403) {
        setErrorMessage('Session expired. Please log in again.');
        localStorage.clear();
        setTimeout(() => navigate('/login'), 2500);
        return;
      }
      const text = await response.text();
      let product;
      try {
        product = JSON.parse(text);
      } catch (err) {
        throw new Error('Server returned an invalid response: ' + text);
      }
      if (!response.ok) {
        throw new Error(product.error || `Failed to fetch product with status ${response.status}`);
      }
      setEditingProduct(product);
      navigate('/admin/add-product');
    } catch (error) {
      setErrorMessage('Failed to edit product: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const editBanner = async (bannerId) => {
    try {
      setIsLoading(true);
      const response = await retryFetch(`${BASE_URL}/api/banners/${bannerId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.status === 401 || response.status === 403) {
        setErrorMessage('Session expired. Please log in again.');
        localStorage.clear();
        setTimeout(() => navigate('/login'), 2500);
        return;
      }
      const text = await response.text();
      let banner;
      try {
        banner = JSON.parse(text);
      } catch (err) {
        throw new Error('Server returned an invalid response: ' + text);
      }
      if (!response.ok) {
        throw new Error(banner.error || `Failed to fetch banner with status ${response.status}`);
      }
      setEditingBanner(banner);
      navigate('/admin/manage-updates');
    } catch (error) {
      setErrorMessage('Failed to edit banner: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const editCategory = async (categoryId) => {
    try {
      setIsLoading(true);
      const response = await retryFetch(`${BASE_URL}/api/categories/${categoryId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.status === 401 || response.status === 403) {
        setErrorMessage('Session expired. Please log in again.');
        localStorage.clear();
        setTimeout(() => navigate('/login'), 2500);
        return;
      }
      const text = await response.text();
      let category;
      try {
        category = JSON.parse(text);
      } catch (err) {
        throw new Error('Server returned an invalid response: ' + text);
      }
      if (!response.ok) {
        throw new Error(category.error || `Failed to fetch category with status ${response.status}`);
      }
      setEditingCategory(category);
      navigate('/admin/manage-categories');
    } catch (error) {
      setErrorMessage('Failed to edit category: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const editSpecialCategory = async (specialCategoryId) => {
    try {
      setIsLoading(true);
      const response = await retryFetch(`${BASE_URL}/api/special-categories/${specialCategoryId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.status === 401 || response.status === 403) {
        setErrorMessage('Session expired. Please log in again.');
        localStorage.clear();
        setTimeout(() => navigate('/login'), 2500);
        return;
      }
      const text = await response.text();
      let specialCategory;
      try {
        specialCategory = JSON.parse(text);
      } catch (err) {
        throw new Error('Server returned an invalid response: ' + text);
      }
      if (!response.ok) {
        throw new Error(specialCategory.error || `Failed to fetch special category with status ${response.status}`);
      }
      setEditingSpecialCategory(specialCategory);
      navigate('/admin/manage-special-categories');
    } catch (error) {
      setErrorMessage('Failed to edit special category: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      setIsLoading(true);
      const response = await retryFetch(`${BASE_URL}/api/products/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.status === 401 || response.status === 403) {
        setErrorMessage('Session expired. Please log in again.');
        localStorage.clear();
        setTimeout(() => navigate('/login'), 2500);
        return;
      }
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (err) {
        throw new Error('Server returned an invalid response: ' + text);
      }
      if (!response.ok) {
        throw new Error(result.error || `Failed to delete product with status ${response.status}`);
      }
      showSuccessMessage('Product deleted successfully!', setSuccessMessage);
      invalidateProductCache();
      await loadProducts();
    } catch (error) {
      setErrorMessage('Failed to delete product: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteBanner = async (bannerId) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) return;
    try {
      setIsLoading(true);
      const response = await retryFetch(`${BASE_URL}/api/banners/${bannerId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.status === 401 || response.status === 403) {
        setErrorMessage('Session expired. Please log in again.');
        localStorage.clear();
        setTimeout(() => navigate('/login'), 2500);
        return;
      }
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (err) {
        throw new Error('Server returned an invalid response: ' + text);
      }
      if (!response.ok) {
        throw new Error(result.error || `Failed to delete banner with status ${response.status}`);
      }
      showSuccessMessage('Banner deleted successfully!', setSuccessMessage);
      await loadBanners();
    } catch (error) {
      setErrorMessage('Failed to delete banner: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCategory = async (categoryId) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      setIsLoading(true);
      const response = await retryFetch(`${BASE_URL}/api/categories/${categoryId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.status === 401 || response.status === 403) {
        setErrorMessage('Session expired. Please log in again.');
        localStorage.clear();
        setTimeout(() => navigate('/login'), 2500);
        return;
      }
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (err) {
        throw new Error('Server returned an invalid response: ' + text);
      }
      if (!response.ok) {
        throw new Error(result.error || `Failed to delete category with status ${response.status}`);
      }
      showSuccessMessage('Category deleted successfully!', setSuccessMessage);
      await loadCategories();
    } catch (error) {
      setErrorMessage('Failed to delete category: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSpecialCategory = async (specialCategoryId) => {
    if (!window.confirm('Are you sure you want to delete this special category?')) return;
    try {
      setIsLoading(true);
      const response = await retryFetch(`${BASE_URL}/api/special-categories/${specialCategoryId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.status === 401 || response.status === 403) {
        setErrorMessage('Session expired. Please log in again.');
        localStorage.clear();
        setTimeout(() => navigate('/login'), 2500);
        return;
      }
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (err) {
        throw new Error('Server returned an invalid response: ' + text);
      }
      if (!response.ok) {
        throw new Error(result.error || `Failed to delete special category with status ${response.status}`);
      }
      showSuccessMessage('Special Category deleted successfully!', setSuccessMessage);
      await loadSpecialCategories();
    } catch (error) {
      setErrorMessage('Failed to delete special category: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCategoryVisibility = async (categoryId, currentVisibility) => {
    try {
      setIsLoading(true);
      const response = await retryFetch(`${BASE_URL}/api/categories/${categoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ isVisible: !currentVisibility }),
      });
      if (response.status === 401 || response.status === 403) {
        setErrorMessage('Session expired. Please log in again.');
        localStorage.clear();
        setTimeout(() => navigate('/login'), 2500);
        return;
      }
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (err) {
        throw new Error('Server returned an invalid response: ' + text);
      }
      if (!response.ok) {
        throw new Error(result.error || `Failed to toggle category visibility with status ${response.status}`);
      }
      showSuccessMessage('Category visibility updated successfully!', setSuccessMessage);
      await loadCategories();
    } catch (error) {
      setErrorMessage('Failed to toggle category visibility: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSpecialCategoryVisibility = async (specialCategoryId, currentVisibility) => {
    try {
      setIsLoading(true);
      const response = await retryFetch(`${BASE_URL}/api/special-categories/${specialCategoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ isVisible: !currentVisibility }),
      });
      if (response.status === 401 || response.status === 403) {
        setErrorMessage('Session expired. Please log in again.');
        localStorage.clear();
        setTimeout(() => navigate('/login'), 2500);
        return;
      }
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (err) {
        throw new Error('Server returned an invalid response: ' + text);
      }
      if (!response.ok) {
        throw new Error(result.error || `Failed to toggle special category visibility with status ${response.status}`);
      }
      showSuccessMessage('Special Category visibility updated successfully!', setSuccessMessage);
      await loadSpecialCategories();
    } catch (error) {
      setErrorMessage('Failed to toggle special category visibility: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderSection = () => {
    switch (section) {
      case 'dashboard':
        return (
          <div className="dashboard-content">
            <h2>Welcome, Admin!</h2>
            {isLoading ? (
              <p>Loading dashboard data...</p>
            ) : errorMessage ? (
              <div className="error-message">{errorMessage}</div>
            ) :recentOrders.length === 0 && products.length === 0 ? (
  <p>No dashboard data available.</p> 
             ): (
              <>
                <div className="quick-stats">
                  <div className="stat-card">
                    <h3>Total Orders</h3>
                    <p>{totalOrders || 0}</p>
                  </div>
                  <div className="stat-card">
                    <h3>Total Sales</h3>
                    <p>₹{(totalSales || 0).toFixed(2)}</p>
                  </div>
                  <div className="stat-card">
                    <h3>Pending Orders</h3>
                    <p>{pendingOrders || 0}</p>
                  </div>
                </div>
                <div className="tables-container">
                  <div className="recent-orders">
                    <h3>Recent Orders</h3>
                    {recentOrders.length === 0 ? (
                      <p>No recent orders available.</p>
                    ) : (
                      <table>
                        <thead>
                          <tr>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Date</th>
                            <th>Price</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentOrders.map(order => (
                            <tr key={order.id}>
                              <td data-label="Order ID">{order.id}</td>
                              <td data-label="Customer">{order.customer}</td>
                              <td data-label="Date">{order.date}</td>
                              <td data-label="Price">{order.total}</td>
                              <td data-label="Status">{order.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  <div className="manage-products">
                    <h3>Manage Products</h3>
                    {products.length === 0 ? (
                      <p>No products available.</p>
                    ) : (
                      <table>
                        <thead>
                          <tr>
                            <th>Product Name</th>
                            <th>Price (₹)</th>
                            <th>Stock</th>
                          </tr>
                        </thead>
                        <tbody>
                          {products.slice(0, 5).map(product => (
                            <tr key={product._id}>
                              <td data-label="Product Name">{product.name || 'N/A'}</td>
                              <td data-label="Price">₹{(product.price || 0).toFixed(2)}</td>
                              <td data-label="Stock">{product.stock || 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        );

      case 'orders':
        return (
          <div id="manage-orders" className="admin-card">
            <h3>Manage Orders</h3>
            <OrderList isAdmin={true} />
          </div>
        );

      case 'add-product':
        return (
          <>
            <div className="admin-card" id="add-product">
              <h3>{editingProduct ? 'Edit Product' : 'Add Product'}</h3>
              <form id="product-form" onSubmit={handleProductFormSubmission}>
                <div className="form-group">
                  <label htmlFor="name">Product Name:</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    defaultValue={editingProduct?.name || ''}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="originalPrice">Original Price (₹):</label>
                  <input
                    type="number"
                    id="originalPrice"
                    name="originalPrice"
                    step="0.01"
                    defaultValue={editingProduct?.originalPrice || ''}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="price">Discounted Price (₹):</label>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    step="0.01"
                    defaultValue={editingProduct?.price || ''}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="stock">Stock:</label>
                  <input
                    type="number"
                    id="stock"
                    name="stock"
                    defaultValue={editingProduct?.stock || ''}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="description">Description:</label>
                  <textarea
                    id="description"
                    name="description"
                    defaultValue={editingProduct?.description || ''}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="category">Category:</label>
                  <select
                    id="category"
                    name="categoryId"
                    defaultValue={editingProduct?.categoryId || ''}
                  >
                    <option value="">Select a category (optional)</option>
                    {categories.map(category => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="imageFile">Choose Photo from Computer:</label>
                  <input
                    type="file"
                    id="imageFile"
                    name="image"
                    accept="image/*"
                    required={!editingProduct}
                  />
                  {editingProduct?.image_url && (
                    <div id="image-preview">
                      <img
                        src={`${BASE_URL}${editingProduct.image_url}`}
                        alt="Preview"
                        style={{ maxWidth: '100px', marginTop: '10px' }}
                        onError={(e) => {
                          e.target.src = '/assets/images/placeholder.png';
                        }}
                      />
                    </div>
                  )}
                </div>
                <button type="submit" className="btn" disabled={isLoading}>
                  {isLoading ? 'Processing...' : (editingProduct ? 'Update Product' : 'Save Product')}
                </button>
                {editingProduct && (
                  <button
                    type="button"
                    className="btn"
                    onClick={(e) => {
                      setEditingProduct(null);
                      e.target.closest('form').reset();
                    }}
                    style={{ marginLeft: '10px' }}
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                )}
              </form>
            </div>
            <div className="admin-card" id="existing-products">
              <h3>Existing Products</h3>
              {products.length === 0 ? (
                <p>No products available or failed to load products. Check the error message above.</p>
              ) : (
                <ul id="product-list" className="product-list">
                  {products.map(product => (
                    <li key={product._id} className="manage-product-item">
                      <img
                        src={`${BASE_URL}${product.image_url}`}
                        alt={product.name}
                        style={{ maxWidth: '50px' }}
                        onError={(e) => {
                          e.target.src = '/assets/images/placeholder.png';
                        }}
                      />
                      <div className="manage-product-info">
                        <strong>{product.name}</strong><br />
                        Original Price: ₹{product.originalPrice} | Discounted Price: ₹{product.price} | Stock: {product.stock}<br />
                        Category: {categories.find(cat => cat._id === product.categoryId)?.name || 'None'}
                      </div>
                      <div className="manage-product-controls">
                        <button
                          className="btn"
                          onClick={() => editProduct(product._id)}
                          disabled={isLoading}
                        >
                          Edit
                        </button>
                        <button
                          className="btn"
                          onClick={() => deleteProduct(product._id)}
                          disabled={isLoading}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        );

      case 'manage-updates':
        return (
          <div className="admin-card" id="manage-updates">
            <h3>Manage Updates</h3>
            <form id="update-form" onSubmit={handleUpdateFormSubmission}>
              <div className="form-group">
                <label htmlFor="update-text">Update Text:</label>
                <input
                  type="text"
                  id="update-text"
                  name="update-text"
                  placeholder="Enter update (e.g., 50% off all products above 1000 order)"
                  required
                />
              </div>
              <button type="submit" className="btn" disabled={isLoading}>
                {isLoading ? 'Processing...' : 'Save Update'}
              </button>
            </form>
            <h3>Send Notification</h3>
            <form id="notification-form" onSubmit={handleNotificationFormSubmission}>
              <div className="form-group">
                <label htmlFor="notification-text">Notification Text:</label>
                <input
                  type="text"
                  id="notification-text"
                  name="notification-text"
                  placeholder="Enter notification (e.g., Flash Sale starts now!)"
                  required
                />
              </div>
              <button type="submit" className="btn" disabled={isLoading}>
                {isLoading ? 'Processing...' : 'Send Notification'}
              </button>
            </form>
            <h3>Manage Banners</h3>
            <form id="banner-form" onSubmit={handleBannerFormSubmission}>
              <div className="form-group">
                <label htmlFor="banner-image">Upload Banner Image:</label>
                <input
                  type="file"
                  id="banner-image"
                  name="banner-image"
                  accept="image/*"
                  required={!editingBanner}
                />
                {editingBanner?.image_url && (
                  <div id="banner-preview">
                    <img
                      src={`${BASE_URL}${editingBanner.image_url}`}
                      alt="Banner Preview"
                      style={{ maxWidth: '100px', marginTop: '10px' }}
                      onError={(e) => {
                        e.target.src = '/assets/images/placeholder.png';
                      }}
                    />
                  </div>
                )}
              </div>
              <button type="submit" className="btn" disabled={isLoading}>
                {isLoading ? 'Processing...' : (editingBanner ? 'Update Banner' : 'Upload Banner')}
              </button>
              {editingBanner && (
                <button
                  type="button"
                  className="btn"
                  onClick={(e) => {
                    setEditingBanner(null);
                    e.target.closest('form').reset();
                  }}
                  style={{ marginLeft: '10px' }}
                  disabled={isLoading}
                >
                  Cancel
                </button>
              )}
            </form>
            <h4>Existing Banners</h4>
            <ul id="banner-list" className="banner-list">
              {banners.length === 0 ? (
                <li>No banners available.</li>
              ) : (
                banners.map(banner => (
                  <li key={banner._id} className="manage-product-item">
                    <img
                      src={`${BASE_URL}${banner.image_url}`}
                      alt="Banner"
                      style={{ maxWidth: '50px' }}
                      onError={(e) => {
                        e.target.src = '/assets/images/placeholder.png';
                      }}
                    />
                    <div className="manage-product-controls">
                      <button
                        className="btn"
                        onClick={() => editBanner(banner._id)}
                        disabled={isLoading}
                      >
                        Edit
                      </button>
                      <button
                        className="btn"
                        onClick={() => deleteBanner(banner._id)}
                        disabled={isLoading}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        );

      case 'manage-about-us':
        return (
          <div className="admin-card" id="manage-about-us">
            <h3>Manage About Us</h3>
            <form id="about-us-form" onSubmit={handleAboutUsFormSubmission}>
              <div className="form-group">
                <label htmlFor="about-us-text">About Us Text:</label>
                <textarea
                  id="about-us-text"
                  name="about-us-text"
                  placeholder="Enter About Us content"
                  required
                />
              </div>
              <button type="submit" className="btn" disabled={isLoading}>
                {isLoading ? 'Processing...' : 'Save About Us'}
              </button>
            </form>
          </div>
        );

      case 'manage-contact-us':
        return (
          <div className="admin-card" id="manage-contact-us">
            <h3>Manage Contact Us</h3>
            <form id="contact-us-form" onSubmit={handleContactUsFormSubmission}>
              <div className="form-group">
                <label htmlFor="contact-us-text">Contact Information Text:</label>
                <textarea
                  id="contact-us-text"
                  name="contact-us-text"
                  placeholder="Enter Contact Information (e.g., email, phone)"
                  required
                />
              </div>
              <button type="submit" className="btn" disabled={isLoading}>
                {isLoading ? 'Processing...' : 'Save Contact Information'}
              </button>
            </form>
            <h3>User Messages</h3>
            <ul id="user-messages" className="message-list">
              {isMessagesLoading ? (
                <li>Loading messages...</li>
              ) : userMessages.length === 0 ? (
                <li>No user messages available.</li>
              ) : (
                userMessages.map(message => (
                  <li key={message._id} style={{ opacity: message.isRead ? 0.7 : 1 }}>
                    <div>
                      <strong>Name:</strong> {message.name}<br />
                      <strong>Email:</strong> {message.email}<br />
                      <strong>Message:</strong> {message.message}<br />
                      <strong>Submitted:</strong> {new Date(message.createdAt).toLocaleString()}<br />
                      <strong>Status:</strong> {message.isRead ? 'Read' : 'Unread'}
                      {!message.isRead && (
                        <button
                          className="btn"
                          onClick={() => markMessageAsRead(message._id)}
                          style={{ marginLeft: '10px' }}
                          disabled={isLoading}
                        >
                          Mark as Read
                        </button>
                      )}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        );

      case 'existing-products':
        return (
          <div className="admin-card" id="existing-products">
            <h3>Existing Products</h3>
            {products.length === 0 ? (
              <p>No products available or failed to load products. Check the error message above.</p>
            ) : (
              <ul id="product-list" className="product-list">
                {products.map(product => (
                  <li key={product._id} className="manage-product-item">
                    <img
                      src={`${BASE_URL}${product.image_url}`}
                      alt={product.name}
                      style={{ maxWidth: '50px' }}
                      onError={(e) => {
                        e.target.src = '/assets/images/placeholder.png';
                      }}
                    />
                    <div className="manage-product-info">
                      <strong>{product.name}</strong><br />
                      Original Price: ₹{product.originalPrice} | Discounted Price: ₹{product.price} | Stock: {product.stock}<br />
                      Category: {categories.find(cat => cat._id === product.categoryId)?.name || 'None'}
                    </div>
                    <div className="manage-product-controls">
                      <button
                        className="btn"
                        onClick={() => editProduct(product._id)}
                        disabled={isLoading}
                      >
                        Edit
                      </button>
                      <button
                        className="btn"
                        onClick={() => deleteProduct(product._id)}
                        disabled={isLoading}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );

      case 'manage-categories':
        return (
          <div className="admin-card" id="manage-categories">
            <h3>{editingCategory ? 'Edit Category' : 'Manage Categories'}</h3>
            <form id="category-form" onSubmit={handleCategoryFormSubmission}>
              <div className="form-group">
                <label htmlFor="category-name">Category Name:</label>
                <input
                  type="text"
                  id="category-name"
                  name="category-name"
                  defaultValue={editingCategory?.name || ''}
                  placeholder="e.g., Anniversary Sale"
                  required
                />
              </div>
              <div className="form-group checkbox-group">
                <label htmlFor="category-visible" className="checkbox-label">
                  <input
                    type="checkbox"
                    id="category-visible"
                    name="category-visible"
                    defaultChecked={editingCategory?.isVisible ?? true}
                  />
                  <span>Visible on Homepage</span>
                </label>
              </div>
              <button type="submit" className="btn" disabled={isLoading}>
                {isLoading ? 'Processing...' : (editingCategory ? 'Update Category' : 'Add Category')}
              </button>
              {editingCategory && (
                <button
                  type="button"
                  className="btn"
                  onClick={(e) => {
                    setEditingCategory(null);
                    e.target.closest('form').reset();
                  }}
                  style={{ marginLeft: '10px' }}
                  disabled={isLoading}
                >
                  Cancel
                </button>
              )}
            </form>
            <h4>Existing Categories</h4>
            <ul id="category-list" className="category-list">
              {categories.length === 0 ? (
                <li>No categories available.</li>
              ) : (
                categories.map(category => (
                  <li key={category._id} className="manage-product-item">
                    <div className="manage-product-info">
                      <strong>{category.name}</strong><br />
                      Visible: {category.isVisible ? 'Yes' : 'No'}
                    </div>
                    <div className="manage-product-controls">
                      <button
                        className="btn"
                        onClick={() => editCategory(category._id)}
                        disabled={isLoading}
                      >
                        Edit
                      </button>
                      <button
                        className="btn"
                        onClick={() => toggleCategoryVisibility(category._id, category.isVisible)}
                        disabled={isLoading}
                      >
                        {category.isVisible ? 'Hide' : 'Show'}
                      </button>
                      <button
                        className="btn"
                        onClick={() => deleteCategory(category._id)}
                        disabled={isLoading}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>

            <h3>Create Special Category</h3>
            <form id="create-special-category-form" onSubmit={handleSpecialCategoryCreation}>
              <div className="form-group">
                <label htmlFor="special-category-name">Special Category Name:</label>
                <input
                  type="text"
                  id="special-category-name"
                  name="special-category-name"
                  placeholder="e.g., Exclusive Offer"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="products">Select Products:</label>
                {products.length === 0 ? (
                  <p>Loading products or no products available...</p>
                ) : (
                  <select
                    id="products"
                    name="products"
                    multiple
                    required
                    style={{ height: '150px', width: '100%' }}
                  >
                    {products.map(product => (
                      <option key={product._id} value={product._id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="special-category-visibility">Visibility:</label>
                <select
                  id="special-category-visibility"
                  name="special-category-visibility"
                  defaultValue="Yes"
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <button type="submit" className="btn" disabled={products.length === 0 || isLoading}>
                {isLoading ? 'Processing...' : 'Create Special Category'}
              </button>
            </form>

            <h3>Existing Products</h3>
            {products.length === 0 ? (
              <p>No products available or failed to load products. Check the error message above.</p>
            ) : (
              <ul id="product-list" className="product-list">
                {products.map(product => (
                  <li key={product._id} className="manage-product-item">
                    <img
                      src={`${BASE_URL}${product.image_url}`}
                      alt={product.name}
                      style={{ maxWidth: '50px' }}
                      onError={(e) => {
                        e.target.src = '/assets/images/placeholder.png';
                      }}
                    />
                    <div className="manage-product-info">
                      <strong>{product.name}</strong><br />
                      Original Price: ₹{product.originalPrice} | Discounted Price: ₹{product.price} | Stock: {product.stock}<br />
                      Category: {categories.find(cat => cat._id === product.categoryId)?.name || 'None'}
                    </div>
                    <div className="manage-product-controls">
                      <button
                        className="btn"
                        onClick={() => editProduct(product._id)}
                        disabled={isLoading}
                      >
                        Edit
                      </button>
                      <button
                        className="btn"
                        onClick={() => deleteProduct(product._id)}
                        disabled={isLoading}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );

      case 'manage-special-categories':
        return (
          <div className="admin-section-wrapper">
            <div className="admin-card" id="manage-special-categories">
              <h3>{editingSpecialCategory ? 'Edit Special Category' : 'Manage Special Categories'}</h3>
              <form id="special-category-form" onSubmit={handleSpecialCategoryFormSubmission}>
                <div className="form-group">
                  <label htmlFor="special-category-name">Special Category Name:</label>
                  <input
                    type="text"
                    id="special-category-name"
                    name="special-category-name"
                    defaultValue={editingSpecialCategory?.name || ''}
                    placeholder="e.g., Exclusive Offer"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="products">Select Products:</label>
                  {products.length === 0 ? (
                    <p>Loading products or no products available...</p>
                  ) : (
                    <select
                      id="products"
                      name="products"
                      multiple
                      defaultValue={editingSpecialCategory?.productIds || []}
                      required
                      style={{ height: '150px', width: '100%' }}
                    >
                      {products.map(product => (
                        <option key={product._id} value={product._id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="form-group checkbox-group">
                  <label htmlFor="special-category-visible" className="checkbox-label">
                    <input
                      type="checkbox"
                      id="special-category-visible"
                      name="special-category-visible"
                      defaultChecked={editingSpecialCategory?.isVisible ?? true}
                    />
                    <span>Visible on Homepage</span>
                  </label>
                </div>
                <button type="submit" className="btn" disabled={isLoading}>
                  {isLoading ? 'Processing...' : (editingSpecialCategory ? 'Update Special Category' : 'Add Special Category')}
                </button>
                {editingSpecialCategory && (
                  <button
                    type="button"
                    className="btn"
                    onClick={(e) => {
                      setEditingSpecialCategory(null);
                      e.target.closest('form').reset();
                    }}
                    style={{ marginLeft: '10px' }}
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                )}
              </form>
            </div>

            <div className="admin-card" id="special-categories">
              <h3>Special Categories</h3>
              {isLoading && <div>Loading...</div>}
              <ul id="special-category-list" className="category-list">
                {specialCategories.length === 0 ? (
                  <li>No special categories available.</li>
                ) : (
                  specialCategories.map(specialCategory => (
                    <li key={specialCategory._id} className="manage-product-item">
                      <div className="manage-product-info">
                        <strong>{specialCategory.name}</strong>
                        <span>Products: {specialCategory.productIds?.length || 0}</span>
                        <span>{specialCategory.isVisible ? 'Visible' : 'Hidden'}</span>
                      </div>
                      <div className="manage-product-controls">
                        <button
                          className="btn"
                          onClick={() => editSpecialCategory(specialCategory._id)}
                          disabled={isLoading}
                        >
                          Edit
                        </button>
                        <button
                          className="btn"
                          onClick={() => toggleSpecialCategoryVisibility(specialCategory._id, specialCategory.isVisible)}
                          disabled={isLoading}
                        >
                          {specialCategory.isVisible ? 'Hide' : 'Show'}
                        </button>
                        <button
                          className="btn"
                          onClick={() => deleteSpecialCategory(specialCategory._id)}
                          disabled={isLoading}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
              <a href="/admin" className="btn">Back to Admin Dashboard</a>
            </div>
          </div>
        );

      default:
        return <p>Please select an option from the sidebar.</p>;
    }
  };

  return (
    <div className="admin-container">
      <div className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <img src="/assets/images/logo.png" alt="ChocoCraft Logo" className="sidebar-logo" />
          <h1 className="sidebar-title">ChocoCraft</h1>
          <button className="sidebar-toggle" onClick={toggleSidebar}>
            {isSidebarOpen ? '✖' : '☰'}
          </button>
        </div>
        <ul className="sidebar-menu">
          <li className={section === 'dashboard' ? 'active' : ''}>
            <button onClick={() => handleNavigation('dashboard')}>
              <i className="fas fa-home"></i>
              <span className="menu-text">Dashboard</span>
            </button>
          </li>
          <li className={section === 'add-product' ? 'active' : ''}>
            <button onClick={() => handleNavigation('add-product')}>
              <i className="fas fa-plus-circle"></i>
              <span className="menu-text">Add Product</span>
            </button>
          </li>
          <li className={section === 'existing-products' ? 'active' : ''}>
            <button onClick={() => handleNavigation('existing-products')}>
              <i className="fas fa-box"></i>
              <span className="menu-text">Manage Products</span>
            </button>
          </li>
          <li className={section === 'orders' ? 'active' : ''}>
            <button onClick={() => handleNavigation('orders')}>
              <i className="fas fa-shopping-bag"></i>
              <span className="menu-text">Orders</span>
            </button>
          </li>
          <li className={section === 'manage-updates' ? 'active' : ''}>
            <button onClick={() => handleNavigation('manage-updates')}>
              <i className="fas fa-bullhorn"></i>
              <span className="menu-text">Manage Updates</span>
            </button>
          </li>
          <li className={section === 'manage-about-us' ? 'active' : ''}>
            <button onClick={() => handleNavigation('manage-about-us')}>
              <i className="fas fa-info-circle"></i>
              <span className="menu-text">Manage About Us</span>
            </button>
          </li>
          <li className={section === 'manage-contact-us' ? 'active' : ''}>
            <button onClick={() => handleNavigation('manage-contact-us')}>
              <i className="fas fa-envelope"></i>
              <span className="menu-text">
                Manage Contact Us
                {unreadMessagesCount > 0 && (
                  <span className="message-badge">{unreadMessagesCount}</span>
                )}
              </span>
            </button>
          </li>
          <li className={section === 'manage-categories' ? 'active' : ''}>
            <button onClick={() => handleNavigation('manage-categories')}>
              <i className="fas fa-tags"></i>
              <span className="menu-text">Manage Categories</span>
            </button>
          </li>
          <li className={section === 'manage-special-categories' ? 'active' : ''}>
            <button onClick={() => handleNavigation('manage-special-categories')}>
              <i className="fas fa-star"></i>
              <span className="menu-text">Manage Special Categories</span>
            </button>
          </li>
        </ul>
      </div>
      <div className={`main-content ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <div className="admin-header">
          {/* <button className="sidebar-toggle-mobile" onClick={toggleSidebar}>
            ☰
          </button> */}
          <h2>Admin Dashboard</h2>
        </div>
        {successMessage && (
          <div className="success-message">{successMessage}</div>
        )}
        {errorMessage && (
          <div className="error-message">{errorMessage}</div>
        )}
        {renderSection()}
      </div>

      <style jsx>{`
        .admin-container {
          display: flex;
          min-height: 100vh;
          background-color: #F4E8D6;
          position: relative;
        }

        .sidebar {
          background-color: #5C4637;
          color: #F4E8D6;
          padding: 20px;
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 60px;
          left: 0;
          height: 100vh;
          transition: width 0.3s ease;
          z-index: 1000;
        }

        .sidebar.open {
          width: 250px;
        }

        .sidebar.closed {
        padding-left: 4px;
        padding-right: 4px;
          width: 60px;
        }
          .sidebar.closed .sidebar-header {
  padding-left: 0;
}

        .sidebar-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 30px;
          position: relative;
          min-height: 40px;
          padding-left: 0;
          justify-content: center;
        }

        .sidebar-logo {
          display: none;
        }

        .sidebar-title {
          font-size: 24px;
          font-weight: bold;
          margin: 0;
          color: #F4E8D6;
          display: block;
        }

        .sidebar.closed .sidebar-title {
          display: none;
        }

        .sidebar-toggle {
          background: none;
          border: none;
          color: #F4E8D6;
          font-size: 24px;
          cursor: pointer;
          position: static;
          margin-left: 0;
          margin-top: 0;
          margin-right: 0;
          width: 40px;
          height: 40px;
          padding: 4px;
          right: 10px;
          display: block;
          margin: 0 auto;
          background-color: #5C4637; /* Always use sidebar color */
          transition: background-color 0.3s;
        }
          .sidebar-toggle:hover {
  background-color: #3F342A; /* Slightly darker on hover */
  color: #F4E8D6;
}

        .sidebar-menu {
          list-style: none;
          padding: 0;
          flex: 1;
          gap:12px;
        }

        .sidebar-menu li button {
          width: 100%;
          padding: 10px;
          background: none;
          border: none;
          color: #F4E8D6;
          text-align: left;
          font-size: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          border-radius: 5px;
          transition: background-color 0.3s;
          justify-content: flex-start;
        }

        .sidebar-menu li button:hover {
          background-color: #3F342A;
        }

        .sidebar-menu li.active button {
          background-color: #D9C8B0;
          color: #5C4637;
        }

        .sidebar.closed .menu-text {
          display: none;
        }
          .sidebar.closed .sidebar-menu li button {
          justify-content: center;
          padding-left: 0;
          padding-right: 0;
        }
        .sidebar.closed .sidebar-menu li i {
  margin-right: 0;
}
  .sidebar.closed .sidebar-menu {
  gap: 20px; /* More space between icons when closed */
}
        .sidebar-menu li i {
          font-size: 18px;
          width: 40px;
          text-align: center;
          display:inline-block;
        }

      .message-badge {
          background-color: #D9C8B0;
          color: #5C4637;
          border-radius: 10px;
          padding: 2px 6px;
          font-size: 12px;
          margin-left: 5px;
        }

        .main-content {
          flex: 1;
          padding: 20px;
          margin-left: 250px;
          margin-top: 60px;
          transition: margin-left 0.3s ease;
          background-color: #F4E8D6;
        }

        .main-content.sidebar-closed {
          margin-left: 60px;
          margin-top: 60px;
        }
        
        .admin-header {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 20px;
        }

        .sidebar-toggle-mobile {
          display: none;
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
        }

        .success-message,
        .error-message {
          padding: 10px;
          margin-bottom: 20px;
          border-radius: 5px;
          text-align: center;
        }

        .success-message {
          background-color: #d4edda;
          color: #155724;
        }

        .error-message {
          background-color: #f8d7da;
          color: #721c24;
        }

        .dashboard-content {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .quick-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 20px;
        }

        .stat-card {
          background-color: #5C4637;
          color: #F4E8D6;
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
          text-align: center;
        }

        .stat-card h3 {
          margin: 0 0 10px;
          font-size: 18px;
          color: #F4E8D6;
        }

        .stat-card p {
          font-size: 24px;
          font-weight: bold;
          color: #F4E8D6;
          margin: 0;
        }

        .tables-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .recent-orders,
        .manage-products {
          background-color: #D9C8B0;
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }

        .recent-orders h3,
        .manage-products h3 {
          margin: 0 0 15px;
          font-size: 18px;
          color: #5C4637;
          
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th, td {
          padding: 10px;
          text-align: left;
          border-bottom: 1px solid #E0E0E0;
        }

        th {
          background-color: #5C4637;
          color: #F4E8D6;
          font-weight: bold;
        }

        td {
          color: #3F342A;
        }

        .admin-card {
          background-color: #FFFFFF;
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
          margin-bottom: 20px;
        }

        .form-group {
          margin-bottom: 15px;
        }

        .form-group label {
          display: block;
          margin-bottom: 5px;
          color: #5C4637;
        }

        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 8px;
          border: 1px solid #E0E0E0;
          border-radius: 5px;
          font-size: 14px;
        }

        .form-group textarea {
          resize: vertical;
          min-height: 100px;
        }

        .btn {
          background-color: #5C4637;
          color: #F4E8D6;
          padding: 10px 20px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.3s;
        }

        .btn:hover {
          background-color: #3F342A;
        }

        .btn:disabled {
          background-color: #A9A9A9;
          cursor: not-allowed;
        }

        .product-list,
        .banner-list,
        .category-list,
        .message-list {
          list-style: none;
          padding: 0;
        }

        .manage-product-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          border-bottom: 1px solid #E0E0E0;
        }

        .manage-product-info {
          flex: 1;
        }

        .manage-product-controls {
          display: flex;
          gap: 10px;
        }

        @media (max-width: 768px) {
          .sidebar {
            position: fixed;
            width: 250px;
            left: -250px;
            top: 50px; /* If navbar is 50px on mobile */
    height: calc(100vh - 50px);
          }
          .main-content,
  .main-content.sidebar-closed {
    margin-top: 50px;
  }
    .sidebar.closed ul.sidebar-menu li {
  margin-bottom: 14px;
}
.sidebar.closed ul.sidebar-menu li:last-child {
  margin-bottom: 14px;
}
          .sidebar.open {
            left: 0;
          }

          .main-content {
            margin-left: 0;
          }

          .main-content.sidebar-open {
            margin-left: 250px;
          }

          .sidebar-toggle-mobile {
            display: block;
          }

          .tables-container {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .quick-stats {
            grid-template-columns: 1fr;
          }

          table {
            display: block;
            overflow-x: auto;
            white-space: nowrap;
          }

          th, td {
            min-width: 100px;
          }

          td:before {
            content: attr(data-label);
            font-weight: bold;
            display: inline-block;
            width: 100px;
            margin-right: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default Admin;