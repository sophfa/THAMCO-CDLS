<template>
  <div class="faqs-container">
    <div class="header-section">
      <h1>Frequently Asked Questions</h1>
      <p class="header-subtitle">
        Find answers to common questions about device loans and our services
      </p>
    </div>

    <div class="search-section">
      <div class="search-bar">
        <i class="fas fa-search search-icon"></i>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search FAQs..."
          class="search-input"
        />
        <button v-if="searchQuery" @click="clearSearch" class="clear-btn">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>

    <div class="categories-section">
      <h2>Browse by Category</h2>
      <div class="category-grid">
        <button
          v-for="category in categories"
          :key="category.id"
          @click="filterByCategory(category.id)"
          :class="[
            'category-card',
            { active: selectedCategory === category.id },
          ]"
        >
          <i :class="category.icon"></i>
          <span>{{ category.name }}</span>
          <span class="count">({{ category.count }})</span>
        </button>
      </div>
    </div>

    <div class="faqs-section">
      <div class="section-header">
        <h2>
          {{ getDisplayTitle() }}
          <span class="results-count" v-if="filteredFAQs.length > 0">
            ({{ filteredFAQs.length }}
            {{ filteredFAQs.length === 1 ? "result" : "results" }})
          </span>
        </h2>
        <button
          v-if="selectedCategory || searchQuery"
          @click="clearFilters"
          class="clear-filters-btn"
        >
          <i class="fas fa-times"></i> Clear filters
        </button>
      </div>

      <div v-if="filteredFAQs.length === 0" class="no-results">
        <i class="fas fa-question-circle"></i>
        <h3>No FAQs found</h3>
        <p v-if="searchQuery">
          Try adjusting your search terms or browse by category above.
        </p>
        <p v-else>No FAQs available for this category at the moment.</p>
      </div>

      <div class="faq-list">
        <div
          v-for="faq in filteredFAQs"
          :key="faq.id"
          class="faq-item"
          :class="{ expanded: expandedItems.includes(faq.id) }"
        >
          <button
            @click="toggleFAQ(faq.id)"
            class="faq-question"
            :aria-expanded="expandedItems.includes(faq.id)"
          >
            <span class="question-text">{{ faq.question }}</span>
            <span class="category-tag">{{
              getCategoryName(faq.categoryId)
            }}</span>
            <i
              :class="[
                'fas',
                expandedItems.includes(faq.id)
                  ? 'fa-chevron-up'
                  : 'fa-chevron-down',
                'expand-icon',
              ]"
            ></i>
          </button>

          <transition name="fade-slide">
            <div v-if="expandedItems.includes(faq.id)" class="faq-answer">
              <div class="answer-content" v-html="faq.answer"></div>
              <div v-if="faq.helpful !== undefined" class="helpful-section">
                <span class="helpful-text">Was this helpful?</span>
                <div class="helpful-buttons">
                  <button
                    @click="markHelpful(faq.id, true)"
                    :class="['helpful-btn', { active: faq.userVote === true }]"
                  >
                    <i class="fas fa-thumbs-up"></i>
                    Yes ({{ faq.helpfulCount || 0 }})
                  </button>
                  <button
                    @click="markHelpful(faq.id, false)"
                    :class="['helpful-btn', { active: faq.userVote === false }]"
                  >
                    <i class="fas fa-thumbs-down"></i>
                    No ({{ faq.notHelpfulCount || 0 }})
                  </button>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>

    <div class="contact-section">
      <div class="contact-card">
        <h3>Still need help?</h3>
        <p>
          If you couldn't find what you're looking for, our support team is here
          to help.
        </p>
        <div class="contact-options">
          <router-link to="/contact" class="contact-btn primary">
            <i class="fas fa-envelope"></i>
            Contact Support
          </router-link>
          <a href="tel:+1234567890" class="contact-btn secondary">
            <i class="fas fa-phone"></i>
            Call Us
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";

interface FAQ {
  id: number;
  question: string;
  answer: string;
  categoryId: string;
  helpful?: boolean;
  helpfulCount?: number;
  notHelpfulCount?: number;
  userVote?: boolean | null;
  tags?: string[];
  lastUpdated?: Date;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
}

// Reactive state
const searchQuery = ref("");
const selectedCategory = ref<string | null>(null);
const expandedItems = ref<number[]>([]);

// Categories data
const categories = ref<Category[]>([
  {
    id: "devices",
    name: "Devices & Equipment",
    icon: "fas fa-laptop",
    count: 8,
  },
  {
    id: "loans",
    name: "Loan Process",
    icon: "fas fa-calendar-check",
    count: 6,
  },
  {
    id: "account",
    name: "Account & Profile",
    icon: "fas fa-user-circle",
    count: 5,
  },
  {
    id: "technical",
    name: "Technical Support",
    icon: "fas fa-tools",
    count: 7,
  },
  {
    id: "policies",
    name: "Policies & Terms",
    icon: "fas fa-file-contract",
    count: 4,
  },
  {
    id: "billing",
    name: "Billing & Payments",
    icon: "fas fa-credit-card",
    count: 3,
  },
]);

// FAQs data
const faqs = ref<FAQ[]>([
  {
    id: 1,
    categoryId: "devices",
    question: "What types of devices are available for loan?",
    answer: `
      <p>We offer a wide range of devices including:</p>
      <ul>
        <li><strong>Laptops:</strong> Windows, Mac, and Chromebooks</li>
        <li><strong>Tablets:</strong> iPads, Android tablets, and Surface devices</li>
        <li><strong>Smartphones:</strong> iOS and Android devices</li>
        <li><strong>Accessories:</strong> Chargers, adapters, keyboards, mice</li>
        <li><strong>Specialized Equipment:</strong> Cameras, recording equipment, projectors</li>
      </ul>
      <p>All devices are regularly maintained and updated to ensure optimal performance.</p>
    `,
    helpfulCount: 42,
    notHelpfulCount: 3,
  },
  {
    id: 2,
    categoryId: "loans",
    question: "How long can I borrow a device?",
    answer: `
      <p>Loan periods vary depending on the device type and your status:</p>
      <ul>
        <li><strong>Students:</strong> Up to 30 days for most devices</li>
        <li><strong>Faculty/Staff:</strong> Up to 90 days with renewal options</li>
        <li><strong>Short-term loans:</strong> 1-7 days for immediate needs</li>
      </ul>
      <p>Extensions may be available based on device availability and your loan history.</p>
    `,
    helpfulCount: 38,
    notHelpfulCount: 5,
  },
  {
    id: 3,
    categoryId: "account",
    question: "How do I create an account?",
    answer: `
      <p>Creating an account is simple:</p>
      <ol>
        <li>Click "Sign Up" in the top navigation</li>
        <li>Enter your institutional email address</li>
        <li>Verify your email through the confirmation link</li>
        <li>Complete your profile with required information</li>
        <li>Upload a valid ID for verification</li>
      </ol>
      <p>Your account will be activated within 24 hours after verification.</p>
    `,
    helpfulCount: 28,
    notHelpfulCount: 2,
  },
  {
    id: 4,
    categoryId: "technical",
    question: "What should I do if a device is not working properly?",
    answer: `
      <p>If you encounter technical issues:</p>
      <ol>
        <li><strong>Basic troubleshooting:</strong> Try restarting the device</li>
        <li><strong>Check connections:</strong> Ensure all cables are properly connected</li>
        <li><strong>Software issues:</strong> Check for available updates</li>
        <li><strong>Report the issue:</strong> Contact our technical support team immediately</li>
      </ol>
      <p><strong>Important:</strong> Do not attempt repairs yourself. Report any damage or malfunction as soon as possible to avoid additional charges.</p>
    `,
    helpfulCount: 35,
    notHelpfulCount: 1,
  },
  {
    id: 5,
    categoryId: "policies",
    question: "What happens if I damage or lose a device?",
    answer: `
      <p>In case of damage or loss:</p>
      <ul>
        <li><strong>Minor damage:</strong> May be covered by normal wear and tear</li>
        <li><strong>Significant damage:</strong> Repair costs will be assessed</li>
        <li><strong>Lost devices:</strong> Full replacement cost will be charged</li>
        <li><strong>Theft:</strong> File a police report and notify us immediately</li>
      </ul>
      <p>We recommend purchasing device insurance for high-value items.</p>
    `,
    helpfulCount: 25,
    notHelpfulCount: 8,
  },
  {
    id: 6,
    categoryId: "billing",
    question: "Are there any fees for borrowing devices?",
    answer: `
      <p>Our fee structure:</p>
      <ul>
        <li><strong>Students:</strong> Most loans are free for the first 30 days</li>
        <li><strong>Extended loans:</strong> $5/week after the initial period</li>
        <li><strong>Late returns:</strong> $2/day penalty fee</li>
        <li><strong>Damage fees:</strong> Varies based on repair costs</li>
        <li><strong>Replacement fees:</strong> Full device value</li>
      </ul>
      <p>Payment can be made through your student account or by credit card.</p>
    `,
    helpfulCount: 31,
    notHelpfulCount: 4,
  },
]);

// Computed properties
const filteredFAQs = computed(() => {
  let filtered = faqs.value;

  // Filter by category
  if (selectedCategory.value) {
    filtered = filtered.filter(
      (faq) => faq.categoryId === selectedCategory.value
    );
  }

  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (faq) =>
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query)
    );
  }

  return filtered;
});

// Methods
const toggleFAQ = (id: number) => {
  const index = expandedItems.value.indexOf(id);
  if (index > -1) {
    expandedItems.value.splice(index, 1);
  } else {
    expandedItems.value.push(id);
  }
};

const filterByCategory = (categoryId: string) => {
  if (selectedCategory.value === categoryId) {
    selectedCategory.value = null;
  } else {
    selectedCategory.value = categoryId;
  }
  // Clear search when filtering by category
  searchQuery.value = "";
};

const clearSearch = () => {
  searchQuery.value = "";
};

const clearFilters = () => {
  selectedCategory.value = null;
  searchQuery.value = "";
};

const getCategoryName = (categoryId: string): string => {
  const category = categories.value.find((cat) => cat.id === categoryId);
  return category ? category.name : "General";
};

const getDisplayTitle = (): string => {
  if (searchQuery.value.trim()) {
    return `Search Results for "${searchQuery.value}"`;
  } else if (selectedCategory.value) {
    return getCategoryName(selectedCategory.value);
  }
  return "All FAQs";
};

const markHelpful = (faqId: number, isHelpful: boolean) => {
  const faq = faqs.value.find((f) => f.id === faqId);
  if (faq) {
    // Reset previous vote if any
    if (faq.userVote === true && faq.helpfulCount) {
      faq.helpfulCount--;
    } else if (faq.userVote === false && faq.notHelpfulCount) {
      faq.notHelpfulCount--;
    }

    // Apply new vote
    if (faq.userVote === isHelpful) {
      // User clicked the same button, remove vote
      faq.userVote = null;
    } else {
      // New vote
      faq.userVote = isHelpful;
      if (isHelpful) {
        faq.helpfulCount = (faq.helpfulCount || 0) + 1;
      } else {
        faq.notHelpfulCount = (faq.notHelpfulCount || 0) + 1;
      }
    }
  }
};

// Lifecycle
onMounted(() => {
  // Update category counts based on actual FAQ data
  categories.value.forEach((category) => {
    category.count = faqs.value.filter(
      (faq) => faq.categoryId === category.id
    ).length;
  });
});
</script>

<style scoped>
.faqs-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
}

.header-section {
  text-align: center;
  margin-bottom: 3rem;
}

.header-section h1 {
  font-size: 2.5rem;
  color: #1f2937;
  margin-bottom: 1rem;
  font-weight: 700;
}

.header-subtitle {
  font-size: 1.2rem;
  color: #6b7280;
  max-width: 600px;
  margin: 0 auto;
}

.search-section {
  margin-bottom: 3rem;
}

.search-bar {
  position: relative;
  max-width: 600px;
  margin: 0 auto;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  z-index: 1;
}

.search-input {
  width: 100%;
  padding: 1rem 1rem 1rem 3rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.clear-btn {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.25rem;
}

.clear-btn:hover {
  color: #6b7280;
}

.categories-section {
  margin-bottom: 3rem;
}

.categories-section h2 {
  font-size: 1.5rem;
  color: #1f2937;
  margin-bottom: 1.5rem;
  font-weight: 600;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.category-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.25rem;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;
}

.category-card:hover {
  border-color: #3b82f6;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.category-card.active {
  border-color: #3b82f6;
  background: #eff6ff;
}

.category-card i {
  font-size: 1.5rem;
  color: #3b82f6;
  width: 24px;
  text-align: center;
}

.category-card span {
  font-weight: 500;
  color: #1f2937;
}

.count {
  margin-left: auto;
  color: #6b7280;
  font-size: 0.875rem;
}

.faqs-section {
  margin-bottom: 3rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.section-header h2 {
  font-size: 1.75rem;
  color: #1f2937;
  font-weight: 600;
  margin: 0;
}

.results-count {
  color: #6b7280;
  font-size: 1rem;
  font-weight: 400;
}

.clear-filters-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-filters-btn:hover {
  background: #e5e7eb;
  color: #4b5563;
}

.no-results {
  text-align: center;
  padding: 3rem;
  color: #6b7280;
}

.no-results i {
  font-size: 3rem;
  margin-bottom: 1rem;
  color: #d1d5db;
}

.no-results h3 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  color: #4b5563;
}

.faq-item {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  overflow: hidden;
  transition: all 0.3s ease;
  margin-bottom: 1rem;
}

.faq-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.faq-item.expanded {
  border-color: #3b82f6;
}

.faq-question {
  width: 100%;
  padding: 1.5rem;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: background-color 0.2s ease;
}

.faq-question:hover {
  background: #f9fafb;
}

.question-text {
  flex: 1;
  font-size: 1.1rem;
  font-weight: 600;
  color: #1f2937;
}

.category-tag {
  padding: 0.25rem 0.75rem;
  background: #e0e7ff;
  color: #3b82f6;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.expand-icon {
  color: #6b7280;
  transition: transform 0.3s ease;
}

.faq-item.expanded .expand-icon {
  transform: rotate(180deg);
}

.faq-answer {
  padding: 0 1.5rem 1.5rem;
  border-top: 1px solid #f3f4f6;
}

.answer-content {
  color: #4b5563;
  line-height: 1.7;
  margin-bottom: 1rem;
}

.answer-content ul,
.answer-content ol {
  margin: 1rem 0;
  padding-left: 1.5rem;
}

.answer-content li {
  margin-bottom: 0.5rem;
}

.answer-content strong {
  color: #1f2937;
  font-weight: 600;
}

.helpful-section {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #f3f4f6;
  margin-top: 1rem;
}

.helpful-text {
  font-weight: 500;
  color: #6b7280;
}

.helpful-buttons {
  display: flex;
  gap: 0.5rem;
}

.helpful-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
}

.helpful-btn:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.helpful-btn.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.contact-section {
  background: #f9fafb;
  border-radius: 1rem;
  padding: 2rem;
  text-align: center;
}

.contact-card h3 {
  font-size: 1.5rem;
  color: #1f2937;
  margin-bottom: 1rem;
  font-weight: 600;
}

.contact-card p {
  color: #6b7280;
  margin-bottom: 2rem;
  font-size: 1.1rem;
}

.contact-options {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.contact-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.contact-btn.primary {
  background: #3b82f6;
  color: white;
}

.contact-btn.primary:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.contact-btn.secondary {
  background: white;
  color: #3b82f6;
  border-color: #3b82f6;
}

.contact-btn.secondary:hover {
  background: #3b82f6;
  color: white;
  transform: translateY(-1px);
}

/* Transitions */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Responsive design */
@media (max-width: 768px) {
  .faqs-container {
    padding: 1rem;
  }

  .header-section h1 {
    font-size: 2rem;
  }

  .header-subtitle {
    font-size: 1rem;
  }

  .category-grid {
    grid-template-columns: 1fr;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .faq-question {
    padding: 1rem;
  }

  .question-text {
    font-size: 1rem;
  }

  .category-tag {
    display: none;
  }

  .helpful-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .contact-options {
    flex-direction: column;
  }

  .contact-btn {
    justify-content: center;
  }
}
</style>
