<template>
  <section class="reservations">
    <h1>My Loans</h1>

    <div v-if="!loggedIn" class="info">Please log in to view your loans.</div>

    <div v-else>
      <div v-if="loading" class="info">Loading your account…</div>
      <div v-if="error" class="error">{{ error }}</div>

      <div v-if="!loading && !error">
        <!-- Reservations Calendar -->
        <section class="calendar-section">
          <div class="calendar-header">
            <button class="nav" @click="prevMonth">‹</button>
            <h2>{{ monthLabel }}</h2>
            <button class="nav" @click="nextMonth">›</button>
          </div>
          <div class="calendar-grid">
            <div
              class="dow"
              v-for="d in ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']"
              :key="d"
            >
              {{ d }}
            </div>
            <div
              v-for="d in calendarDays"
              :key="d.toISOString()"
              class="day"
              :class="[
                statusClassForDay(d),
                { other: d.getMonth() !== currentMonth.getMonth() },
              ]"
            >
              <span class="date">{{ d.getDate() }}</span>
            </div>
          </div>
          <div class="legend">
            <span class="legend-item"
              ><i class="swatch active"></i> Active (Collected)</span
            >
            <span class="legend-item"
              ><i class="swatch approved"></i> Approved</span
            >
            <span class="legend-item"
              ><i class="swatch reserved"></i> Requested</span
            >
          </div>
        </section>

        <section class="reservations-section">
          <h2>Reservations</h2>
          <div class="reservation-list" v-if="reservations.length">
            <ul>
              <li v-for="r in reservations" :key="r.id">
                <strong>{{ r.deviceName }}</strong>
                <span>
                  • {{ new Date(r.from as any).toLocaleDateString() }} →
                  {{ new Date(r.till as any).toLocaleDateString() }}
                </span>
                <span class="status"> ({{ r.status }})</span>
              </li>
            </ul>
          </div>
          <div v-else class="info">You have no upcoming reservations.</div>
        </section>

        <!-- Active Loans -->
        <section class="loans-section">
          <h2>Active Loans</h2>
          <div v-if="activeLoans.length === 0" class="info">
            You have no active loans.
          </div>
          <ul v-else class="loans">
            <li v-for="loan in activeLoans" :key="loan.id" class="loan">
              <div class="loan-main">
                <div class="loan-title">
                  <strong>Device:</strong> {{ loan.deviceName }}
                </div>
              </div>
              <div class="loan-meta">
                <div>
                  <strong>From:</strong>
                  {{ new Date(loan.from as any).toLocaleString() }}
                </div>
                <div>
                  <strong>Until:</strong>
                  {{ new Date(loan.till as any).toLocaleString() }}
                </div>
              </div>
              <div class="loan-actions">
                <button
                  :disabled="
                    loan.status !== 'Collected' || returningId === loan.id
                  "
                  @click="handleReturn(loan.id)"
                >
                  {{ returningId === loan.id ? "Returning…" : "Return Device" }}
                </button>
              </div>
            </li>
          </ul>
        </section>

        <!-- Waitlist -->
        <section class="waitlist-section">
          <h2>Waitlist Status</h2>
          <div v-if="waitlistLoading" class="info">
            Loading waitlist status...
          </div>
          <div v-else-if="waitlistEntries.length === 0" class="info">
            You are not on any waitlists.
          </div>
          <ul v-else class="waitlist">
            <li
              v-for="entry in waitlistEntries"
              :key="entry.id"
              class="waitlist-entry"
            >
              <div class="waitlist-main">
                <div class="waitlist-title">
                  <strong>Device:</strong>
                  {{ entry.deviceName || entry.deviceId }}
                </div>
                <div
                  class="waitlist-position"
                  :class="getPositionClass(entry.position)"
                >
                  Position #{{ entry.position }}
                </div>
              </div>
              <div class="waitlist-meta">
                <div v-if="entry.estimatedAvailability">
                  <strong>Est. Available:</strong>
                  {{
                    new Date(entry.estimatedAvailability).toLocaleDateString()
                  }}
                </div>
              </div>
              <div class="waitlist-actions">
                <button
                  @click="handleLeaveWaitlist(entry.id)"
                  :disabled="leavingWaitlistId === entry.id"
                  class="leave-btn"
                >
                  {{
                    leavingWaitlistId === entry.id
                      ? "Leaving..."
                      : "Leave Waitlist"
                  }}
                </button>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useAuth } from "../composables/useAuth";
import { getUserId, getUserEmail } from "../services/authService";
import {
  getUserLoans,
  returnLoan,
  getUserWaitlistEntries,
  removeFromWaitlist,
} from "../services/api/loansService";
import { createNotification } from "../services/api/notificationsService";
import { getProductById } from "../services/api/catalogueService";
import type { LoanWithDeviceName, WaitlistEntry } from "../types/models";

const { loggedIn } = useAuth();

const loans = ref<LoanWithDeviceName[]>([]);
const reservations = ref<LoanWithDeviceName[]>([]);
const waitlistEntries = ref<WaitlistEntry[]>([]);
const loading = ref(true);
const waitlistLoading = ref(false);
const error = ref("");
const returningId = ref<string | null>(null);
const leavingWaitlistId = ref<string | null>(null);

const loadData = async () => {
  try {
    loading.value = true;
    error.value = "";

    // Wait for auth to be ready
    if (!loggedIn.value) {
      loans.value = [];
      reservations.value = [];
      waitlistEntries.value = [];
      loading.value = false;
      return;
    }

    const userId = await getUserId();
    if (!userId) {
      loans.value = [];
      reservations.value = [];
      waitlistEntries.value = [];
      loading.value = false;
      return;
    }

    // Load loans data
    const rawLoans = await getUserLoans(userId);
    loans.value = await Promise.all(
      rawLoans.map(async (l) => {
        const product = await getProductById(l.deviceId);
        return {
          ...l,
          deviceName: product.name,
          deviceImage:
            (product as any).deviceImage ?? (product as any).imageUrl,
        };
      })
    );
    console.log("loans:", loans.value);

    // Reservations are loans in Requested/Approved state
    reservations.value = loans.value.filter(
      (l) => l.status === "Requested" || l.status === "Approved"
    );
    console.log("reservations:", reservations.value);

    // Load waitlist data
    await loadWaitlistData(userId);
  } catch (e: any) {
    error.value = e?.message || "Failed to load data";
  } finally {
    loading.value = false;
  }
};

const loadWaitlistData = async (userId: string) => {
  try {
    waitlistLoading.value = true;
    const waitlistData = await getUserWaitlistEntries(userId);
    console.log("raw response: ", waitlistData);
    // Enhance waitlist entries with device names
    waitlistEntries.value = await Promise.all(
      waitlistData.map(async (entry) => {
        try {
          const product = await getProductById(entry.deviceId);
          return {
            ...entry,
            deviceName: product.name,
            deviceImage:
              (product as any).deviceImage ?? (product as any).imageUrl,
          };
        } catch (e) {
          console.warn(
            `Failed to load product data for device ${entry.deviceId}:`,
            e
          );
          return entry; // Return entry without device name if product lookup fails
        }
      })
    );
    console.log("waitlist entries:", waitlistEntries.value);
  } catch (e: any) {
    console.error("Failed to load waitlist data:", e);
    // Don't set error here as it's secondary data - just log it
  } finally {
    waitlistLoading.value = false;
  }
};

const handleReturn = async (loanId: string) => {
  try {
    returningId.value = loanId;
    await returnLoan(loanId);
    // Fire-and-forget: notify user that device was returned
    try {
      const uid = await getUserId();
      const email = await getUserEmail();
      const returnedLoan = loans.value.find((l) => l.id === loanId);
      if (uid && returnedLoan) {
        await createNotification(uid, "Returned", returnedLoan.deviceId, {
          userEmail: email || undefined,
        });
      }
    } catch (e) {
      console.warn("Return notification failed:", e);
    }
    loans.value = loans.value.map((l) =>
      l.id === loanId
        ? { ...l, loaned: false, lastReturnedDate: new Date().toISOString() }
        : l
    );
  } catch (e) {
    // Surface a simple error; could be enhanced with a toast
    error.value = "Failed to return loan";
  } finally {
    returningId.value = null;
  }
};

const handleLeaveWaitlist = async (id: string) => {
  try {
    leavingWaitlistId.value = id;
    const userId = await getUserId();
    if (!userId) return;

    await removeFromWaitlist(userId, id);
    // Remove from local state
    waitlistEntries.value = waitlistEntries.value.filter(
      (entry) => entry.id !== id
    );

    console.log(`Successfully left waitlist for loan ${id}`);
  } catch (e: any) {
    console.error("Failed to leave waitlist:", e);
    error.value = "Failed to leave waitlist";
  } finally {
    leavingWaitlistId.value = null;
  }
};

const getPositionClass = (position: number) => {
  if (position === 1) return "first";
  if (position <= 3) return "top";
  return "waiting";
};

onMounted(loadData);

// Watch for login state changes and reload data
watch(loggedIn, (isLoggedIn) => {
  if (isLoggedIn) {
    loadData();
  }
});

const activeLoans = computed(() =>
  loans.value.filter((l) => l.status === "Collected")
);

// Calendar state & helpers
const currentMonth = ref(
  new Date(new Date().getFullYear(), new Date().getMonth(), 1)
);
const monthLabel = computed(() =>
  currentMonth.value.toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  })
);
function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // Monday=0
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}
function endOfWeek(d: Date) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() + (6 - day));
  date.setHours(23, 59, 59, 999);
  return date;
}
const calendarDays = computed(() => {
  const start = startOfWeek(new Date(currentMonth.value));
  const monthEnd = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth() + 1,
    0
  );
  const end = endOfWeek(monthEnd);
  const days: Date[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
});
function inRange(date: Date, startIso: string, endIso: string) {
  const d = new Date(date.toDateString());
  const s = new Date(new Date(startIso).toDateString());
  const e = new Date(new Date(endIso).toDateString());
  return d >= s && d <= e;
}

function statusClassForDay(date: Date) {
  // Priority: active (Collected) > approved > reserved
  const has = (statuses: Array<"Requested" | "Approved" | "Collected">) =>
    loans.value.some(
      (l) =>
        statuses.includes(l.status as any) &&
        inRange(date, l.from as any, l.till as any)
    );
  if (has(["Collected"])) return "active";
  if (has(["Approved"])) return "approved";
  if (has(["Requested"])) return "reserved";
  return "";
}
function prevMonth() {
  currentMonth.value = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth() - 1,
    1
  );
}
function nextMonth() {
  currentMonth.value = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth() + 1,
    1
  );
}
</script>

<style scoped>
.reservations {
  padding: 2rem;
}
.calendar-section {
  margin: 1.5rem 0 2rem;
}
.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.calendar-header .nav {
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 6px;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
}
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-top: 0.75rem;
}
.dow {
  text-align: center;
  font-weight: 600;
  color: #6b7280;
  padding: 0.25rem 0;
}
.day {
  min-height: 56px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 0.25rem;
  position: relative;
}
.day.other {
  background: #fafafa;
  color: #9ca3af;
}
.day.hasReservation {
  background: #ecfeff;
  border-color: #06b6d4;
}
.day.active {
  background: #ecfeff; /* cyan-50 */
  border-color: #06b6d4; /* cyan-500 */
}
.day.approved {
  background: #f5f3ff; /* violet-50 */
  border-color: #8b5cf6; /* violet-500 */
}
.day.reserved {
  background: #fffbeb; /* amber-50 */
  border-color: #f59e0b; /* amber-500 */
}
.legend {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-top: 0.5rem;
  color: #6b7280;
  font-size: 0.9rem;
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.swatch {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 3px;
  border: 1px solid #d1d5db;
}
.swatch.active {
  background: #ecfeff;
  border-color: #06b6d4;
}
.swatch.approved {
  background: #f5f3ff;
  border-color: #8b5cf6;
}
.swatch.reserved {
  background: #fffbeb;
  border-color: #f59e0b;
}
.day .date {
  position: absolute;
  top: 4px;
  right: 6px;
  font-size: 0.8rem;
  color: #6b7280;
}
.reservation-list {
  margin-top: 0.75rem;
}
.loans-section h2 {
  margin-top: 1rem;
}
.info {
  background: #f3f4f6;
  color: #374151;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin: 0.5rem 0;
}
.error {
  background: #fef2f2;
  color: #b91c1c;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin: 0.5rem 0;
}
.loans {
  list-style: none;
  padding: 0;
  margin: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.loan {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.5rem 1rem;
}
.loan-main {
  display: flex;
  gap: 1rem;
  align-items: center;
}
.loan-status {
  font-weight: 600;
  color: #374151;
}
.loan-status.active {
  color: #6c7c69;
}
.loan-meta {
  grid-column: 1 / -1;
  color: #6b7280;
  font-size: 0.9rem;
}
.loan-actions button {
  background: #6c7c69;
  color: white;
  border: none;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
}
.loan-actions button[disabled] {
  background: #9ca3af;
  cursor: not-allowed;
}

/* Waitlist Section */
.waitlist-section {
  margin-top: 2rem;
}
.waitlist-section h2 {
  margin-bottom: 1rem;
  color: #374151;
}
.waitlist {
  list-style: none;
  padding: 0;
  margin: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.waitlist-entry {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  background: #fafafa;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.5rem 1rem;
}
.waitlist-main {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
}
.waitlist-title {
  font-weight: 500;
}
.waitlist-position {
  font-weight: 700;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.9rem;
}
.waitlist-position.first {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #bbf7d0;
}
.waitlist-position.top {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}
.waitlist-position.waiting {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}
.waitlist-meta {
  grid-column: 1 / -1;
  color: #6b7280;
  font-size: 0.9rem;
  display: flex;
  gap: 1rem;
}
.waitlist-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.waitlist-actions .leave-btn {
  background: #a6383e;
  color: white;
  border: none;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
}
.waitlist-actions .leave-btn:hover {
  background: #b91c1c;
}
.waitlist-actions .leave-btn[disabled] {
  background: #9ca3af;
  cursor: not-allowed;
}
</style>
