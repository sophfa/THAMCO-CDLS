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
          <div class="section-header">
            <div>
              <h2>Upcoming Reservations</h2>
              <p class="section-subtitle">
                Review scheduled pick-ups and cancel directly before collection.
              </p>
            </div>
          </div>
          <div class="reservation-list" v-if="reservations.length">
            <article
              v-for="r in reservations"
              :key="r.id"
              class="reservation-card"
            >
              <div class="reservation-card-contents">
                <img
                  v-if="r.deviceImage"
                  :src="r.deviceImage"
                  alt=""
                  class="reservation-image"
                />
                <div class="reservation-card-info">
                  <div class="reservation-card-header">
                    <div class="reservation-title">
                      <div>
                        <strong>{{ r.deviceName || r.deviceId }}</strong>
                        <div class="reservation-subtitle">#{{ r.id }}</div>
                      </div>
                    </div>
                    <span class="chip" :class="r.status.toLowerCase()">
                      {{ r.status }}
                    </span>
                  </div>
                  <div class="reservation-footer">
                    <div class="reservation-dates">
                      <div>
                        <label>Collect</label>
                        <span>{{
                          new Date(r.from as any).toLocaleString()
                        }}</span>
                      </div>
                      <div>
                        <label>Return</label>
                        <span>{{
                          new Date(r.till as any).toLocaleString()
                        }}</span>
                      </div>
                    </div>
                    <div class="reservation-actions">
                      <button
                        v-if="
                          r.status === 'Requested' || r.status === 'Approved'
                        "
                        class="cancel-btn"
                        :disabled="cancelingId === r.id"
                        @click="handleCancelReservation(r.id)"
                      >
                        {{
                          cancelingId === r.id
                            ? "Cancelling…"
                            : "Cancel Reservation"
                        }}
                      </button>
                      <p v-else class="reservation-note">
                        This reservation can no longer be cancelled.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>
          <div v-else class="info">You have no upcoming reservations.</div>
        </section>

        <!-- Active Loans -->
        <section class="loans-section">
          <div class="section-header">
            <div>
              <h2>Active Loans</h2>
              <p class="section-subtitle">
                Devices currently checked out under your account.
              </p>
            </div>
          </div>
          <div v-if="activeLoans.length === 0" class="info">
            You have no active loans.
          </div>
          <div v-else class="card-list">
            <article
              v-for="loan in activeLoans"
              :key="loan.id"
              class="reservation-card"
            >
              <div class="reservation-card-contents">
                <img
                  v-if="loan.deviceImage"
                  :src="loan.deviceImage"
                  alt=""
                  class="reservation-image"
                />
                <div class="reservation-card-info">
                  <div class="reservation-card-header">
                    <div class="reservation-title">
                      <div>
                        <strong>{{ loan.deviceName || loan.deviceId }}</strong>
                        <div class="reservation-subtitle">#{{ loan.id }}</div>
                      </div>
                    </div>
                    <span class="chip collected">On Loan</span>
                  </div>
                  <div class="reservation-footer">
                    <div class="reservation-dates">
                      <div>
                        <label>From</label>
                        <span>{{
                          new Date(loan.from as any).toLocaleString()
                        }}</span>
                      </div>
                      <div>
                        <label>Until</label>
                        <span>{{
                          new Date(loan.till as any).toLocaleString()
                        }}</span>
                      </div>
                    </div>
                    <div class="reservation-actions">
                      <button
                        class="primary-btn"
                        :disabled="
                          loan.status !== 'Collected' || returningId === loan.id
                        "
                        @click="handleReturn(loan.id)"
                      >
                        {{
                          returningId === loan.id ? "Returning…" : "Return Device"
                        }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>

        <!-- Waitlist -->
        <section class="waitlist-section">
          <div class="section-header">
            <div>
              <h2>Waitlist Status</h2>
              <p class="section-subtitle">
                Track your position and leave the queue when needed.
              </p>
            </div>
          </div>
          <div v-if="waitlistLoading" class="info">
            Loading waitlist status...
          </div>
          <div v-else-if="waitlistEntries.length === 0" class="info">
            You are not on any waitlists.
          </div>
          <div v-else class="card-list">
            <article
              v-for="entry in waitlistEntries"
              :key="entry.id"
              class="reservation-card"
            >
              <div class="reservation-card-contents">
                <img
                  v-if="entry.deviceImage"
                  :src="entry.deviceImage"
                  alt=""
                  class="reservation-image"
                />
                <div class="reservation-card-info">
                  <div class="reservation-card-header">
                    <div class="reservation-title">
                      <div>
                        <strong>{{ entry.deviceName || entry.deviceId }}</strong>
                        <div class="reservation-subtitle">#{{ entry.id }}</div>
                      </div>
                    </div>
                    <span class="chip position-chip">
                      Position #{{ entry.position }}
                    </span>
                  </div>
                  <div class="reservation-footer">
                    <div class="reservation-dates">
                      <div>
                        <label>Joined</label>
                        <span>{{ new Date(entry.id).toLocaleString() }}</span>
                      </div>
                      <div v-if="entry.estimatedAvailability">
                        <label>Est. Available</label>
                        <span>
                          {{
                            new Date(entry.estimatedAvailability).toLocaleDateString()
                          }}
                        </span>
                      </div>
                    </div>
                    <div class="reservation-actions">
                      <button
                        class="cancel-btn"
                        @click="handleLeaveWaitlist(entry.id)"
                        :disabled="leavingWaitlistId === entry.id"
                      >
                        {{
                          leavingWaitlistId === entry.id
                            ? "Leaving..."
                            : "Leave Waitlist"
                        }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>
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
  cancelLoan,
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
const cancelingId = ref<string | null>(null);

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

const handleCancelReservation = async (loanId: string) => {
  try {
    cancelingId.value = loanId;
    await cancelLoan(loanId);
    await loadData();
  } catch (e: any) {
    error.value = e?.message || "Failed to cancel reservation";
  } finally {
    cancelingId.value = null;
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
.card-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.75rem;
}
.reservation-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1rem;
  background: #fff;
  box-shadow: 0 10px 15px -12px rgba(15, 23, 42, 0.25);
  margin-bottom: 0.75rem;
}

.reservation-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.reservation-title {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  font-size: 1rem;
}
.reservation-image {
  width: 100px;
  height: auto;
  padding: 1rem;
  border-radius: 10px;
  object-fit: cover;
  border: 1px solid #e5e7eb;
}
.reservation-subtitle {
  font-size: 0.8rem;
  color: #6b7280;
}
.chip {
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  font-size: 0.75rem;
  text-transform: capitalize;
  border: 1px solid transparent;
}
.chip.requested {
  background: #fef3c7;
  border-color: #f59e0b;
  color: #92400e;
}
.chip.approved {
  background: #ede9fe;
  border-color: #8b5cf6;
  color: #5b21b6;
}
.chip.collected {
  background: #e1f5ea;
  border-color: #6c7c69;
  color: #2f3b2f;
}
.chip.returned {
  background: #f3f4f6;
  border-color: #d1d5db;
  color: #374151;
}
.chip.rejected {
  background: #fee2e2;
  border-color: #f87171;
  color: #b91c1c;
}
.position-chip {
  background: #e0f2fe;
  border-color: #38bdf8;
  color: #0369a1;
}

.reservation-card-contents {
  display: flex;
  flex-direction: row;
  gap: 1rem;
}

.reservation-card-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.75rem;
}

.reservation-footer {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1rem;
}

.reservation-dates {
  display: flex;
  gap: 1.5rem;
  margin-top: 0.5rem;
  color: #4b5563;
  flex-wrap: wrap;
}
.reservation-dates label {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: #9ca3af;
}
.reservation-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: flex-end;
  justify-content: flex-end;
  margin-left: auto;
}
.reservation-actions button {
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease;
}
.reservation-actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.cancel-btn {
  background: #a6383e;
  color: #fff;
}
.cancel-btn:hover:not([disabled]) {
  opacity: 0.9;
}
.primary-btn {
  background: #6c7c69;
  color: #fff;
}
.primary-btn:hover:not([disabled]) {
  opacity: 0.9;
}
.reservation-note {
  color: #6b7280;
  font-size: 0.85rem;
  margin: 0;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.section-subtitle {
  color: #6b7280;
  font-size: 0.9rem;
  margin-top: 0.25rem;
}
.loans-section,
.waitlist-section {
  margin-top: 2rem;
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
</style>
