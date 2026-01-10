import {
  createRouter,
  createWebHistory,
  NavigationGuardNext,
  RouteLocationNormalized,
} from "vue-router";
import HomeView from "../views/HomeView.vue";
import CatalogueView from "../views/CatalogueView.vue";
import ReservationsView from "../views/ReservationsView.vue";
import FavouritesView from "../views/FavouritesView.vue";
import ProfileView from "../views/ProfileView.vue";

import { useAuth } from "../composables/useAuth";
import ProductPage from "../views/ProductPage.vue";
import FAQsView from "../views/FAQsView.vue";
import AdminDashboard from "../views/AdminDashboard.vue";
import LoanHistoryView from "../views/LoanHistoryView.vue";
import NotificationsView from "../views/NotificationsView.vue";

const routes = [
  { path: "/", name: "home", component: HomeView },
  {
    path: "/faqs",
    name: "faqs",
    component: FAQsView,
  },
  { path: "/catalogue", name: "catalogue", component: CatalogueView },
  {
    path: "/reservations",
    name: "reservations",
    component: ReservationsView,
    meta: { requiresAuth: true },
  },
  { path: "/product/:id", name: "product", component: ProductPage },

  {
    path: "/favourites",
    name: "favourites",
    component: FavouritesView,
    meta: { requiresAuth: true },
  },
  {
    path: "/profile",
    name: "profile",
    component: ProfileView,
    meta: { requiresAuth: true },
  },
  {
    path: "/notifications",
    name: "notifications",
    component: NotificationsView,
    meta: { requiresAuth: true },
  },
  {
    path: "/admin/dashboard",
    name: "admin-dashboard",
    component: AdminDashboard,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: "/admin/loans-history",
    name: "admin-loans-history",
    component: LoanHistoryView,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Navigation guard: block protected pages if not logged in
router.beforeEach(
  async (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next: NavigationGuardNext
  ) => {
    console.debug("[Router Guard] start", {
      from: from.fullPath,
      to: to.fullPath,
      requiresAuth: Boolean(to.meta.requiresAuth),
      requiresAdmin: Boolean(to.meta.requiresAdmin),
    });
    const { loggedIn, user, ensureInitialized } = useAuth();

    // Wait for auth to initialize (reads from localStorage)
    await ensureInitialized();

    console.debug("[Router Guard] auth state", {
      loggedIn: loggedIn.value,
      userRole: user.value?.role ?? null,
    });

    if (to.meta.requiresAuth && !loggedIn.value) {
      console.debug("[Router Guard] blocking navigation - not logged in");
      next("/");
    } else if (to.meta.requiresAdmin && user.value?.role !== "Admin") {
      console.debug("[Router Guard] blocking navigation - not admin");
      next("/");
    } else {
      console.debug("[Router Guard] navigation allowed");
      next();
    }
  }
);

export default router;
