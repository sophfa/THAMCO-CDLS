<template>
  <section class="reservations">
    <h1>My Reservations</h1>

    <div v-if="!loggedIn" class="info">Please log in to view your reservations.</div>

    <div v-else>
      <div v-if="loading" class="info">Loading your loans…</div>
      <div v-if="error" class="error">{{ error }}</div>

      <div v-if="!loading && !error">
        <div v-if="loans.length === 0" class="info">You have no current loans.</div>

        <ul v-else class="loans">
          <li v-for="loan in loans" :key="loan.id" class="loan">
            <div class="loan-main">
              <div class="loan-title">
                <strong>Device:</strong> {{ loan.deviceId }}
              </div>
              <div class="loan-status" :class="{ active: loan.loaned }">
                {{ loan.loaned ? 'Active' : 'Returned' }}
              </div>
            </div>
            <div class="loan-meta">
              <div v-if="loan.lastLoanedDate"><strong>Loaned:</strong> {{ new Date(loan.lastLoanedDate).toLocaleString() }}</div>
              <div v-if="loan.lastReturnedDate"><strong>Returned:</strong> {{ new Date(loan.lastReturnedDate).toLocaleString() }}</div>
            </div>
            <div class="loan-actions">
              <button
                :disabled="!loan.loaned || returningId === loan.id"
                @click="handleReturn(loan.id)"
              >
                {{ returningId === loan.id ? 'Returning…' : 'Return Device' }}
              </button>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuth } from '../composables/useAuth';
import { getUserId } from '../services/authService';
import { getUserLoans, returnLoan } from '../services/api/loansService';

const { loggedIn } = useAuth();

const loans = ref<any[]>([]);
const loading = ref(true);
const error = ref('');
const returningId = ref<string | null>(null);

const loadLoans = async () => {
  try {
    loading.value = true;
    error.value = '';
    const userId = await getUserId();
    if (!userId) {
      loans.value = [];
      return;
    }
    loans.value = await getUserLoans(userId);
  } catch (e: any) {
    error.value = e?.message || 'Failed to load loans';
  } finally {
    loading.value = false;
  }
};

const handleReturn = async (loanId: string) => {
  try {
    returningId.value = loanId;
    await returnLoan(loanId);
    loans.value = loans.value.map((l) =>
      l.id === loanId ? { ...l, loaned: false, lastReturnedDate: new Date().toISOString() } : l
    );
  } catch (e) {
    // Surface a simple error; could be enhanced with a toast
    error.value = 'Failed to return loan';
  } finally {
    returningId.value = null;
  }
};

onMounted(loadLoans);
</script>

<style scoped>
.reservations {
  padding: 2rem;
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
  color: #059669;
}
.loan-meta {
  grid-column: 1 / -1;
  color: #6b7280;
  font-size: 0.9rem;
}
.loan-actions button {
  background: #2563eb;
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
</style>
