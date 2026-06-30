import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Essential Meta Tags for Responsiveness & Browser Compatibility */}
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
        
        {/* Disable zooming on input focus (improves UX) */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        
        {/* Color scheme support */}
        <meta name="color-scheme" content="light dark" />
        
        {/* PWA Meta Tags */}
        <meta name="theme-color" content="#ff9900" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#1a1a1a" media="(prefers-color-scheme: dark)" />
        <meta name="description" content="RenewableZmart - Buy and sell renewable energy products, solar systems, and installation services in Africa" />
        <meta name="application-name" content="RenewableZmart" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="RenewableZmart" />
        
        {/* Icons */}
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'><rect width='192' height='192' fill='%23ff9900'/><circle cx='96' cy='96' r='60' fill='none' stroke='%23fff' stroke-width='3'/><rect x='56' y='56' width='25' height='25' fill='%23ffffff' opacity='0.9'/><rect x='86' y='56' width='25' height='25' fill='%23ffffff' opacity='0.9'/><rect x='116' y='56' width='25' height='25' fill='%23ffffff' opacity='0.9'/><rect x='56' y='86' width='25' height='25' fill='%23ffffff' opacity='0.9'/><rect x='86' y='86' width='25' height='25' fill='%23ffffff' opacity='0.9'/><rect x='116' y='86' width='25' height='25' fill='%23ffffff' opacity='0.9'/><rect x='56' y='116' width='25' height='25' fill='%23ffffff' opacity='0.9'/><rect x='86' y='116' width='25' height='25' fill='%23ffffff' opacity='0.9'/><rect x='116' y='116' width='25' height='25' fill='%23ffffff' opacity='0.9'/></svg>" />
        <link rel="apple-touch-icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'><rect width='192' height='192' fill='%23ff9900'/><circle cx='96' cy='96' r='60' fill='none' stroke='%23fff' stroke-width='3'/><rect x='56' y='56' width='25' height='25' fill='%23ffffff' opacity='0.9'/><rect x='86' y='56' width='25' height='25' fill='%23ffffff' opacity='0.9'/><rect x='116' y='56' width='25' height='25' fill='%23ffffff' opacity='0.9'/><rect x='56' y='86' width='25' height='25' fill='%23ffffff' opacity='0.9'/><rect x='86' y='86' width='25' height='25' fill='%23ffffff' opacity='0.9'/><rect x='116' y='86' width='25' height='25' fill='%23ffffff' opacity='0.9'/><rect x='56' y='116' width='25' height='25' fill='%23ffffff' opacity='0.9'/><rect x='86' y='116' width='25' height='25' fill='%23ffffff' opacity='0.9'/><rect x='116' y='116' width='25' height='25' fill='%23ffffff' opacity='0.9'/></svg>" />
        <link rel="manifest" href="/manifest.json" />
        
        {/* Font Preloading - Reduce blocking requests */}
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://renewablezmart-backend.onrender.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        
        {/* Disable tap highlight on mobile */}
        <style>{`
          input,
          textarea,
          select,
          a,
          button {
            -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
          }
          
          /* Smooth scrolling */
          html {
            scroll-behavior: smooth;
          }
          
          /* Prevent zoom on input focus (iOS) */
          input,
          textarea,
          select {
            font-size: 16px;
          }
          
          /* Safe area support for notched devices */
          body {
            padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
          }
        `}</style>

        {/* Paystack will be loaded on-demand via loadPaystack() utility function */}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}



