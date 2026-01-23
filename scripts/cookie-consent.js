/**
 * Cookie Consent Banner
 * GDPR/Privacy compliant cookie consent for HiveMind AR
 */

(function() {
  const COOKIE_NAME = 'hm_cookie_consent';
  const COOKIE_EXPIRY_DAYS = 365;

  // Check if consent already given
  function hasConsent() {
    return document.cookie.split(';').some(item => item.trim().startsWith(COOKIE_NAME + '='));
  }

  // Set consent cookie
  function setConsent(value) {
    const date = new Date();
    date.setTime(date.getTime() + (COOKIE_EXPIRY_DAYS * 24 * 60 * 60 * 1000));
    document.cookie = `${COOKIE_NAME}=${value};expires=${date.toUTCString()};path=/;SameSite=Lax`;
  }

  // Create and show banner
  function showBanner() {
    if (hasConsent()) return;

    const banner = document.createElement('div');
    banner.id = 'cookie-consent-banner';
    banner.innerHTML = `
      <div class="cookie-content">
        <p>We use cookies to improve your experience and analyze site traffic. By continuing to use this site, you agree to our use of cookies.</p>
        <a href="/pages/public/privacy.html" class="cookie-link">Privacy Policy</a>
      </div>
      <div class="cookie-actions">
        <button id="cookie-accept" class="cookie-btn cookie-btn-accept">Accept</button>
        <button id="cookie-decline" class="cookie-btn cookie-btn-decline">Decline</button>
      </div>
    `;

    // Add styles
    const styles = document.createElement('style');
    styles.textContent = `
      #cookie-consent-banner {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: #1a1a1a;
        color: #ffffff;
        padding: 1rem 2rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 2rem;
        z-index: 9999;
        box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
        animation: slideUp 0.3s ease;
      }

      @keyframes slideUp {
        from {
          transform: translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      #cookie-consent-banner .cookie-content {
        flex: 1;
      }

      #cookie-consent-banner .cookie-content p {
        margin: 0;
        font-size: 0.9rem;
        line-height: 1.5;
        color: #cccccc;
      }

      #cookie-consent-banner .cookie-link {
        color: #c9a227;
        text-decoration: underline;
        margin-left: 0.5rem;
      }

      #cookie-consent-banner .cookie-link:hover {
        color: #e0b830;
      }

      #cookie-consent-banner .cookie-actions {
        display: flex;
        gap: 0.75rem;
        flex-shrink: 0;
      }

      #cookie-consent-banner .cookie-btn {
        padding: 0.625rem 1.25rem;
        border: none;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      #cookie-consent-banner .cookie-btn-accept {
        background: linear-gradient(135deg, #c9a227 0%, #b48c1e 100%);
        color: #000;
      }

      #cookie-consent-banner .cookie-btn-accept:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 10px rgba(201, 162, 39, 0.3);
      }

      #cookie-consent-banner .cookie-btn-decline {
        background: transparent;
        color: #999;
        border: 1px solid #444;
      }

      #cookie-consent-banner .cookie-btn-decline:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }

      @media (max-width: 768px) {
        #cookie-consent-banner {
          flex-direction: column;
          text-align: center;
          padding: 1.25rem 1rem;
          gap: 1rem;
        }

        #cookie-consent-banner .cookie-actions {
          width: 100%;
          justify-content: center;
        }

        #cookie-consent-banner .cookie-btn {
          flex: 1;
          max-width: 150px;
        }
      }
    `;

    document.head.appendChild(styles);
    document.body.appendChild(banner);

    // Event listeners
    document.getElementById('cookie-accept').addEventListener('click', function() {
      setConsent('accepted');
      hideBanner();
    });

    document.getElementById('cookie-decline').addEventListener('click', function() {
      setConsent('declined');
      hideBanner();
    });
  }

  function hideBanner() {
    const banner = document.getElementById('cookie-consent-banner');
    if (banner) {
      banner.style.animation = 'slideDown 0.3s ease forwards';
      setTimeout(() => banner.remove(), 300);
    }
  }

  // Add slideDown animation
  const slideDownStyle = document.createElement('style');
  slideDownStyle.textContent = `
    @keyframes slideDown {
      from {
        transform: translateY(0);
        opacity: 1;
      }
      to {
        transform: translateY(100%);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(slideDownStyle);

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showBanner);
  } else {
    showBanner();
  }
})();
