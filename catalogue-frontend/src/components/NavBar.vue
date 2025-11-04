<template>
  <nav
    class="navbar"
    :style="loggedIn ? 'padding-top: 1.5rem; padding-bottom: 0.5rem;' : ''"
  >
    <div class="brand">
      <img
        :src="cloudinaryAssets.ui.logo"
        alt="ThAmCo Device Loans"
        class="logo"
      />
    </div>

    <ul class="nav-links">
      <li><router-link to="/">Home</router-link></li>
      <li><router-link to="/catalogue">Catalogue</router-link></li>
      <li><router-link to="/faqs">FAQs</router-link></li>

      <template v-if="loggedIn">
        <!-- <li><router-link to="/help">Help</router-link></li> -->

        <!-- Notifications -->
        <li class="notifications-container">
          <button
            @click="toggleNotifications"
            class="notifications-btn"
            :class="{ 'has-unread': hasUnreadNotifications }"
          >
            <i class="fas fa-bell"></i>
            <span v-if="unreadCount > 0" class="notification-badge">{{
              unreadCount
            }}</span>
          </button>

          <div
            v-if="showNotifications"
            class="notifications-dropdown"
            @click.stop
          >
            <div class="notifications-header">
              <h3>Notifications</h3>
              <button @click="markAllAsRead" class="mark-read-btn">
                Mark all as read
              </button>
            </div>

            <div class="notifications-list">
              <div
                v-for="notification in notifications"
                :key="notification.id"
                class="notification-item"
                :class="{ unread: !notification.read }"
                :data-type="notification.type"
                @click="markAsRead(notification.id)"
              >
                <div class="notification-icon">
                  <i :class="getNotificationIcon(notification.type)"></i>
                </div>
                <div class="notification-content">
                  <p class="notification-title">{{ notification.title }}</p>
                  <p class="notification-message">{{ notification.message }}</p>
                  <span class="notification-time">{{
                    formatTime(notification.timestamp)
                  }}</span>
                </div>
                <div v-if="!notification.read" class="unread-dot"></div>
              </div>

              <div v-if="notifications.length === 0" class="no-notifications">
                <i class="fas fa-bell-slash"></i>
                <p>No notifications yet</p>
              </div>
            </div>

            <div class="notifications-footer">
              <button class="view-all-btn">View All Notifications</button>
            </div>
          </div>
        </li>
      </template>
    </ul>

    <div class="profile">
      <template v-if="loggedIn">
        <router-link to="/profile">
          <i class="fas fa-user-circle"></i> {{ user?.name || "Profile" }}
        </router-link>
        <button @click="logout" class="logout">Logout</button>
      </template>

      <template v-else>
        <button @click="handleAuth" class="auth-btn">Login / Sign \up</button>
      </template>
    </div>
  </nav>

  <!-- Sub Navigation Bar -->
  <div v-if="loggedIn" id="headerlinks">
    <template v-if="user?.role === 'Admin'">
      Welcome, {{ user?.name || "Admin" }} |
      <router-link to="/profile">My Account</router-link> |
      <router-link to="/admin/dashboard">Admin Dashboard</router-link>
    </template>
    <template v-else>
      Welcome, {{ user?.name || "User" }} |
      <router-link to="/profile">My Account</router-link> |
      <router-link to="/reservations">My Loans</router-link> |
      <router-link to="/favourites">My Favourites</router-link>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useAuth } from "../composables/useAuth";
import { getUserId, login } from "../services/authService";
import { getNotificationsForUser } from "../services/api/notificationsService";
import { cloudinaryAssets } from "../assets/cloudinary";

const { user, loggedIn, logout } = useAuth();

// Replaces old Login/Signup with Auth0 login redirect
async function handleAuth() {
  await login();
}

watch(loggedIn, async (isLoggedIn) => {
  if (isLoggedIn) {
    const userId = await getUserId();
    const userRole = user.value?.role;
    console.log("User role:", userRole);
    try {
      console.log("Loading notifications for user:", userId);
      notifications.value = await getNotificationsForUser(userId as string);
    } catch (err) {
      console.error("Failed to load notifications:", err);
      notifications.value = [];
    }
  } else {
    notifications.value = [];
  }
});

// Notifications demo data
const showNotifications = ref(false);
const notifications = ref<any[]>([]);

const unreadCount = computed(
  () => notifications.value.filter((n) => !n.read).length
);
const hasUnreadNotifications = computed(() => unreadCount.value > 0);

const toggleNotifications = () => {
  showNotifications.value = !showNotifications.value;
};
const markAsRead = (id: number) => {
  const n = notifications.value.find((n) => n.id === id);
  if (n) n.read = true;
};
const markAllAsRead = () => {
  notifications.value.forEach((n) => (n.read = true));
};
const getNotificationIcon = (type: string) => {
  const icons: Record<string, string> = {
    reservation: "fas fa-calendar-check",
    availability: "fas fa-check-circle",
    reminder: "fas fa-clock",
    system: "fas fa-info-circle",
  };
  return icons[type] || "fas fa-bell";
};
const formatTime = (timestamp: Date) => {
  const diff = Date.now() - timestamp.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
};
const handleClickOutside = (e: Event) => {
  if (!(e.target as Element).closest(".notifications-container")) {
    showNotifications.value = false;
  }
};

onMounted(async () => {
  if (loggedIn.value) {
    const userId = await getUserId();
    try {
      notifications.value = await getNotificationsForUser(userId as string);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  }
  document.addEventListener("click", handleClickOutside);
});
onUnmounted(() => document.removeEventListener("click", handleClickOutside));
</script>

<style scoped>
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: white;
  color: black;
  padding: 1rem 2rem;
}

.nav-links {
  list-style: none;
  display: flex;
  gap: 1rem;
  align-items: center;
}

.nav-links a {
  color: black;
  text-decoration: none;
  font-size: larger;
}

.auth-btn,
.logout {
  background: #867537;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  color: white;
  margin-left: 0.5rem;
  cursor: pointer;
  font-family: "Gentium Book Plus", serif !important;
}

.auth-btn:hover {
  background: #4b5563;
}

.brand {
  font-weight: bold;
  font-size: 1.4rem;
}

.logo {
  height: 65px;
  width: auto;
  max-width: 250px;
  object-fit: contain;
}

.profile {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* Notifications Styling */
.notifications-container {
  position: relative;
}

.notifications-btn {
  background: none;
  border: none;
  color: #867537;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.5rem;
  position: relative;
  transition: all 0.2s ease;
}

.notifications-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.notifications-btn.has-unread {
  color: #fbbf24;
}

.notification-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  background: #ef4444;
  color: white;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.notifications-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  width: 380px;
  max-height: 500px;
  overflow: hidden;
  z-index: 1000;
  margin-top: 0.5rem;
  border: 1px solid #e5e7eb;
}

.notifications-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f9fafb;
}

.notifications-header h3 {
  margin: 0;
  color: #1f2937;
  font-size: 1.1rem;
  font-weight: 600;
}

.mark-read-btn {
  background: none;
  border: none;
  color: #6366f1;
  font-size: 0.875rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  transition: background-color 0.2s;
}

.mark-read-btn:hover {
  background: #e0e7ff;
}

.notifications-list {
  max-height: 320px;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
  transition: background-color 0.2s;
  position: relative;
}

.notification-item:hover {
  background: #f9fafb;
}

.notification-item.unread {
  background: #eff6ff;
}

.notification-item.unread:hover {
  background: #dbeafe;
}

.notification-icon {
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 0.75rem;
  font-size: 1rem;
}

.notification-item[data-type="reservation"] .notification-icon {
  background: #dbeafe;
  color: #3b82f6;
}

.notification-item[data-type="availability"] .notification-icon {
  background: #d1fae5;
  color: #10b981;
}

.notification-item[data-type="reminder"] .notification-icon {
  background: #fef3c7;
  color: #f59e0b;
}

.notification-item[data-type="system"] .notification-icon {
  background: #e0e7ff;
  color: #6366f1;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  margin: 0 0 0.25rem 0;
  color: #1f2937;
  font-weight: 600;
  font-size: 0.875rem;
}

.notification-message {
  margin: 0 0 0.5rem 0;
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.4;
}

.notification-time {
  color: #9ca3af;
  font-size: 0.75rem;
}

.unread-dot {
  position: absolute;
  top: 1.25rem;
  right: 1.25rem;
  width: 8px;
  height: 8px;
  background: #3b82f6;
  border-radius: 50%;
}

.no-notifications {
  padding: 2rem;
  text-align: center;
  color: #9ca3af;
}

.no-notifications i {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  display: block;
}

.notifications-footer {
  padding: 0.75rem 1.25rem;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.view-all-btn {
  width: 100%;
  background: none;
  border: none;
  color: #6366f1;
  font-weight: 500;
  padding: 0.5rem;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.view-all-btn:hover {
  background: #e0e7ff;
}

/* Scrollbar styling */
.notifications-list::-webkit-scrollbar {
  width: 4px;
}

.notifications-list::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.notifications-list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 2px;
}

.notifications-list::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Sub Navigation Bar Styling */
#headerlinks {
  position: absolute;
  right: 50px;
  top: 0;
  padding: 5px 10px;
  color: #666;
  background: #ebebeb;
  border-radius: 0 0 10px 10px;
  a {
    text-decoration: none !important;
  }
}

.auth-link {
  background: none;
  border: none;
  cursor: pointer;
}

/* Responsive Sub Navigation */
@media only screen and (min-width: 45em) {
  #headerlinks,
  #top-headerlinks {
    display: block;
  }
}

@media only screen and (min-width: 719px) and (max-width: 941px) {
  #headerlinks {
    right: 40px;
  }
}

@media only screen and (max-width: 768px) {
  #headerlinks {
    position: relative;
    right: auto;
    top: auto;
    margin-top: 0;
    border-radius: 0;
    background: #f5f5f5;
    border-top: 1px solid #ddd;
    padding: 6px 12px;
  }

  .sub-nav-content {
    justify-content: center;
    flex-wrap: wrap;
    gap: 6px;
  }
}
</style>
