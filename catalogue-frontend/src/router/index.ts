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

import LoginView from "../views/LoginView.vue";
import SignupView from "../views/SignupView.vue";
import { useAuth } from "../composables/useAuth";
import ProductPage from "../views/ProductPage.vue";
import FAQsView from "../views/FAQsView.vue";
import AdminDashboard from "../views/AdminDashboard.vue";

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
  { path: "/login", name: "login", component: LoginView },
  { path: "/signup", name: "signup", component: SignupView },
  {
    path: "/admin/dashboard",
    name: "admin-dashboard",
    component: AdminDashboard,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Navigation guard: block protected pages if not logged in
router.beforeEach(
  (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next: NavigationGuardNext
  ) => {
    const { loggedIn, user } = useAuth();

    if (to.meta.requiresAuth && !loggedIn.value) {
      next("/login");
    } else if (to.meta.requiresAdmin && user.value?.role !== "Admin") {
      next("/");
    } else {
      next();
    }
  }
);

export default router;
