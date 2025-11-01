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

// Product Images - Device specific photos
export const productAssets = {
  asus: "https://res.cloudinary.com/do7m4rqdz/image/upload/v1761991877/asus_tvpljk.jpg",
  canon250d:
    "https://res.cloudinary.com/do7m4rqdz/image/upload/v1761991878/canon250d_cvtpka.jpg",
  dell: "https://res.cloudinary.com/do7m4rqdz/image/upload/v1761991878/dell_qydxla.jpg",
  firehd10:
    "https://res.cloudinary.com/do7m4rqdz/image/upload/v1761991878/firehd10_dsevct.jpg",
  galaxyTab:
    "https://res.cloudinary.com/do7m4rqdz/image/upload/v1761991878/galaxy-tab_nsuor2.jpg",
  gopro11:
    "https://res.cloudinary.com/do7m4rqdz/image/upload/v1761991878/gopro11_vzkqb4.jpg",
  hp: "https://res.cloudinary.com/do7m4rqdz/image/upload/v1761991878/hp_xyxmhb.jpg",
  ipad: "https://res.cloudinary.com/do7m4rqdz/image/upload/v1761991878/ipad_hkp0n4.jpg",
  lenovo:
    "https://res.cloudinary.com/do7m4rqdz/image/upload/v1761991879/lenovo_ydcyfz.jpg",
  nikonZ50:
    "https://res.cloudinary.com/do7m4rqdz/image/upload/v1761991879/nikon-z50_lir8yh.jpg",
  sonyZv1f:
    "https://res.cloudinary.com/do7m4rqdz/image/upload/v1761991880/sony-zv1f_fngejf.jpg",
  surfaceGo:
    "https://res.cloudinary.com/do7m4rqdz/image/upload/v1761991880/surface-go_pfwyge.jpg",
};

// Filename to asset mapping for dynamic loading
export const filenameToAsset: { [key: string]: string } = {
  "asus.jpg": productAssets.asus,
  "canon250d.jpg": productAssets.canon250d,
  "dell.jpg": productAssets.dell,
  "firehd10.jpg": productAssets.firehd10,
  "galaxy-tab.jpg": productAssets.galaxyTab,
  "gopro11.jpg": productAssets.gopro11,
  "hp.jpg": productAssets.hp,
  "ipad.jpg": productAssets.ipad,
  "lenovo.jpg": productAssets.lenovo,
  "nikon-z50.jpg": productAssets.nikonZ50,
  "sony-zv1f.jpg": productAssets.sonyZv1f,
  "surface-go.jpg": productAssets.surfaceGo,
};

/**
 * Get Cloudinary URL for a given filename
 * @param filename - Original filename (e.g., 'asus.jpg')
 * @returns Cloudinary URL
 */
export const getCloudinaryUrl = (filename: string): string => {
  return (
    filenameToAsset[filename] ||
    `https://res.cloudinary.com/do7m4rqdz/image/upload/${filename.replace(
      /\.(jpg|jpeg|png|gif)$/i,
      ""
    )}`
  );
};

// Combined export for convenience
export const cloudinaryAssets = {
  ui: uiAssets,
  devices: deviceAssets,
  pointers: pointerAssets,
  products: productAssets,
  getUrl: getCloudinaryUrl,
};
