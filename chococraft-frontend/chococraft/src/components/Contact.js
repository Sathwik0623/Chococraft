import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Contact = () => {
  const [contactUsText, setContactUsText] = useState('Loading...');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const navigate = useNavigate();
  const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Fetch Contact Us content
  const fetchContactUsText = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/contact-info`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
      }
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (jsonError) {
        console.error('Failed to parse response as JSON:', text);
        throw new Error(`Invalid JSON response: ${jsonError.message}`);
      }
      console.log('Fetched Contact Us data:', data);
      setContactUsText(data.text || 'No Contact Us content set.');
    } catch (e) {
      console.error('Error fetching Contact Us text:', e.message);
      if (e.message.includes('Failed to fetch')) {
        console.error('Possible causes: Server not running, wrong port, or CORS issue. Check if the backend server is running at', BASE_URL);
      } else if (e.message.includes('HTTP error')) {
        console.error('Check if /api/contact-info endpoint is implemented on the server and accessible.');
      }
      setContactUsText(`Error loading Contact Us content. Details: ${e.message}. Check console for more info.`);
    }
  };

  // Handle contact form submission
  const handleContactForm = async (event) => {
    event.preventDefault();
    const name = event.target.name.value.trim();
    const email = event.target.email.value.trim();
    const message = event.target.message.value.trim();

    if (!name || !email || !message) {
      alert('Please fill in all fields.');
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/contact-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
      }
      const text = await response.text();
      try {
        JSON.parse(text);
      } catch (jsonError) {
        console.error('Failed to parse form submission response as JSON:', text);
        throw new Error(`Invalid JSON response from server: ${jsonError.message}`);
      }
      console.log('Form submitted successfully, setting showConfirmation to true');
      setShowConfirmation(true);
      setTimeout(() => event.target.reset(), 0);
    } catch (error) {
      console.error('Error sending message:', error.message);
      if (error.message.includes('Failed to fetch')) {
        console.error('Possible causes: Server not running, wrong port, or CORS issue. Check if the backend server is running at', BASE_URL);
      }
      alert(`Failed to send message: ${error.message}. Check console for more info.`);
    }
  };

  // Handle send another message
  const handleSendAnotherMessage = () => {
    console.log('Send Another Message clicked, setting showConfirmation to false');
    setShowConfirmation(false);
  };

  // Log when showConfirmation changes
  useEffect(() => {
    console.log('showConfirmation state changed to:', showConfirmation);
  }, [showConfirmation]);

  useEffect(() => {
    fetchContactUsText();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 font-segoe">
      <header className="text-center py-10">
        <img src="/assets/images/logo.png" alt="ChocoCraft Logo" className="h-20 mx-auto" />
        <h1 className="text-3xl font-bold">Contact ChocoCraft</h1>
        <h2 className="text-xl">Get in Touch with Us</h2>
      </header>

      <main className="p-4">
        <div className="contact-content max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold mb-4">Contact Information</h3>
          <p id="contact-us-text" className="mb-6">{contactUsText}</p>
          {!showConfirmation ? (
            <>
              <h3 className="text-2xl font-bold mb-4">Send Us a Message</h3>
              <form id="contact-form" onSubmit={handleContactForm} className="bg-white p-6 rounded-lg shadow">
                <div className="mb-4">
                  <label htmlFor="name" className="block mb-1">Name:</label>
                  <input type="text" id="name" name="name" required className="w-full p-2 border rounded" />
                </div>
                <div className="mb-4">
                  <label htmlFor="email" className="block mb-1">Email:</label>
                  <input type="email" id="email" name="email" required className="w-full p-2 border rounded" />
                </div>
                <div className="mb-4">
                  <label htmlFor="message" className="block mb-1">Message:</label>
                  <textarea id="message" name="message" required rows="5" className="w-full p-2 border rounded" />
                </div>
                <button type="submit" className="send-message-btn">
                  Send Message
                </button>
              </form>
            </>
          ) : (
            <>
              {console.log('Rendering confirmation message')}
              <div id="confirmation-message" className="confirmation-message text-center p-8 bg-white rounded-xl shadow-lg border border-green-200 mt-4">
                <div className="success-circle">
                  <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <h3 className="text-2xl text-gray-800 mb-4">Message Sent!</h3>
                <p className="text-gray-700 text-lg mb-6">Thank you for contacting us!</p>
                <button
                  id="send-another-message"
                  onClick={handleSendAnotherMessage}
                  className="send-message-btn"
                >
                  Send Another Message
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="bg-gray-800 text-white p-4 text-center">
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

      <style>
        {`
          .font-segoe {
            font-family: 'Segoe UI', sans-serif;
          }
          /* Send Message and Send Another Message Button Styling */
          .send-message-btn {
            background: linear-gradient(90deg, #d17c2a, #b45f06);
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
          .send-message-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            background: linear-gradient(90deg, #b45f06, #8f4b05);
          }
          .send-message-btn:active {
            transform: scale(0.98);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          /* Confirmation Message Styling */
          .confirmation-message {
            display: block !important;
            min-height: 200px;
            opacity: 0;
            transform: scale(0.95);
            animation: fadeIn 0.5s ease forwards;
          }
          .success-circle {
            position: relative;
            width: 100px;
            height: 100px;
            background: #28a745;
            border-radius: 50%;
            margin: 0 auto 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: scaleIn 0.6s ease forwards;
          }
          .success-circle .checkmark {
            width: 3rem;
            height: 3rem;
            opacity: 0;
            animation: checkmarkFadeIn 0.5s ease forwards 0.3s;
          }
          @keyframes fadeIn {
            0% { opacity: 0; transform: scale(0.95); }
            100% { opacity: 1; transform: scale(1); }
          }
          @keyframes scaleIn {
            0% { transform: scale(0); }
            80% { transform: scale(1.1); }
            100% { transform: scale(1); }
          }
          @keyframes checkmarkFadeIn {
            0% { opacity: 0; transform: scale(0.5); }
            100% { opacity: 1; transform: scale(1); }
          }
        `}
      </style>
    </div>
  );
};

export default Contact;