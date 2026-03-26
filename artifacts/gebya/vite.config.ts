import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { VitePWA } from "vite-plugin-pwa";

// ✅ SAFE PORT HANDLING (no breaking build)
const port = Number(process.env.PORT) || 3000;

// ✅ base path safe
const basePath = process.env.BASE_PATH ?? "/";

function securityHeadersPlugin(): Plugin {
  const setSecurityHeaders = (res: any, isDev: boolean) => {
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        isDev
          ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
          : "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: blob:",
        "connect-src 'self' https:",
        "worker-src 'self' blob:",
        "manifest-src 'self'",
      ].join("; "),
    );
  };

  return {
    name: "security-headers",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        setSecurityHeaders(res, true);
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        setSecurityHeaders(res, false);
        next();
      });
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    securityHeadersPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      devOptions: { enabled: false },
      manifest: {
        name: "Gebya - Business Notebook",
        short_name: "Gebya",
        description: "Track your business sales, expenses, and credit offline",
        theme_color: "#2c3e50",
        background_color: "#f9fafb",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },

  // ✅ IMPORTANT FIX (Vercel expects this)
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },

  server: {
    port,
    host: "0.0.0.0",
  },

  preview: {
    port,
    host: "0.0.0.0",
  },
});