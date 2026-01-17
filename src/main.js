// HiveMind AR - Main JavaScript
import { supabase, checkConnection, isInitialized, getInitError } from './supabase.js';
import { checkAdminAuth } from './admin-auth.js';

// Current lead being edited
let currentEditId = null;

// ============================================
// Initialization
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
  // Check if this is an admin page
  const isAdminPage = window.location.pathname.includes('/subscriber-admin/');

  if (isAdminPage) {
    // Verify admin access before showing anything
    const user = await checkAdminAuth();
    if (!user) return; // checkAdminAuth handles redirect
  }

  initSidebar();
  initModals();

  // Initialize Mini CRM if on that page
  if (document.getElementById('leadsTableBody')) {
    initMiniCRM();
  }
});

async function initMiniCRM() {
  console.log('[MiniCRM] Initializing...');
  await updateConnectionStatus();
  await loadLeads();
}

// ============================================
// Sidebar
// ============================================

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

// ============================================
// Modals
// ============================================

function initModals() {
  // Close modal on overlay click
  document.querySelectorAll('.modal-overlay').forEach(function(overlay) {
    overlay.addEventListener('click', function(e) {
      if (e.target === this) {
        hideModal(this.id);
      }
    });
  });

  // Close modal on X button click
  document.querySelectorAll('.modal-close').forEach(function(btn) {
    btn.addEventListener('click', function() {
      const modal = this.closest('.modal-overlay');
      if (modal) hideModal(modal.id);
    });
  });

  // Close modal on Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach(function(modal) {
        hideModal(modal.id);
      });
    }
  });
}

function showCreateModal() {
  const modal = document.getElementById('createModal');
  if (modal) {
    // Reset form
    const form = document.getElementById('createForm');
    if (form) form.reset();
    modal.classList.add('active');
    console.log('[MiniCRM] Opened create modal');
  }
}

function showEditModal(id) {
  const modal = document.getElementById('editModal');
  if (!modal) {
    console.error('[MiniCRM] Edit modal not found');
    showToast('Edit modal not found', 'error');
    return;
  }

  currentEditId = id;
  console.log('[MiniCRM] Opening edit modal for lead:', id);

  // Find the lead data from the table or fetch from Supabase
  fetchLeadById(id).then(lead => {
    if (lead) {
      document.getElementById('editName').value = lead.name || '';
      document.getElementById('editEmail').value = lead.email || '';
      document.getElementById('editPhone').value = lead.phone || '';
      document.getElementById('editStatus').value = lead.status || 'Hot';
      modal.classList.add('active');
    }
  }).catch(err => {
    console.error('[MiniCRM] Error fetching lead for edit:', err);
    showToast('Failed to load lead data', 'error');
  });
}

function hideModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    currentEditId = null;
    console.log('[MiniCRM] Closed modal:', modalId);
  }
}

// ============================================
// Auth
// ============================================

async function logout() {
  await supabase.auth.signOut();
  window.location.href = '/pages/auth/login.html';
}

// ============================================
// Toast Notifications
// ============================================

function showToast(message, type = 'info') {
  // Remove existing toasts
  const existingToast = document.querySelector('.toast');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 24px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 9999;
    animation: slideIn 0.3s ease;
    max-width: 400px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;

  // Type-specific styling
  switch (type) {
    case 'success':
      toast.style.background = '#10b981';
      break;
    case 'error':
      toast.style.background = '#ef4444';
      break;
    case 'warning':
      toast.style.background = '#f59e0b';
      break;
    default:
      toast.style.background = '#6366f1';
  }

  document.body.appendChild(toast);
  console.log(`[Toast] ${type}: ${message}`);

  // Auto-remove after 4 seconds
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Add toast animation styles
const toastStyles = document.createElement('style');
toastStyles.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(toastStyles);

// ============================================
// Connection Status
// ============================================

async function updateConnectionStatus() {
  const statusEl = document.getElementById('supabaseStatus');
  if (!statusEl) return;

  if (!isInitialized()) {
    const error = getInitError();
    statusEl.innerHTML = `<span style="color: #ef4444;">Supabase: Error - ${error}</span>`;
    console.error('[MiniCRM] Supabase not initialized:', error);
    return;
  }

  const { connected, error } = await checkConnection();
  if (connected) {
    statusEl.innerHTML = '<span style="color: #10b981;">Supabase: Connected</span>';
    console.log('[MiniCRM] Supabase connection verified');
  } else {
    statusEl.innerHTML = `<span style="color: #ef4444;">Supabase: Error - ${error}</span>`;
    console.error('[MiniCRM] Supabase connection failed:', error);
  }
}

// ============================================
// CRUD Operations
// ============================================

async function loadLeads() {
  console.log('[MiniCRM] Loading leads...');

  if (!isInitialized()) {
    console.error('[MiniCRM] Cannot load leads - Supabase not initialized');
    showToast('Database not connected', 'error');
    return;
  }

  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[MiniCRM] Error loading leads:', error);
      showToast(`Failed to load leads: ${error.message}`, 'error');
      return;
    }

    console.log('[MiniCRM] Loaded leads:', data?.length || 0);
    renderLeads(data || []);
  } catch (err) {
    console.error('[MiniCRM] Exception loading leads:', err);
    showToast(`Failed to load leads: ${err.message}`, 'error');
  }
}

async function fetchLeadById(id) {
  if (!isInitialized()) return null;

  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('[MiniCRM] Error fetching lead:', error);
    throw error;
  }

  return data;
}

async function createLead(leadData) {
  console.log('[MiniCRM] Creating lead:', leadData);

  if (!isInitialized()) {
    showToast('Database not connected', 'error');
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('leads')
      .insert([leadData])
      .select();

    if (error) {
      console.error('[MiniCRM] Error creating lead:', error);
      showToast(`Failed to create lead: ${error.message}`, 'error');
      return false;
    }

    console.log('[MiniCRM] Lead created successfully:', data);
    showToast('Lead created successfully', 'success');
    return true;
  } catch (err) {
    console.error('[MiniCRM] Exception creating lead:', err);
    showToast(`Failed to create lead: ${err.message}`, 'error');
    return false;
  }
}

async function updateLead(id, leadData) {
  console.log('[MiniCRM] Updating lead:', id, leadData);

  if (!isInitialized()) {
    showToast('Database not connected', 'error');
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('leads')
      .update(leadData)
      .eq('id', id)
      .select();

    if (error) {
      console.error('[MiniCRM] Error updating lead:', error);
      showToast(`Failed to update lead: ${error.message}`, 'error');
      return false;
    }

    console.log('[MiniCRM] Lead updated successfully:', data);
    showToast('Lead updated successfully', 'success');
    return true;
  } catch (err) {
    console.error('[MiniCRM] Exception updating lead:', err);
    showToast(`Failed to update lead: ${err.message}`, 'error');
    return false;
  }
}

async function deleteLead(id) {
  console.log('[MiniCRM] Deleting lead:', id);

  if (!confirm('Are you sure you want to delete this lead?')) {
    return;
  }

  if (!isInitialized()) {
    showToast('Database not connected', 'error');
    return;
  }

  try {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[MiniCRM] Error deleting lead:', error);
      showToast(`Failed to delete lead: ${error.message}`, 'error');
      return;
    }

    console.log('[MiniCRM] Lead deleted successfully');
    showToast('Lead deleted successfully', 'success');
    await loadLeads();
  } catch (err) {
    console.error('[MiniCRM] Exception deleting lead:', err);
    showToast(`Failed to delete lead: ${err.message}`, 'error');
  }
}

// ============================================
// Rendering
// ============================================

function renderLeads(leads) {
  const tbody = document.getElementById('leadsTableBody');
  if (!tbody) {
    console.warn('[MiniCRM] leadsTableBody not found');
    return;
  }

  if (leads.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: #64748b; padding: 2rem;">
          No leads found. Click "+ Add Lead" to create your first lead.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = leads.map(lead => {
    const statusClass = getStatusBadgeClass(lead.status);
    return `
      <tr data-lead-id="${lead.id}">
        <td>${escapeHtml(lead.name || '')}</td>
        <td>${escapeHtml(lead.email || '')}</td>
        <td>${escapeHtml(lead.phone || '')}</td>
        <td><span class="badge ${statusClass}">${escapeHtml(lead.status || 'Unknown')}</span></td>
        <td>
          <div class="btn-group">
            <button class="btn btn-sm btn-primary" onclick="showEditModal('${lead.id}')">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="deleteLead('${lead.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  console.log('[MiniCRM] Rendered', leads.length, 'leads');
}

function getStatusBadgeClass(status) {
  switch (status?.toLowerCase()) {
    case 'hot':
      return 'badge-success';
    case 'warm':
      return 'badge-warning';
    case 'cold':
      return 'badge-danger';
    default:
      return 'badge-warning';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// Form Submission
// ============================================

async function submitForm(formId) {
  const form = document.getElementById(formId);
  if (!form) {
    console.error('[MiniCRM] Form not found:', formId);
    showToast('Form not found', 'error');
    return;
  }

  if (formId === 'createForm') {
    const name = document.getElementById('createName')?.value?.trim();
    const email = document.getElementById('createEmail')?.value?.trim();
    const phone = document.getElementById('createPhone')?.value?.trim();
    const status = document.getElementById('createStatus')?.value;

    if (!name || !email) {
      showToast('Name and Email are required', 'warning');
      return;
    }

    const success = await createLead({ name, email, phone, status });
    if (success) {
      hideModal('createModal');
      await loadLeads();
    }
  } else if (formId === 'editForm') {
    if (!currentEditId) {
      showToast('No lead selected for editing', 'error');
      return;
    }

    const name = document.getElementById('editName')?.value?.trim();
    const email = document.getElementById('editEmail')?.value?.trim();
    const phone = document.getElementById('editPhone')?.value?.trim();
    const status = document.getElementById('editStatus')?.value;

    if (!name || !email) {
      showToast('Name and Email are required', 'warning');
      return;
    }

    const success = await updateLead(currentEditId, { name, email, phone, status });
    if (success) {
      hideModal('editModal');
      await loadLeads();
    }
  } else {
    console.warn('[MiniCRM] Unknown form:', formId);
    showToast('Unknown form type', 'error');
  }
}

// ============================================
// Other Actions
// ============================================

function sendEmailToAll() {
  showToast('Email functionality coming soon', 'info');
  console.log('[MiniCRM] sendEmailToAll called - placeholder');
}

// ============================================
// Window Exports (for inline onclick handlers)
// ============================================

window.showCreateModal = showCreateModal;
window.showEditModal = showEditModal;
window.hideModal = hideModal;
window.submitForm = submitForm;
window.deleteLead = deleteLead;
window.logout = logout;
window.sendEmailToAll = sendEmailToAll;
