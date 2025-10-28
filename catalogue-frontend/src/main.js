import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import "@fortawesome/fontawesome-free/css/all.css";
import { initAuth } from "./services/authService";

const app = createApp(App);

// Initialize Auth0 before mounting the app
initAuth().then(() => {
  app.use(router);
  app.mount("#app");
});
