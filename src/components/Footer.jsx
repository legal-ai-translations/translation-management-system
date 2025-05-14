// components/Footer.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer>
      <div className="footer-container">
        <div className="footer-col">
          <h3>WeTranslate</h3>
          <p>Professional translation services for all your document needs.</p>
        </div>
        
        <div className="footer-col">
          <h3>Services</h3>
          <ul>
            <li><Link to="/">Document Translation</Link></li>
            <li><Link to="/">Legal Translation</Link></li>
            <li><Link to="/">Certified Translation</Link></li>
            <li><Link to="/">Business Translation</Link></li>
          </ul>
        </div>
        
        <div className="footer-col">
          <h3>Contact Us</h3>
          <ul>
            <li>36 Rue Saint Didier</li>
            <li>75116 Paris, France</li>
            <li>+33(1)71736436</li>
            <li>contact@wetranslate.fr</li>
          </ul>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} WeTranslate. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;