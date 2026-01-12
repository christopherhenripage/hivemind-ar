import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
 root: '.',
   server: {
    port: 5173,
    strictPort: true
  },
 build: {
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
 'subscriber-admin-analytics': resolve(__dirname, 'pages/subscriber-admin/analytics.html'),
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
 'ar-target': resolve(__dirname, 'pages/ar-target.html')
 }
 }
 }
});