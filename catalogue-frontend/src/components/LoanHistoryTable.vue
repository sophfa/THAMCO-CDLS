<template>
  <div class="loan-history-table">
    <div v-if="loading" class="state state-loading">
      <span class="spinner" /> Loading loan history…
    </div>

    <div v-else-if="!groupedLoans.length" class="state state-empty">
      <i class="fas fa-folder-open"></i>
      <p>No loans match your filters.</p>
    </div>

    <section v-for="group in groupedLoans" :key="group.key" class="group-card">
      <header class="group-header">
        <div>
          <h3>{{ group.label }}</h3>
          <p class="group-meta">
            {{ group.items.length }} loan{{
              group.items.length === 1 ? "" : "s"
            }}
          </p>
        </div>
        <span class="group-id">{{ group.key }}</span>
      </header>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Loan ID</th>
              <th>User ID</th>
              <th>Device</th>
              <th>Status</th>
              <th>From</th>
              <th>Until</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="loan in group.items" :key="loan.id">
              <td class="mono">{{ loan.id }}</td>
              <td class="mono">{{ loan.userId }}</td>
              <td>
                <div class="device-cell">
                  <img
                    v-if="loan.deviceImage"
                    :src="loan.deviceImage"
                    alt=""
                    class="device-thumb"
                  />
                  <div>
                    <div class="device-name">
                      {{ loan.deviceName || loan.deviceId }}
                    </div>
                    <div class="device-id mono">{{ loan.deviceId }}</div>
                  </div>
                </div>
              </td>
              <td>
                <span class="status-chip" :class="statusClass(loan.status)">
                  {{ loan.status }}
                </span>
              </td>
              <td>{{ formatDate(loan.from) }}</td>
              <td>{{ formatDate(loan.till) }}</td>
              <td>{{ formatDate(loan.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Loan } from "../types/models";
import { getUser } from "../services/authService";

type GroupByOption = "user" | "loan" | "device";

interface LoanHistoryRecord extends Loan {
  deviceName?: string;
  deviceImage?: string;
}

const props = defineProps<{
  loans: LoanHistoryRecord[];
  groupBy: GroupByOption;
  loading?: boolean;
}>();

interface GroupedLoans {
  key: string;
  label: string;
  items: LoanHistoryRecord[];
}

const groupedLoans = computed<GroupedLoans[]>(() => {
  if (!props.loans?.length) {
    return [];
  }

  if (props.groupBy === "loan") {
    return props.loans.map((loan) => ({
      key: loan.id,
      label: `Loan #${loan.id}`,
      items: [loan],
    }));
  }

  const labelFor = (
    key: string,
    sample: LoanHistoryRecord | undefined
  ): string => {
    if (!sample) return key;
    if (props.groupBy === "user") {
      return `User ${key}`;
    }
    if (props.groupBy === "device") {
      const name = sample.deviceName || sample.deviceId;
      return `${name}`;
    }
    return key;
  };

  const map = new Map<string, LoanHistoryRecord[]>();
  const keySelector =
    props.groupBy === "user"
      ? (loan: LoanHistoryRecord) => loan.userId
      : (loan: LoanHistoryRecord) => loan.deviceId;

  props.loans.forEach((loan) => {
    const key = keySelector(loan);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(loan);
  });

  return Array.from(map.entries()).map(([key, items]) => ({
    key,
    label: labelFor(key, items[0]),
    items: items.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
  }));
});

function formatDate(value: string | Date): string {
  if (!value) return "—";
  try {
    const date = typeof value === "string" ? new Date(value) : value;
    return date.toLocaleString();
  } catch {
    return String(value);
  }
}

function statusClass(status: string | undefined) {
  return (status || "unknown").toLowerCase();
}
</script>

<style scoped>
.loan-history-table {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.group-card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem;
  border-bottom: 1px solid #eef2ff;
  background: linear-gradient(90deg, #eef2ff, #fff);
}

.group-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #1f2937;
}

.group-meta {
  margin: 0.1rem 0 0;
  color: #6b7280;
  font-size: 0.9rem;
}

.group-id {
  font-family: "JetBrains Mono", monospace;
  font-size: 0.8rem;
  color: #4c1d95;
  background: #ede9fe;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
}

.table-wrapper {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: #f9fafb;
}

th,
td {
  padding: 0.9rem 1rem;
  text-align: left;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: middle;
}

th {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;
}

tbody tr:hover {
  background: #f8fafc;
}

.device-cell {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.device-thumb {
  width: 44px;
  height: 44px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.device-name {
  font-weight: 600;
  color: #111827;
}

.device-id {
  color: #6b7280;
  font-size: 0.8rem;
}

.status-chip {
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  font-size: 0.8rem;
  text-transform: capitalize;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.status-chip.requested {
  background: #fef9c3;
  color: #854d0e;
}
.status-chip.approved {
  background: #dcfce7;
  color: #166534;
}
.status-chip.rejected {
  background: #fee2e2;
  color: #b91c1c;
}
.status-chip.collected {
  background: #e0f2fe;
  color: #0c4a6e;
}
.status-chip.returned {
  background: #ede9fe;
  color: #4c1d95;
}
.status-chip.cancelled {
  background: #fef2f2;
  color: #b91c1c;
}
.status-chip.overdue {
  background: #fee2e2;
  color: #9a3412;
}

.mono {
  font-family: "JetBrains Mono", monospace;
  font-size: 0.85rem;
}

.state {
  border: 1px dashed #cbd5f5;
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  color: #475569;
  background: #f8fafc;
}

.state i {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  color: #c4b5fd;
}

.state-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: center;
}

.spinner {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 3px solid #c4b5fd;
  border-top-color: transparent;
  animation: spin 0.75s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
