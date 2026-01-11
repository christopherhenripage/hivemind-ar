// HiveMind AR - Main JavaScript

document.addEventListener('DOMContentLoaded', function() {
 initSidebar();
 initModals();
 checkAuth();
});

function initSidebar() {
 const menuToggle = document.querySelector('.menu-toggle');
 const sidebar = document.querySelector('.sidebar');
 const overlay = document.querySelector('.sidebar-overlay');

 if (menuToggle && sidebar) {
 menuToggle.addEventListener('click', function() {
 sidebar.classList.toggle('open');
 if (overlay) overlay.classList.toggle('active');
 });
 }

 if (overlay) {
 overlay.addEventListener('click', function() {
 sidebar.classList.remove('open');
 overlay.classList.remove('active');
 });
 }
}

function initModals() {
 document.querySelectorAll('[data-modal]').forEach(function(btn) {
 btn.addEventListener('click', function() {
 const modalId = this.getAttribute('data-modal');
 const modal = document.getElementById(modalId);
 if (modal) modal.classList.add('active');
 });
 });

 document.querySelectorAll('.modal-close, .modal-overlay').forEach(function(el) {
 el.addEventListener('click', function(e) {
 if (e.target === this) {
 this.closest('.modal-overlay').classList.remove('active');
 }
 });
 });
}

function checkAuth() {
 const role = localStorage.getItem('hivemind_role');
 const isLoginPage = window.location.pathname === '/' || window.location.pathname === '/index.html';
 
 if (!role && !isLoginPage) {
 window.location.href = '/index.html';
 }
}

function logout() {
 localStorage.removeItem('hivemind_role');
 window.location.href = '/index.html';
}

// Placeholder functions for CRUD operations
function showCreateModal() {
 const modal = document.getElementById('createModal');
 if (modal) modal.classList.add('active');
}

function showEditModal(id) {
 const modal = document.getElementById('editModal');
 if (modal) modal.classList.add('active');
 console.log('Editing item:', id);
}

function deleteItem(id) {
 if (confirm('Are you sure you want to delete this item?')) {
 console.log('Deleting item:', id);
 alert('Item deleted (placeholder)');
 }
}

function toggleStatus(id) {
 console.log('Toggling status for:', id);
}

function exportData(format) {
 alert('Exporting data as ' + format + ' (placeholder)');
}

function sendEmailToAll() {
 alert('Sending email to all leads (placeholder)');
}

function submitForm(formId) {
 const form = document.getElementById(formId);
 if (form) {
 alert('Form submitted (placeholder)');
 const modal = form.closest('.modal-overlay');
 if (modal) modal.classList.remove('active');
 }
}