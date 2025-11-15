<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { authStore, api, type UserResponse } from '../services/api';

const isLoggedIn = ref(false);
const user = ref<UserResponse | null>(null);
const showUserMenu = ref(false);

onMounted(async () => {
  await checkAuthStatus();
});

const checkAuthStatus = async () => {
  if (!authStore.isAuthenticated()) {
    isLoggedIn.value = false;
    return;
  }

  try {
    const response = await api.user.getMyProfile();
    user.value = response.data;
    isLoggedIn.value = true;
  } catch (error) {
    console.error('Failed to get user profile:', error);
    // Token might be expired, clear it
    authStore.clearTokens();
    isLoggedIn.value = false;
  }
};

const handleLogin = () => {
  api.auth.googleLogin();
};

const handleLogout = async () => {
  const refreshToken = authStore.getRefreshToken();
  if (refreshToken) {
    try {
      await api.auth.logout(refreshToken);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  authStore.clearTokens();
  isLoggedIn.value = false;
  user.value = null;
  window.location.href = '/';
};
</script>

<template>
  <nav class="navbar">
    <div class="container">
      <div class="nav-content flex items-center justify-between">
        <!-- Logo -->
        <div class="nav-brand">
          <a href="/" class="logo gradient-text text-2xl font-bold">
            LoRA Platform
          </a>
        </div>

        <!-- Navigation Links -->
        <div class="nav-links flex items-center gap-lg">
          <router-link to="/" class="nav-link">Explore</router-link>
          <router-link to="/search" class="nav-link">Search</router-link>
          <router-link to="/generate" class="nav-link">Generate</router-link>
          <router-link to="/training" class="nav-link">Training</router-link>
        </div>

        <!-- User Section -->
        <div class="nav-user flex items-center gap-md">
          <template v-if="isLoggedIn && user">
            <div class="user-menu" @click="showUserMenu = !showUserMenu">
              <div class="flex items-center gap-sm cursor-pointer">
                <img
                  :src="user.profileImageUrl || 'https://via.placeholder.com/40'"
                  alt="Profile"
                  class="avatar"
                />
                <span class="text-primary">{{ user.nickname }}</span>
              </div>

              <!-- Dropdown Menu -->
              <div v-if="showUserMenu" class="dropdown-menu card">
                <router-link to="/profile" class="dropdown-item">
                  <span>Profile</span>
                </router-link>
                <router-link to="/my-models" class="dropdown-item">
                  <span>My Models</span>
                </router-link>
                <router-link to="/favorites" class="dropdown-item">
                  <span>Favorites</span>
                </router-link>
                <div class="divider"></div>
                <button @click="handleLogout" class="dropdown-item">
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </template>

          <template v-else>
            <button @click="handleLogin" class="btn btn-primary btn-sm">Login with Google</button>
          </template>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  padding: var(--space-md) 0;
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(10px);
  background: rgba(10, 10, 10, 0.9);
}

.nav-content {
  height: 60px;
}

.logo {
  text-decoration: none;
  transition: opacity 0.3s ease;
}

.logo:hover {
  opacity: 0.8;
}

.nav-links {
  flex: 1;
  justify-content: center;
}

.nav-link {
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 500;
  font-size: 16px;
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  transition: all 0.3s ease;
}

.nav-link:hover,
.nav-link.router-link-active {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.user-menu {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  min-width: 200px;
  padding: var(--space-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  box-shadow: var(--shadow-lg);
}

.dropdown-item {
  padding: var(--space-sm) var(--space-md);
  color: var(--text-secondary);
  text-decoration: none;
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  width: 100%;
}

.dropdown-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

@media (max-width: 768px) {
  .nav-links {
    display: none;
  }

  .nav-brand .logo {
    font-size: 18px;
  }
}
</style>
