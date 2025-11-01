<template>
  <div
    class="home"
    :style="{ backgroundImage: `url(${cloudinaryAssets.ui.paperBackground})` }"
  >
    <div class="hero-section">
      <img
        :src="cloudinaryAssets.ui.browseWriting"
        alt="Browse devices, view reservations, and manage your favourites"
        class="browse-writing"
      />
    </div>

    <div class="devices-section">
      <div class="devices-container">
        <!-- Laptop -->
        <div class="device-item laptop-container">
          <img
            :src="cloudinaryAssets.pointers.laptopWriting"
            alt="Laptop pointer"
            class="device-pointer"
          />
          <div class="device-wrapper">
            <button
              class="device-button laptop-button"
              @click="navigateToDevice('laptop')"
              aria-label="Browse laptops"
            >
              <img
                :src="cloudinaryAssets.devices.laptop"
                alt="Laptop"
                class="device-image"
              />
            </button>
          </div>
        </div>

        <!-- Tablet -->
        <div class="device-item">
          <img
            :src="cloudinaryAssets.pointers.tabletsWriting"
            alt="Tablet pointer"
            class="device-pointer"
          />
          <div class="device-wrapper">
            <button
              class="device-button tablet-button"
              @click="navigateToDevice('tablet')"
              aria-label="Browse tablets"
            >
              <img
                :src="cloudinaryAssets.devices.tablet"
                alt="Tablet"
                class="device-image"
              />
            </button>
          </div>
        </div>

        <!-- Camera -->
        <div class="device-item">
          <img
            :src="cloudinaryAssets.pointers.camerasWriting"
            alt="Camera pointer"
            class="device-pointer"
          />
          <div class="device-wrapper">
            <button
              class="device-button camera-button"
              @click="navigateToDevice('camera')"
              aria-label="Browse cameras"
            >
              <img
                :src="cloudinaryAssets.devices.camera"
                alt="Camera"
                class="device-image"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { cloudinaryAssets } from "../assets/cloudinary";

const router = useRouter();

const navigateToDevice = (deviceType: string) => {
  // Navigate to catalogue with device type filter
  router.push({
    path: "/catalogue",
    query: { category: deviceType },
  });
};
</script>
<style scoped>
.home {
  min-height: 100vh;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  padding: 2rem;
}

.hero-section {
  text-align: center;
  padding: 2rem 0;
}

.hero-section h1 {
  font-size: 3rem;
  color: #1f2937;
  margin-bottom: 1rem;
  font-weight: 700;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
}

.hero-section p {
  font-size: 1.3rem;
  color: #4b5563;
  max-width: 600px;
  margin: 0 auto;
}

.browse-writing {
  max-width: 400px;
  height: auto;
  margin: 0 auto;
  display: block;
  filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.1));
}

.devices-section {
  max-width: 1400px;
  margin: 0 auto;
}

.devices-section h2 {
  text-align: center;
  font-size: 2.5rem;
  color: #1f2937;
  margin-bottom: 3rem;
  font-weight: 600;
}

.devices-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 3rem;
  flex-wrap: wrap;
}

.device-item {
  display: flex;
  flex-direction: column;
  text-align: center;
  max-width: 300px;
  align-items: center;
  gap: 1rem;
}

/* Device pointer styling - direct img element */
.device-pointer {
  width: 120px;
  height: auto;
  display: block;
  pointer-events: none;
}

/* Responsive design - simple adjustments */
@media (max-width: 1200px) {
  .devices-container {
    gap: 2rem;
  }

  .device-pointer {
    width: 100px;
  }
}

@media (max-width: 768px) {
  .home {
    padding: 1rem;
  }

  .hero-section h1 {
    font-size: 2.2rem;
  }

  .hero-section p {
    font-size: 1.1rem;
  }

  .browse-writing {
    max-width: 90%;
  }

  .devices-section h2 {
    font-size: 2rem;
  }

  .devices-container {
    flex-direction: column;
    align-items: center;
    gap: 3rem;
  }

  .device-item h3 {
    font-size: 1.5rem;
  }
}

@media (max-width: 480px) {
  .hero-section h1 {
    font-size: 1.8rem;
  }

  .devices-section h2 {
    font-size: 1.7rem;
  }
}

.device-wrapper {
  position: relative;
}

.device-button {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  position: relative;
  transition: all 0.3s ease;
  border-radius: 20px;
  overflow: visible;
}

.device-button:hover {
  transform: scale(1.05);
  filter: brightness(1.1);
}

.device-button:active {
  transform: scale(0.98);
}

.device-image {
  width: auto;
  height: 100px;
  display: block;
  transition: all 0.3s ease;
}

/* Laptop button - rectangular with rounded corners */
.laptop-button {
  clip-path: polygon(
    2% 5%,
    98% 5%,
    100% 8%,
    100% 92%,
    98% 95%,
    88% 97%,
    12% 97%,
    2% 95%,
    0% 92%,
    0% 8%
  );
  background-clip: padding-box;
}

.laptop-button:hover {
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.laptop-button:focus {
  outline-offset: 4px;
}

.device-item h3 {
  font-size: 1.8rem;
  color: #1f2937;
  margin: 1.5rem 0 0.5rem 0;
  font-weight: 600;
}

.device-item p {
  font-size: 1rem;
  color: #6b7280;
  line-height: 1.5;
  margin-bottom: 1rem;
}

/* Responsive design */
@media (max-width: 1200px) {
  .devices-container {
    gap: 2rem;
  }

  .laptop-pointer-container {
    top: 280px;
    left: 150px;
  }

  .laptop-pointer {
    width: 100px;
  }
}

@media (max-width: 768px) {
  .home {
    padding: 1rem;
  }

  .hero-section h1 {
    font-size: 2.2rem;
  }

  .hero-section p {
    font-size: 1.1rem;
  }

  .browse-writing {
    max-width: 90%;
  }

  .devices-section h2 {
    font-size: 2rem;
  }

  .devices-container {
    flex-direction: column;
    align-items: center;
    gap: 3rem;
  }

  .laptop-pointer-container {
    top: 350px;
    left: 50%;
    transform: translateX(-50%);
  }

  .laptop-pointer {
    width: 80px;
  }

  .device-item h3 {
    font-size: 1.5rem;
  }
}

@media (max-width: 480px) {
  .hero-section h1 {
    font-size: 1.8rem;
  }

  .devices-section h2 {
    font-size: 1.7rem;
  }
}
</style>
