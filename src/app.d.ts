declare global {
  namespace App {
    interface Platform {
      env: {
        DB: D1Database;
        CLOUDINARY_CLOUD_NAME: string;
        CLOUDINARY_UPLOAD_PRESET: string;
        OPENROUTER_API_KEY: string;
      };
    }

    // no global PageData — each page declares its own via load function
  }
}
export {};
