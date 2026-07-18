// =============================================
// vite.config.js
// =============================================
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    port: 5173,
    https: true,
    proxy: {
      // Proxy a tu API en desarrollo para evitar CORS
      '/seller': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/store': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})

// =============================================
// .env.example  →  copiá como .env en seller-portal/
// =============================================
// VITE_API_URL=http://localhost:3000
// VITE_CDN_URL=https://tu-bucket.s3.amazonaws.com
// (si usás el proxy de Vite en dev, VITE_API_URL puede quedar vacío)

// =============================================
// src/main.jsx
// =============================================
// import { StrictMode } from 'react'
// import { createRoot } from 'react-dom/client'
// import './index.css'
// import App from './App.jsx'
//
// createRoot(document.getElementById('root')).render(
//   <StrictMode>
//     <App />
//   </StrictMode>,
// )
