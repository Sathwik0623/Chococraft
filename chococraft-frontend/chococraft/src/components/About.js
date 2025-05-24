import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const About = () => {
  const [aboutUsText, setAboutUsText] = useState('Loading...');
  const navigate = useNavigate();
  const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000'; // Align with Admin.js

  // Fetch About Us content
  const fetchAboutUsText = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/about-us`, { // Correct endpoint
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
      }
      const text = await response.text(); // Get raw text first
      let data;
      try {
        data = JSON.parse(text); // Attempt to parse as JSON
      } catch (jsonError) {
        console.error('Failed to parse response as JSON:', text);
        throw new Error(`Invalid JSON response: ${jsonError.message}`);
      }
      console.log('Fetched About Us data:', data);
      setAboutUsText(data.text || 'No About Us content set.');
    } catch (e) {
      console.error('Error fetching About Us text:', e.message);
      if (e.message.includes('Failed to fetch')) {
        console.error('Possible causes: Server not running, wrong port, or CORS issue. Check if the backend server is running at', BASE_URL);
      } else if (e.message.includes('HTTP error')) {
        console.error('Check if /api/about-us endpoint is implemented on the server and accessible.');
      }
      setAboutUsText(`Error loading About Us content. Details: ${e.message}. Check console for more info.`);
    }
  };

  useEffect(() => {
    fetchAboutUsText();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 font-segoe">
      {/* Header */}
      <header className="text-center py-10">
        <img src="/assets/images/logo.png" alt="ChocoCraft Logo" className="h-20 mx-auto" />
        <h1 className="text-3xl font-bold">About ChocoCraft</h1>
        <h2 className="text-xl">Our Story and Mission</h2>
      </header>

      {/* Main Content */}
      <main className="p-4">
        <div className="about-content max-w-3xl mx-auto bg-white p-6 rounded-lg shadow">
          <h3 className="text-2xl font-bold mb-4">About Us</h3>
          <p>{aboutUsText}</p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white p-4 text-center">
        <img src="/assets/images/logo.png" alt="ChocoCraft Logo" className="h-10 mx-auto mb-2" />
        <p>© 2025 ChocoCraft. All rights reserved.</p>
        <div className="flex justify-center space-x-4 mt-2">
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
            <i className="fab fa-facebook-f" />
          </a>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
            <i className="fab fa-instagram" />
          </a>
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">
            <i className="fab fa-twitter" />
          </a>
        </div>
      </footer>

      <style jsx>{`
        .font-segoe {
          font-family: 'Segoe UI', sans-serif;
        }
      `}</style>
    </div>
  );
};

export default About;