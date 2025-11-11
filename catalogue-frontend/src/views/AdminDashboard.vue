<template>
  <div class="admin-dashboard">
    <h1>Admin Dashboard</h1>

    <div class="toolbar actions">
      <button class="refresh" @click="loadLoans" :disabled="loading">
        Refresh
      </button>
      <span v-if="loading">Loading…</span>
      <span v-if="error" class="error">{{ error }}</span>
    </div>

    <div v-if="!loading && loans.length === 0" class="empty">
      No loans found.
    </div>

    <!-- Requested (highest urgency) -->
    <section class="section">
      <h2>Requested ({{ requestedLoans.length }})</h2>
      <table class="loans-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Device</th>
            <th>Status</th>
            <th>Requested At</th>
            <th>From</th>
            <th>Due (Till)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="requestedLoans.length === 0">
            <td colspan="6">No loans in this state</td>
          </tr>
          <tr v-for="loan in requestedLoans" :key="loan.id">
            <td>{{ loan.id }}</td>
            <td>{{ loan.deviceId }}</td>
            <td>
              <span :class="['badge', statusClass(loan.status)]">{{
                loan.status || "Unknown"
              }}</span>
            </td>
            <td>{{ formatDate(loan.createdAt) }}</td>
            <td>{{ formatDate(loan.from) }}</td>
            <td>{{ formatDate(loan.till) }}</td>
            <td class="actions">
              <button
                class="approve"
                @click="approve(loan)"
                :disabled="busyId === loan.id"
              >
                Approve
              </button>
              <button
                class="deny"
                disabled
                title="Backend endpoint not implemented yet"
              >
                Deny
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Approved (awaiting collection) -->
    <section class="section">
      <h2>Approved ({{ approvedLoans.length }})</h2>
      <table class="loans-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Device</th>
            <th>Status</th>
            <th>From</th>
            <th>Due (Till)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="approvedLoans.length === 0">
            <td colspan="6">No loans in this state</td>
          </tr>
          <tr v-for="loan in approvedLoans" :key="loan.id">
            <td>{{ loan.id }}</td>
            <td>{{ loan.deviceId }}</td>
            <td>
              <span :class="['badge', statusClass(loan.status)]">{{
                loan.status || "Unknown"
              }}</span>
            </td>
            <td>{{ formatDate(loan.from) }}</td>
            <td>{{ formatDate(loan.till) }}</td>
            <td class="actions">
              <button
                disabled
                title="Cancel endpoint not implemented yet"
                @click="cancel(loan)"
              >
                Cancel
              </button>
              <button
                disabled
                title="Collected endpoint not implemented yet"
                @click="markCollected(loan)"
              >
                Mark Collected
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Collected (due soonest first) -->
    <section class="section">
      <h2>Collected ({{ collectedLoans.length }})</h2>
      <table class="loans-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Device</th>
            <th>Status</th>
            <th>Due (Till)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="collectedLoans.length === 0">
            <td colspan="6">No loans in this state</td>
          </tr>
          <tr v-for="loan in collectedLoans" :key="loan.id">
            <td>{{ loan.id }}</td>
            <td>{{ loan.deviceId }}</td>
            <td>
              <span :class="['badge', statusClass(loan.status)]">{{
                loan.status || "Unknown"
              }}</span>
            </td>
            <td>{{ formatDate(loan.till) }}</td>
            <td class="actions">
              <button
                @click="markReturned(loan)"
                :disabled="busyId === loan.id"
              >
                Confirm Return
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Rejected/Returned (lowest urgency) -->
    <section class="section">
      <h2>Rejected ({{ rejectedLoans.length }})</h2>
      <table class="loans-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Device</th>
            <th>Status</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="rejectedLoans.length === 0">
            <td colspan="5">No loans in this state</td>
          </tr>
          <tr v-for="loan in rejectedLoans" :key="loan.id">
            <td>{{ loan.id }}</td>
            <td>{{ loan.deviceId }}</td>
            <td>
              <span :class="['badge', statusClass(loan.status)]">{{
                loan.status || "Unknown"
              }}</span>
            </td>
            <td>{{ formatDate(loan.createdAt) }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="section">
      <h2>Returned ({{ returnedLoans.length }})</h2>
      <table class="loans-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Device</th>
            <th>Status</th>
            <th>Returned Date</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="returnedLoans.length === 0">
            <td colspan="5">No loans in this state</td>
          </tr>
          <tr v-for="loan in returnedLoans" :key="loan.id">
            <td>{{ loan.id }}</td>
            <td>{{ loan.deviceId }}</td>
            <td>
              <span :class="['badge', statusClass(loan.status)]">{{
                loan.status || "Unknown"
              }}</span>
            </td>
            <td>{{ formatDate(loan.createdAt) }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import type { Loan } from "../types/models";
import {
  listAllLoans,
  authorizeLoan,
  returnLoan,
} from "../services/api/loansService";

const loans = ref<Loan[]>([]);
const loading = ref(false);
const error = ref("");
const busyId = ref<string | null>(null);

function formatDate(d: string | Date) {
  try {
    const dt = typeof d === "string" ? new Date(d) : d;
    return dt.toLocaleString();
  } catch {
    return String(d);
  }
}

function statusClass(status?: string) {
  return (status || "unknown").toLowerCase();
}

const requestedLoans = computed(() =>
  loans.value
    .filter((l) => l.status === "Requested")
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
);

const approvedLoans = computed(() =>
  loans.value
    .filter((l) => l.status === "Approved")
    .sort((a, b) => new Date(a.from).getTime() - new Date(b.from).getTime())
);

const collectedLoans = computed(() =>
  loans.value
    .filter((l) => l.status === "Collected")
    .sort((a, b) => new Date(a.till).getTime() - new Date(b.till).getTime())
);

const rejectedLoans = computed(() =>
  loans.value
    .filter((l) => l.status === "Rejected")
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
);

const returnedLoans = computed(() =>
  loans.value
    .filter((l) => l.status === "Returned")
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
);

async function loadLoans() {
  loading.value = true;
  error.value = "";
  try {
    loans.value = await listAllLoans();
    console.log("loans: ", loans.value);
  } catch (e: any) {
    error.value = e?.message || "Failed to load loans";
  } finally {
    loading.value = false;
  }
}

async function approve(loan: Loan) {
  busyId.value = loan.id;
  try {
    const res = await authorizeLoan(loan.id);
    const newStatus = (res?.status || "Approved").toString();
    loan.status = (newStatus.charAt(0).toUpperCase() +
      newStatus.slice(1).toLowerCase()) as Loan["status"];
  } catch (e: any) {
    alert(e?.message || "Failed to approve loan");
  } finally {
    busyId.value = null;
  }
}

async function markCollected(loan: Loan) {
  busyId.value = loan.id;
  try {
    const res = await authorizeLoan(loan.id);
    const newStatus = (res?.status || "Collected").toString();
    loan.status = (newStatus.charAt(0).toUpperCase() +
      newStatus.slice(1).toLowerCase()) as Loan["status"];
  } catch (e: any) {
    alert(e?.message || "Failed to mark loan as collected");
  } finally {
    busyId.value = null;
  }
}

async function markReturned(loan: Loan) {
  busyId.value = loan.id;
  try {
    await returnLoan(loan.id);
    await loadLoans();
  } catch (e: any) {
    alert(e?.message || "Failed to mark as returned");
  } finally {
    busyId.value = null;
  }
}

onMounted(loadLoans);
</script>

<style scoped>
.admin-dashboard {
  padding: 1rem 2rem;
}
.toolbar {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1rem;
}
.section {
  margin-top: 1rem;
}
.error {
  color: #b00020;
}
.empty {
  opacity: 0.7;
}
.loans-table {
  width: 100%;
  border-collapse: collapse;
}
.loans-table th,
.loans-table td {
  border-bottom: 1px solid #eee;
  padding: 0.5rem 0.75rem;
  text-align: left;
}
.actions button {
  margin-right: 0.5rem;
  color: white;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  border: none;
}

.refresh {
  background-color: #867537;
}

.approve {
  background-color: #0f5132;
}

.deny {
  background-color: #842029;
}

.badge {
  padding: 0.15rem 0.4rem;
  border-radius: 6px;
  font-size: 0.85rem;
}
.badge.requested {
  background: #fff3cd;
  color: #7a5d00;
}
.badge.approved {
  background: #d1e7dd;
  color: #0f5132;
}
.badge.rejected {
  background: #f8d7da;
  color: #842029;
}
.badge.collected {
  background: #cfe2ff;
  color: #084298;
}
.badge.returned {
  background: #e2e3e5;
  color: #2b2f32;
}
</style>
