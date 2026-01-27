import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  server: {
    port: 5173,
    strictPort: true
  },
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
 input: {
 main: resolve(__dirname, 'index.html'),
 'super-admin-dashboard': resolve(__dirname, 'pages/super-admin/dashboard.html'),
 'super-admin-users': resolve(__dirname, 'pages/super-admin/users.html'),
 'super-admin-analytics': resolve(__dirname, 'pages/super-admin/analytics.html'),
 'super-admin-payments': resolve(__dirname, 'pages/super-admin/payments.html'),
 'super-admin-contact-us': resolve(__dirname, 'pages/super-admin/contact-us.html'),
 'super-admin-gallery': resolve(__dirname, 'pages/super-admin/gallery.html'),
 'super-admin-about-us': resolve(__dirname, 'pages/super-admin/about-us.html'),
 'super-admin-ar': resolve(__dirname, 'pages/super-admin/augmented-reality.html'),
 'subscriber-admin-dashboard': resolve(__dirname, 'pages/subscriber-admin/dashboard.html'),
 'subscriber-admin-users': resolve(__dirname, 'pages/subscriber-admin/users.html'),
 'subscriber-admin-subscriptions': resolve(__dirname, 'pages/subscriber-admin/subscriptions.html'),
 'subscriber-admin-artworks': resolve(__dirname, 'pages/subscriber-admin/artworks.html'),
 'subscriber-admin-messages': resolve(__dirname, 'pages/subscriber-admin/messages.html'),
 'subscriber-admin-analytics': resolve(__dirname, 'pages/subscriber-admin/analytics.html'),
 'subscriber-admin-support': resolve(__dirname, 'pages/subscriber-admin/support.html'),
 'subscriber-admin-mini-crm': resolve(__dirname, 'pages/subscriber-admin/mini-crm.html'),
 'subscriber-admin-payments': resolve(__dirname, 'pages/subscriber-admin/payments.html'),
 'subscriber-admin-contact-us': resolve(__dirname, 'pages/subscriber-admin/contact-us.html'),
 'subscriber-admin-gallery': resolve(__dirname, 'pages/subscriber-admin/gallery.html'),
 'subscriber-admin-about-us': resolve(__dirname, 'pages/subscriber-admin/about-us.html'),
 'subscriber-admin-ar': resolve(__dirname, 'pages/subscriber-admin/augmented-reality.html'),
 'sales-agent-dashboard': resolve(__dirname, 'pages/sales-agent/dashboard.html'),
 'sales-agent-analytics': resolve(__dirname, 'pages/sales-agent/analytics.html'),
 'sales-agent-mini-crm': resolve(__dirname, 'pages/sales-agent/mini-crm.html'),
 'sales-agent-contact-us': resolve(__dirname, 'pages/sales-agent/contact-us.html'),
 'sales-agent-gallery': resolve(__dirname, 'pages/sales-agent/gallery.html'),
 'sales-agent-about-us': resolve(__dirname, 'pages/sales-agent/about-us.html'),
 'sales-agent-ordering': resolve(__dirname, 'pages/sales-agent/ordering.html'),
 'client-dashboard': resolve(__dirname, 'pages/client/dashboard.html'),
 'client-about-us': resolve(__dirname, 'pages/client/about-us.html'),
 'client-gallery': resolve(__dirname, 'pages/client/gallery.html'),
 'client-contact-us': resolve(__dirname, 'pages/client/contact-us.html'),
 'client-ordering': resolve(__dirname, 'pages/client/ordering.html'),
 'ar-target': resolve(__dirname, 'pages/ar-target.html'),
        // Auth pages
        'auth-login': resolve(__dirname, 'pages/auth/login.html'),
        'auth-signup': resolve(__dirname, 'pages/auth/signup.html'),
        'auth-forgot-password': resolve(__dirname, 'pages/auth/forgot-password.html'),
        // Public pages
        'public-about': resolve(__dirname, 'pages/public/about.html'),
        'public-privacy': resolve(__dirname, 'pages/public/privacy.html'),
        'public-contact': resolve(__dirname, 'pages/public/contact.html'),
        'public-how-it-works': resolve(__dirname, 'pages/public/how-it-works.html'),
        'public-ar-demo': resolve(__dirname, 'pages/public/ar-demo.html'),
        'public-pricing': resolve(__dirname, 'pages/public/pricing.html'),
        'public-404': resolve(__dirname, 'pages/public/404.html'),
        'public-terms': resolve(__dirname, 'pages/public/terms.html'),
        // Gallery
        'gallery': resolve(__dirname, 'pages/gallery/index.html'),
        'gallery-artist': resolve(__dirname, 'pages/gallery/artist.html'),
        'gallery-artwork': resolve(__dirname, 'pages/gallery/artwork.html'),
        // Charity galleries
        'charity-shannon-thomas': resolve(__dirname, 'pages/charity/shannon-thomas.html'),
        'charity-shannon-thomas-admin': resolve(__dirname, 'pages/charity/shannon-thomas-admin.html'),
        // Subscriber pages
        'subscriber-dashboard': resolve(__dirname, 'pages/subscriber/dashboard.html'),
        'subscriber-profile': resolve(__dirname, 'pages/subscriber/profile.html'),
        'subscriber-images': resolve(__dirname, 'pages/subscriber/images.html'),
        'subscriber-images-create': resolve(__dirname, 'pages/subscriber/images-create.html'),
        'subscriber-messages': resolve(__dirname, 'pages/subscriber/messages.html'),
        'subscriber-support': resolve(__dirname, 'pages/subscriber/support.html'),
        'subscriber-upgrade': resolve(__dirname, 'pages/subscriber/upgrade.html'),
        'subscriber-transactions': resolve(__dirname, 'pages/subscriber/transactions.html'),
        'subscriber-analytics': resolve(__dirname, 'pages/subscriber/analytics.html')
      }
    }
  }
});