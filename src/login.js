document.getElementById('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const role = document.getElementById('role').value;
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  if (role && username && password) {
    localStorage.setItem('currentUser', JSON.stringify({ role, username }));
    window.location.href = `/pages/${role}/index.html`;
  }
});