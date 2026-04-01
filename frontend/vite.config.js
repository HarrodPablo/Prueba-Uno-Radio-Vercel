import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  // --- CONFIGURACIÓN PARA PRODUCCIÓN ---
  build: {
    // 1. Desactiva los Mapas de Fuente (Source Maps)
    // Esto evita que el navegador reconstruya tus archivos .jsx originales
    sourcemap: false,

    // 2. Minificación agresiva
    // 'esbuild' es el valor por defecto y es muy rápido, limpia espacios y renombra variables
    minify: "esbuild",

    // 3. Limpieza de consola (Opcional pero recomendado)
    // Esto elimina los console.log en el código que subes a Vercel
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  // -------------------------------------
  esbuild: {
    jsx: "transform",
    jsxFactory: "React.createElement",
    // También puedes decirles a esbuild que limpie logs aquí si no usas terser
    drop: ["console", "debugger"],
  },
  optimizeDeps: {
    esbuildOptions: {
      jsx: "transform",
      jsxFactory: "React.createElement",
    },
  },
});
