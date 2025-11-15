<template>
  <div class="loan-history-view">
    <header class="page-header">
      <div>
        <p class="eyebrow">Administration · Insights</p>
        <h1>Loan History Explorer</h1>
        <p class="subtitle">
          Review every device loan and group by user, loan id, or product id to
          spot trends quickly.
        </p>
      </div>
      <button class="refresh-btn" @click="loadLoans" :disabled="loading">
        <i class="fas fa-rotate"></i>
        Refresh
      </button>
    </header>

    <section class="controls">
      <label class="control">
        <span>Search</span>
        <input
          v-model.trim="search"
          type="text"
          placeholder="Search by user, loan, or device"
        />
      </label>

      <label class="control">
        <span>Group By</span>
        <select v-model="groupBy">
          <option value="user">User</option>
          <option value="loan">Loan ID</option>
          <option value="device">Product / Device</option>
        </select>
      </label>

      <label class="control">
        <span>Status</span>
        <select v-model="statusFilter">
          <option value="">All statuses</option>
          <option
            v-for="status in loanStatuses"
            :key="status"
            :value="status"
          >
            {{ status }}
          </option>
        </select>
      </label>
    </section>

    <p v-if="error" class="error-banner">
      <i class="fas fa-circle-exclamation"></i> {{ error }}
    </p>

    <LoanHistoryTable
      :loans="filteredLoans"
      :group-by="groupBy"
      :loading="loading"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import LoanHistoryTable from "../components/LoanHistoryTable.vue";
import type { Loan } from "../types/models";
import { listAllLoans } from "../services/api/loansService";
import { getProductById } from "../services/api/catalogueService";

type GroupBy = "user" | "loan" | "device";

interface EnrichedLoan extends Loan {
  deviceName?: string;
  deviceImage?: string;
}

const loans = ref<EnrichedLoan[]>([]);
const loading = ref(false);
const error = ref("");
const search = ref("");
const statusFilter = ref("");
const groupBy = ref<GroupBy>("user");

const loanStatuses: Loan["status"][] = [
  "Requested",
  "Approved",
  "Collected",
  "Returned",
  "Cancelled",
  "Rejected",
  "Overdue",
];

const filteredLoans = computed(() => {
  const term = search.value.toLowerCase();
  return loans.value.filter((loan) => {
    const matchesTerm =
      !term ||
      [loan.id, loan.userId, loan.deviceId, loan.deviceName]
        .filter(Boolean)
        .some((field) => field!.toString().toLowerCase().includes(term));

    const matchesStatus =
      !statusFilter.value || loan.status === statusFilter.value;

    return matchesTerm && matchesStatus;
  });
});

async function loadLoans() {
  loading.value = true;
  error.value = "";
  try {
    const fetched = await listAllLoans();
    const productCache = new Map<string, { name: string; image?: string }>();

    const enriched = await Promise.all(
      fetched.map(async (loan) => {
        if (!productCache.has(loan.deviceId)) {
          try {
            const product = await getProductById(loan.deviceId);
            productCache.set(loan.deviceId, {
              name: product.name,
              image: (product as any).deviceImage ?? product.imageUrl,
            });
          } catch (productError) {
            console.warn(
              `LoanHistoryView: failed to load product ${loan.deviceId}`,
              productError
            );
            productCache.set(loan.deviceId, {
              name: loan.deviceId,
              image: undefined,
            });
          }
        }

        const meta = productCache.get(loan.deviceId);
        return {
          ...loan,
          deviceName: meta?.name ?? loan.deviceId,
          deviceImage: meta?.image,
        } as EnrichedLoan;
      })
    );

    loans.value = enriched.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (err: any) {
    console.error("LoanHistoryView: failed to load loans", err);
    error.value = err?.message || "Unable to load loans right now.";
  } finally {
    loading.value = false;
  }
}

onMounted(loadLoans);
</script>

<style scoped>
.loan-history-view {
  padding: 2rem 1.5rem 3rem;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 2rem;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-size: 0.8rem;
  color: #7c3aed;
  margin-bottom: 0.25rem;
}

.page-header h1 {
  margin: 0;
  font-size: 2rem;
  color: #0f172a;
}

.subtitle {
  margin-top: 0.4rem;
  color: #475569;
  max-width: 600px;
}

.refresh-btn {
  background: #312e81;
  color: #fff;
  border: none;
  border-radius: 999px;
  padding: 0.65rem 1.4rem;
  font-weight: 600;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.25);
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.refresh-btn:not(:disabled):hover {
  transform: translateY(-1px);
}

.controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.control {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.9rem;
  color: #475569;
}

.control input,
.control select {
  border: 1px solid #cbd5f5;
  border-radius: 10px;
  padding: 0.6rem 0.75rem;
  font-size: 0.95rem;
  background: #fff;
  transition: border-color 0.2s ease;
}

.control input:focus,
.control select:focus {
  outline: none;
  border-color: #7c3aed;
  box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.15);
}

.error-banner {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
  border-radius: 12px;
  padding: 0.9rem 1rem;
  margin-bottom: 1rem;
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
