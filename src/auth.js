export function requireAuth() {
  const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
  if (!user) {
    window.location.href = '/index.html';
    return null;
  }
  return user;
}

export function logout() {
  localStorage.removeItem('currentUser');
  window.location.href = '/index.html';
}

export function getCurrentUser() {
  return JSON.parse(localStorage.getItem('currentUser') || 'null');
}