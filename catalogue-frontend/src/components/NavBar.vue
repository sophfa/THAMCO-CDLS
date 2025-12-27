<template>
  <nav
    class="navbar"
    :style="
      loggedIn
        ? 'padding-top: 1.5rem; max-width: 100vw; padding-bottom: 0.5rem;'
        : ''
    "
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
                v-if="notificationsError"
                class="notifications-error"
                role="status"
              >
                <i class="fas fa-circle-exclamation"></i>
                <p>{{ notificationsError }}</p>
              </div>
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

              <div
                v-if="!notificationsError && notifications.length === 0"
                class="no-notifications"
              >
                <i class="fas fa-bell-slash"></i>
                <p>No notifications yet</p>
              </div>
            </div>

            <div class="notifications-footer">
              <button class="view-all-btn" @click="viewAllNotifications">
                View All Notifications
              </button>
            </div>
          </div>
        </li>
      </template>
    </ul>

    <div class="profile">
      <template v-if="loggedIn">
        <router-link to="/profile">
          <i class="fas fa-user-circle"></i> {{ user?.nickname || "Profile" }}
        </router-link>
        <button @click="logout" class="logout">Logout</button>
      </template>

      <template v-else>
        <button @click="handleAuth" class="auth-btn">Login / Sign up</button>
      </template>
    </div>
  </nav>

  <!-- Sub Navigation Bar -->
  <div v-if="loggedIn" id="headerlinks">
    <template v-if="user?.role === 'Admin'">
      Welcome, {{ user?.nickname || "Admin" }} |
      <router-link to="/profile">My Account</router-link> |
      <router-link to="/admin/dashboard">Admin Dashboard</router-link> |
      <router-link to="/admin/loans-history">Loan History</router-link>
    </template>
    <template v-else>
      Welcome, {{ user?.nickname || "User" }} |
      <router-link to="/profile">My Account</router-link> |
      <router-link to="/reservations">My Loans</router-link> |
      <router-link to="/favourites">My Favourites</router-link>
    </template>
  </div>

  <div v-if="toastItems.length > 0" class="toast-container" aria-live="polite">
    <div v-for="toast in toastItems" :key="toast.id" class="toast-card">
      <div class="toast-icon">
        <i :class="getNotificationIcon(toast.type)"></i>
      </div>
      <div class="toast-body">
        <p class="toast-title">{{ toast.title }}</p>
        <p class="toast-message">{{ toast.message }}</p>
      </div>
      <button class="toast-dismiss" @click="dismissToast(toast.id)">
        <i class="fas fa-xmark"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "../composables/useAuth";
import { getUserId, getUserRole, login } from "../services/authService";
import {
  getNotificationsForUser,
  markNotificationRead,
  normalizeNotification,
} from "../services/api/notificationsService";
import { subscribeToNotifications } from "../services/notificationsHub";
import { cloudinaryAssets } from "../assets/cloudinary";

const { user, loggedIn, logout } = useAuth();
const router = useRouter();

// Replaces old Login/Signup with Auth0 login redirect
async function handleAuth() {
  await login();
}

// Notifications demo data
const showNotifications = ref(false);
const notifications = ref<any[]>([]);
const notificationsError = ref("");
let unsubscribeNotifications: (() => Promise<void>) | null = null;
const toastItems = ref<
  Array<{ id: string; title: string; message: string; type: string }>
>([]);
const toastTimers = new Map<string, number>();
const toastTimeoutMs = 4500;

const loadNotifications = async () => {
  if (!loggedIn.value) {
    notifications.value = [];
    notificationsError.value = "";
    return;
  }
  const userId = await getUserId();
  if (!userId) {
    notifications.value = [];
    return;
  }
  try {
    notificationsError.value = "";
    notifications.value = await getNotificationsForUser(userId as string);
  } catch (err) {
    console.error("Failed to load notifications:", err);
    notificationsError.value =
      "We couldn't load notifications right now. Please try again.";
  }
};

const handleRealtimeNotification = (payload: unknown) => {
  const next = normalizeNotification(payload as any);
  if (next && !notifications.value.some((n) => n.id === next.id)) {
    notifications.value = [next, ...notifications.value];
    if (!toastItems.value.some((t) => t.id === next.id)) {
      addToast(next);
    }
  }
  void loadNotifications();
};

const addToast = (notification: {
  id: string;
  title: string;
  message: string;
  type: string;
}) => {
  toastItems.value = [notification, ...toastItems.value].slice(0, 3);
  if (toastTimers.has(notification.id)) return;
  const timer = window.setTimeout(
    () => dismissToast(notification.id),
    toastTimeoutMs
  );
  toastTimers.set(notification.id, timer);
};

const dismissToast = (id: string) => {
  const timer = toastTimers.get(id);
  if (timer) {
    clearTimeout(timer);
    toastTimers.delete(id);
  }
  toastItems.value = toastItems.value.filter((t) => t.id !== id);
};

watch(loggedIn, async (isLoggedIn) => {
  if (isLoggedIn) {
    const userRole = await getUserRole();
    user.value.role = userRole;
    await loadNotifications();
    if (!unsubscribeNotifications) {
      try {
        unsubscribeNotifications = await subscribeToNotifications(
          handleRealtimeNotification
        );
      } catch (err) {
        console.warn("[Notifications] Live updates unavailable", err);
      }
    }
  } else {
    notifications.value = [];
    notificationsError.value = "";
    toastItems.value = [];
    toastTimers.forEach((timer) => clearTimeout(timer));
    toastTimers.clear();
    if (unsubscribeNotifications) {
      await unsubscribeNotifications();
      unsubscribeNotifications = null;
    }
  }
});

const unreadCount = computed(
  () => notifications.value.filter((n) => !n.read).length
);
const hasUnreadNotifications = computed(() => unreadCount.value > 0);

const toggleNotifications = () => {
  showNotifications.value = !showNotifications.value;
};
const markAsRead = async (id: string) => {
  const n = notifications.value.find((n) => n.id === id);
  if (!n || n.read) return;
  const prev = n.read;
  n.read = true;
  try {
    await markNotificationRead(id, true);
  } catch (e) {
    n.read = prev;
  }
};
const markAllAsRead = async () => {
  const toMark = notifications.value.filter((n) => !n.read);
  toMark.forEach((n) => (n.read = true));
  try {
    await Promise.all(toMark.map((n) => markNotificationRead(n.id, true)));
  } catch (e) {
    console.error("Failed to persist read status for some notifications", e);
  }
};
const viewAllNotifications = () => {
  showNotifications.value = false;
  router.push({ name: "notifications" });
};
const getNotificationIcon = (type: string) => {
  const icons: Record<string, string> = {
    reservation: "fas fa-calendar-check",
    waitlist: "fas fa-user-clock",
    availability: "fas fa-check-circle",
    accepted: "fas fa-check",
    rejected: "fas fa-xmark",
    cancelled: "fas fa-ban",
    collected: "fas fa-box",
    returned: "fas fa-rotate-left",
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
  await loadNotifications();
  if (loggedIn.value && !unsubscribeNotifications) {
    try {
      unsubscribeNotifications = await subscribeToNotifications(
        handleRealtimeNotification
      );
    } catch (err) {
      console.warn("[Notifications] Live updates unavailable", err);
    }
  }
  document.addEventListener("click", handleClickOutside);
});
onUnmounted(async () => {
  document.removeEventListener("click", handleClickOutside);
  toastTimers.forEach((timer) => clearTimeout(timer));
  toastTimers.clear();
  if (unsubscribeNotifications) {
    await unsubscribeNotifications();
    unsubscribeNotifications = null;
  }
});
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

.toast-container {
  position: fixed;
  right: 24px;
  bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 2000;
  width: min(360px, 90vw);
}

.toast-card {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  background: #ffffff;
  border-radius: 12px;
  padding: 12px 14px;
  box-shadow: 0 16px 30px rgba(15, 23, 42, 0.18);
  border: 1px solid rgba(148, 163, 184, 0.35);
  animation: toastIn 0.2s ease-out;
}

.toast-icon {
  height: 34px;
  width: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: rgba(37, 99, 235, 0.1);
  color: #2563eb;
  font-size: 0.95rem;
  flex: 0 0 auto;
}

.toast-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.toast-title {
  margin: 0;
  font-weight: 600;
  font-size: 0.95rem;
  color: #0f172a;
}

.toast-message {
  margin: 0;
  font-size: 0.85rem;
  color: #475569;
}

.toast-dismiss {
  margin-left: auto;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  padding: 0;
}

.toast-dismiss:hover {
  color: #0f172a;
}

@keyframes toastIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 600px) {
  .toast-container {
    right: 16px;
    left: 16px;
  }
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
  background: #a6383e;
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
  color: #6c7c69;
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

.notifications-error {
  padding: 1rem 1.25rem;
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  color: #b91c1c;
  background: #fef2f2;
  border-bottom: 1px solid #fee2e2;
}

.notifications-error i {
  margin-top: 0.15rem;
}

.notifications-error p {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.4;
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
