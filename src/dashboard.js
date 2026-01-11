import { requireAuth, getCurrentUser } from './auth.js';
import { initNavigation } from './navigation.js';

const user = requireAuth();
if (user) {
  initNavigation(user.role);
}