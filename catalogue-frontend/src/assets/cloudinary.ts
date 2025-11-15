/**
 * Centralized Cloudinary asset management
 * All remote asset URLs are managed here for easy maintenance
 */

// UI/Navigation Assets
export const uiAssets = {
  logo: "https://res.cloudinary.com/do7m4rqdz/image/upload/v1761991879/Logo_t88wco.png",
  logoImg:
    "https://res.cloudinary.com/do7m4rqdz/image/upload/v1761991879/Logo-img_qr32nt.png",
  paperBackground:
    "https://res.cloudinary.com/do7m4rqdz/image/upload/v1761991880/paper_dhlhle.png",
  browseWriting:
    "https://res.cloudinary.com/do7m4rqdz/image/upload/v1761991879/browse-writing_mwzl6k.png",
  vue: "https://res.cloudinary.com/do7m4rqdz/image/upload/v1761991885/vue_jkpria.svg",
};

// Device Category Assets
export const deviceAssets = {
  laptop:
    "https://res.cloudinary.com/do7m4rqdz/image/upload/v1761991879/Laptop_phjv29.png",
  tablet:
    "https://res.cloudinary.com/do7m4rqdz/image/upload/v1761991885/Tablet-white_hrzdne.png",
  tabletAlt:
    "https://res.cloudinary.com/do7m4rqdz/image/upload/v1761991880/Tablet_lssqjs.png",
  camera:
    "https://res.cloudinary.com/do7m4rqdz/image/upload/v1761991878/Camera_de7vad.png",
};

// Pointer/Writing Assets
export const pointerAssets = {
  laptopWriting:
    "https://res.cloudinary.com/do7m4rqdz/image/upload/v1761991879/Laptop-writing_lgsswp.png",
  tabletsWriting:
    "https://res.cloudinary.com/do7m4rqdz/image/upload/v1761991885/Tablets-writing_blbsfs.png",
  camerasWriting:
    "https://res.cloudinary.com/do7m4rqdz/image/upload/v1761991878/Cameras-writing_z23zrv.png",
};

// Combined export for convenience
export const cloudinaryAssets = {
  ui: uiAssets,
  devices: deviceAssets,
  pointers: pointerAssets,
};

export function getCloudinaryUrl(asset?: string): string {
  if (!asset) {
    return "";
  }

  if (/^https?:\/\//i.test(asset)) {
    return asset;
  }

  // Already structured assets include full URLs; fallback just returns original value
  return asset;
}
