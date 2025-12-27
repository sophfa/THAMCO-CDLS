<template>
  <section class="notifications-view">
    <header class="page-header">
      <div>
        <p class="eyebrow">Account</p>
        <h1>Notifications</h1>
        <p class="subtitle">Stay up to date with reservation activity.</p>
      </div>
      <div class="actions">
        <label class="group-toggle">
          <span>View</span>
          <select v-model="groupMode">
            <option value="recent">Most recent</option>
            <option value="type">Group by type</option>
          </select>
        </label>
        <button class="refresh-btn" @click="loadNotifications" :disabled="loading">
          Refresh
        </button>
      </div>
    </header>

    <p v-if="error" class="error-banner">
      {{ error }}
    </p>

    <div v-if="loading" class="loading">
      Loading notifications...
    </div>

    <div v-else-if="!notifications.length" class="empty">
      No notifications yet.
    </div>

    <div v-else>
      <div v-if="groupMode === 'recent'" class="notifications-list">
        <article
          v-for="notification in sortedNotifications"
          :key="notification.id"
          class="notification-card"
        >
          <div class="notification-icon" :data-type="notification.type">
            <i :class="getNotificationIcon(notification.type)"></i>
          </div>
          <div class="notification-body">
            <div class="notification-header">
              <h3>{{ notification.title }}</h3>
              <span class="time">{{ formatTime(notification.timestamp) }}</span>
            </div>
            <p class="message">{{ notification.message }}</p>
            <span class="type">{{ formatType(notification.type) }}</span>
          </div>
        </article>
      </div>

      <div v-else class="grouped-list">
        <section
          v-for="group in groupedNotifications"
          :key="group.type"
          class="group"
        >
          <div class="group-header">
            <h2>{{ formatType(group.type) }}</h2>
            <span class="count">{{ group.items.length }}</span>
          </div>
          <article
            v-for="notification in group.items"
            :key="notification.id"
            class="notification-card"
          >
            <div class="notification-icon" :data-type="notification.type">
              <i :class="getNotificationIcon(notification.type)"></i>
            </div>
            <div class="notification-body">
              <div class="notification-header">
                <h3>{{ notification.title }}</h3>
                <span class="time">{{ formatTime(notification.timestamp) }}</span>
              </div>
              <p class="message">{{ notification.message }}</p>
            </div>
          </article>
        </section>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useAuth } from "../composables/useAuth";
import { getUserId } from "../services/authService";
import { getNotificationsForUser } from "../services/api/notificationsService";
import { subscribeToNotifications } from "../services/notificationsHub";

type UiNotification = {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  timestamp: Date;
};

type GroupMode = "recent" | "type";

const { loggedIn } = useAuth();
const notifications = ref<UiNotification[]>([]);
const loading = ref(false);
const error = ref("");
const groupMode = ref<GroupMode>("recent");
let unsubscribeNotifications: (() => Promise<void>) | null = null;

const sortedNotifications = computed(() => {
  return [...notifications.value].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );
});

const groupedNotifications = computed(() => {
  const groups = new Map<string, UiNotification[]>();
  sortedNotifications.value.forEach((notification) => {
    const key = notification.type || "system";
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(notification);
  });
  return Array.from(groups.entries())
    .map(([type, items]) => ({ type, items }))
    .sort((a, b) => {
      const aTime = a.items[0]?.timestamp.getTime() || 0;
      const bTime = b.items[0]?.timestamp.getTime() || 0;
      return bTime - aTime;
    });
});

function formatTime(date: Date) {
  try {
    return date.toLocaleString();
  } catch {
    return String(date);
  }
}

function formatType(type: string) {
  const label = (type || "system").toLowerCase();
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function getNotificationIcon(type: string) {
  const icons: Record<string, string> = {
    reservation: "fas fa-calendar-check",
    availability: "fas fa-check-circle",
    reminder: "fas fa-clock",
    system: "fas fa-info-circle",
    waitlist: "fas fa-user-clock",
    accepted: "fas fa-check",
    rejected: "fas fa-xmark",
    cancelled: "fas fa-ban",
    collected: "fas fa-box",
    returned: "fas fa-rotate-left",
  };
  return icons[type] || "fas fa-bell";
}

async function loadNotifications() {
  if (!loggedIn.value) {
    notifications.value = [];
    return;
  }
  loading.value = true;
  error.value = "";
  try {
    const userId = await getUserId();
    if (!userId) {
      notifications.value = [];
      return;
    }
    notifications.value = await getNotificationsForUser(userId);
  } catch (err) {
    console.error("Failed to load notifications:", err);
    error.value =
      "We couldn't load notifications right now. Please try again.";
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadNotifications();
  if (loggedIn.value && !unsubscribeNotifications) {
    subscribeToNotifications(() => loadNotifications())
      .then((unsubscribe) => {
        unsubscribeNotifications = unsubscribe;
      })
      .catch((err) => {
        console.warn("[Notifications] Live updates unavailable", err);
      });
  }
});

watch(loggedIn, (isLoggedIn) => {
  if (isLoggedIn) {
    loadNotifications();
    if (!unsubscribeNotifications) {
      subscribeToNotifications(() => loadNotifications())
        .then((unsubscribe) => {
          unsubscribeNotifications = unsubscribe;
        })
        .catch((err) => {
          console.warn("[Notifications] Live updates unavailable", err);
        });
    }
  } else {
    notifications.value = [];
    if (unsubscribeNotifications) {
      unsubscribeNotifications().finally(() => {
        unsubscribeNotifications = null;
      });
    }
  }
});

onUnmounted(() => {
  if (unsubscribeNotifications) {
    unsubscribeNotifications().finally(() => {
      unsubscribeNotifications = null;
    });
  }
});
</script>

<style scoped>
.notifications-view {
  padding: 2rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
  color: #6b7280;
  margin: 0 0 0.5rem;
}

.subtitle {
  margin: 0.25rem 0 0;
  color: #6b7280;
}

.actions {
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;
  flex-wrap: wrap;
}

.group-toggle {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
  color: #4b5563;
}

.group-toggle select {
  padding: 0.45rem 0.7rem;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  background: white;
  font-size: 0.9rem;
}

.refresh-btn {
  background: #6c7c69;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.refresh-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error-banner {
  background: #fef2f2;
  color: #b91c1c;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.loading,
.empty {
  background: #f3f4f6;
  color: #374151;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin: 0.5rem 0;
}

.notifications-list,
.grouped-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.group {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1rem;
  background: white;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.group-header h2 {
  margin: 0;
  font-size: 1.1rem;
}

.count {
  background: #f3f4f6;
  color: #4b5563;
  font-size: 0.8rem;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
}

.notification-card {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: white;
  align-items: flex-start;
}

.notification-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  background: #e5e7eb;
  color: #6b7280;
  flex-shrink: 0;
}

.notification-icon[data-type="reservation"] {
  background: #dbeafe;
  color: #3b82f6;
}

.notification-icon[data-type="availability"] {
  background: #d1fae5;
  color: #6c7c69;
}

.notification-icon[data-type="reminder"] {
  background: #fef3c7;
  color: #f59e0b;
}

.notification-icon[data-type="system"] {
  background: #e0e7ff;
  color: #6366f1;
}

.notification-body {
  flex: 1;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
}

.notification-header h3 {
  margin: 0;
  font-size: 1rem;
  color: #1f2937;
}

.time {
  font-size: 0.8rem;
  color: #9ca3af;
  white-space: nowrap;
}

.message {
  margin: 0.35rem 0 0.5rem;
  color: #4b5563;
}

.type {
  display: inline-block;
  font-size: 0.75rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .notification-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
