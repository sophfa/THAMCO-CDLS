<template>
  <div class="admin-dashboard">
    <h1>Admin Dashboard</h1>

    <div class="toolbar">
      <button @click="loadLoans" :disabled="loading">Refresh</button>
      <span v-if="loading">Loading…</span>
      <span v-if="error" class="error">{{ error }}</span>
    </div>

    <div v-if="!loading && loans.length === 0" class="empty">
      No loans found.
    </div>

    <table v-if="!loading && loans.length > 0" class="loans-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>User</th>
          <th>Device</th>
          <th>Status</th>
          <th>From</th>
          <th>Till</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="loan in loans" :key="loan.id">
          <td>{{ loan.id }}</td>
          <td>{{ loan.userId }}</td>
          <td>{{ loan.deviceId }}</td>
          <td>
            <span :class="['badge', loan.status.toLowerCase()]">{{
              loan.status
            }}</span>
          </td>
          <td>{{ formatDate(loan.from) }}</td>
          <td>{{ formatDate(loan.till) }}</td>
          <td class="actions">
            <button
              v-if="loan.status === 'Requested'"
              @click="approve(loan)"
              :disabled="busyId === loan.id"
            >
              Approve
            </button>
            <button
              v-if="loan.status === 'Requested'"
              disabled
              title="Backend endpoint not implemented yet"
            >
              Deny
            </button>
            <button
              v-if="loan.status !== 'Returned'"
              @click="markReturned(loan)"
              :disabled="busyId === loan.id"
            >
              Confirm Return
            </button>
            <button disabled title="Cancel endpoint not implemented yet">
              Cancel
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
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

async function loadLoans() {
  loading.value = true;
  error.value = "";
  try {
    loans.value = await listAllLoans();
    console.log("list of all loans: ", loans.value);
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
    // Map backend response to our status union if present
    const newStatus = (res?.status || "Approved").toString();
    loan.status = (newStatus.charAt(0).toUpperCase() +
      newStatus.slice(1).toLowerCase()) as Loan["status"];
  } catch (e: any) {
    alert(e?.message || "Failed to approve loan");
  } finally {
    busyId.value = null;
  }
}

async function markReturned(loan: Loan) {
  busyId.value = loan.id;
  try {
    const updated = await returnLoan(loan.id);
    loan.status = updated?.status || "Returned";
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
