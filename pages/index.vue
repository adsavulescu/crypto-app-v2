<template>
  <div class="landing-page">
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-background">
        <div class="hero-gradient"></div>
        <div class="hero-pattern"></div>
      </div>
      <div class="hero-content">
        <n-space vertical align="center" :size="32">
          <LogoBadge :size="80" />
          <n-h1 class="hero-title">
            <span class="title-main">MicroTrade</span>
            <n-gradient-text type="primary" class="title-subtitle">
              Precision Trading Services
            </n-gradient-text>
          </n-h1>
          <n-text class="hero-subtitle">
            <span class="tagline-highlight">Micro Precision. Macro Profits.</span>
          </n-text>
          <n-text class="hero-description">
            AI-powered trading bots that execute thousands of micro-trades with surgical precision,
            <br />compounding small wins into significant portfolio growth.
          </n-text>
          <n-space :size="16" class="hero-buttons">
            <nuxt-link v-if="!isAuthenticated" to="/login">
              <n-button size="large" class="secondary-cta">
                <template #icon>
                  <n-icon>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clip-rule="evenodd" />
                      <path fill-rule="evenodd" d="M19 10a.75.75 0 00-.75-.75H8.704l1.048-.943a.75.75 0 10-1.004-1.114l-2.5 2.25a.75.75 0 000 1.114l2.5 2.25a.75.75 0 101.004-1.114l-1.048-.943h9.546A.75.75 0 0019 10z" clip-rule="evenodd" />
                    </svg>
                  </n-icon>
                </template>
                Login
              </n-button>
            </nuxt-link>
            <nuxt-link v-if="isAuthenticated" to="/dashboard">
              <n-button type="primary" size="large" class="cta-button primary-cta">
                <template #icon>
                  <n-icon>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                    </svg>
                  </n-icon>
                </template>
                Go to Dashboard
              </n-button>
            </nuxt-link>
          </n-space>
        </n-space>
      </div>
      <div class="hero-scroll-indicator">
        <n-icon size="24" class="scroll-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M7 10l5 5 5-5"/>
          </svg>
        </n-icon>
      </div>
    </section>

    <!-- Services Section -->
    <section class="services-section">
      <n-space vertical align="center" :size="48">
        <div class="section-header">
          <n-h2>
            <n-gradient-text type="info">
              Modular Micro-Services for Trading
            </n-gradient-text>
          </n-h2>
          <n-text class="section-subtitle">
            Precision-engineered tools that compound small trades into significant gains
          </n-text>
        </div>

        <n-grid :x-gap="24" :y-gap="24" cols="1 640:2 1024:3" class="features-grid">
          <!-- Multi-Exchange Trading -->
          <n-grid-item>
            <n-card class="feature-card" hoverable>
              <template #header>
                <n-space align="center" :size="12">
                  <n-icon size="32" color="#18a058">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                    </svg>
                  </n-icon>
                  <n-text strong>Multi-Exchange Trading</n-text>
                </n-space>
              </template>
              <n-text>
                Micro-manage all your exchange accounts from one unified dashboard. Connect Binance, Coinbase, Kraken, and 100+ more.
              </n-text>
            </n-card>
          </n-grid-item>

          <!-- AI-Powered DCA Bots -->
          <n-grid-item>
            <n-card class="feature-card" hoverable>
              <template #header>
                <n-space align="center" :size="12">
                  <n-icon size="32" color="#18a058">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </n-icon>
                  <n-text strong>AI-Powered DCA Bots</n-text>
                  <n-tag type="success" size="small">LIVE</n-tag>
                </n-space>
              </template>
              <n-text>
                Micro-precise entries that compound over time. Our AI detects market direction and times entries with surgical precision.
              </n-text>
            </n-card>
          </n-grid-item>

          <!-- Grid Trading Bots -->
          <n-grid-item>
            <n-card class="feature-card" hoverable>
              <template #header>
                <n-space align="center" :size="12">
                  <n-icon size="32" color="#909399">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M4 4h7V2H4c-1.1 0-2 .9-2 2v7h2V4zm16 0h-7v2h7v7h2V4c0-1.1-.9-2-2-2zm-7 16H4v-7H2v7c0 1.1.9 2 2 2h7v-2zm7-7v7h-7v2h7c1.1 0 2-.9 2-2v-7h-2z"/>
                    </svg>
                  </n-icon>
                  <n-text strong>Grid Trading Bots</n-text>
                  <n-tag type="warning" size="small">COMING SOON</n-tag>
                </n-space>
              </template>
              <n-text>
                Micro-grid intervals capture every market movement. Automated buying and selling in precise price ranges.
              </n-text>
            </n-card>
          </n-grid-item>

          <!-- Portfolio Analytics -->
          <n-grid-item>
            <n-card class="feature-card" hoverable>
              <template #header>
                <n-space align="center" :size="12">
                  <n-icon size="32" color="#18a058">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 13h2v8H3zm4-8h2v13H7zm4-2h2v15h-2zm4 5h2v10h-2zm4-3h2v13h-2z"/>
                    </svg>
                  </n-icon>
                  <n-text strong>Portfolio Analytics</n-text>
                </n-space>
              </template>
              <n-text>
                Track every micro-movement in your portfolio. Real-time PnL, asset allocation, and performance analytics.
              </n-text>
            </n-card>
          </n-grid-item>

          <!-- Blockchain Analytics -->
          <n-grid-item>
            <n-card class="feature-card" hoverable>
              <template #header>
                <n-space align="center" :size="12">
                  <n-icon size="32" color="#909399">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.5 3.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2 4.5 3.5 3 2v20l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5zM19 19.09H5V4.91h14v14.18zM7 7h10v2H7zm0 4h5v2H7z"/>
                    </svg>
                  </n-icon>
                  <n-text strong>Blockchain Analytics</n-text>
                  <n-tag type="warning" size="small">COMING SOON</n-tag>
                </n-space>
              </template>
              <n-text>
                On-chain data, whale alerts, smart money tracking, and DEX liquidity monitoring.
              </n-text>
            </n-card>
          </n-grid-item>

          <!-- Advanced Charting -->
          <n-grid-item>
            <n-card class="feature-card" hoverable>
              <template #header>
                <n-space align="center" :size="12">
                  <n-icon size="32" color="#18a058">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"/>
                    </svg>
                  </n-icon>
                  <n-text strong>Professional Charts</n-text>
                </n-space>
              </template>
              <n-text>
                TradingView-style charts with technical indicators, drawing tools, and multiple timeframes.
              </n-text>
            </n-card>
          </n-grid-item>

          <!-- Risk Management -->
          <n-grid-item>
            <n-card class="feature-card" hoverable>
              <template #header>
                <n-space align="center" :size="12">
                  <n-icon size="32" color="#18a058">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L4 7v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V7l-8-5zm-2 16l-4-4 1.41-1.41L10 15.17l6.59-6.59L18 10l-8 8z"/>
                    </svg>
                  </n-icon>
                  <n-text strong>Risk Management</n-text>
                </n-space>
              </template>
              <n-text>
                Automated stop-loss, take-profit orders, position sizing, and safety orders for capital protection.
              </n-text>
            </n-card>
          </n-grid-item>

          <!-- 24/7 Bot Trading -->
          <n-grid-item>
            <n-card class="feature-card" hoverable>
              <template #header>
                <n-space align="center" :size="12">
                  <n-icon size="32" color="#18a058">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                    </svg>
                  </n-icon>
                  <n-text strong>24/7 Automated Trading</n-text>
                </n-space>
              </template>
              <n-text>
                Your bots work around the clock, executing trades while you sleep. Never miss an opportunity.
              </n-text>
            </n-card>
          </n-grid-item>

          <!-- Backtesting -->
          <n-grid-item>
            <n-card class="feature-card" hoverable>
              <template #header>
                <n-space align="center" :size="12">
                  <n-icon size="32" color="#18a058">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
                    </svg>
                  </n-icon>
                  <n-text strong>Strategy Backtesting</n-text>
                </n-space>
              </template>
              <n-text>
                Test your strategies on historical data before risking real capital. Optimize for best performance.
              </n-text>
            </n-card>
          </n-grid-item>
        </n-grid>
      </n-space>
    </section>

    <!-- How It Works Section -->
    <section class="how-it-works-section">
      <n-space vertical align="center" :size="48">
        <div class="section-header">
          <n-h2>
            <n-gradient-text type="warning">
              How MicroTrade Works
            </n-gradient-text>
          </n-h2>
          <n-text class="section-subtitle">
            Get started with precision trading in 4 simple steps
          </n-text>
        </div>

        <n-grid :x-gap="32" :y-gap="32" cols="1 768:2 1024:4" class="steps-grid">
          <!-- Step 1 -->
          <n-grid-item>
            <n-card class="step-card" hoverable>
              <n-space vertical align="center" :size="16">
                <div class="step-number">
                  <n-gradient-text type="primary">01</n-gradient-text>
                </div>
                <n-text strong>Connect Exchanges</n-text>
                <n-text class="step-description">
                  Securely link your exchange accounts via API. We never have access to withdrawals.
                </n-text>
              </n-space>
            </n-card>
          </n-grid-item>

          <!-- Step 2 -->
          <n-grid-item>
            <n-card class="step-card" hoverable>
              <n-space vertical align="center" :size="16">
                <div class="step-number">
                  <n-gradient-text type="info">02</n-gradient-text>
                </div>
                <n-text strong>Configure Your Bots</n-text>
                <n-text class="step-description">
                  Set up DCA or Grid bots with our AI-assisted configuration wizard.
                </n-text>
              </n-space>
            </n-card>
          </n-grid-item>

          <!-- Step 3 -->
          <n-grid-item>
            <n-card class="step-card" hoverable>
              <n-space vertical align="center" :size="16">
                <div class="step-number">
                  <n-gradient-text type="warning">03</n-gradient-text>
                </div>
                <n-text strong>Activate & Monitor</n-text>
                <n-text class="step-description">
                  Launch your bots and track performance in real-time with our dashboard.
                </n-text>
              </n-space>
            </n-card>
          </n-grid-item>

          <!-- Step 4 -->
          <n-grid-item>
            <n-card class="step-card" hoverable>
              <n-space vertical align="center" :size="16">
                <div class="step-number">
                  <n-gradient-text type="success">04</n-gradient-text>
                </div>
                <n-text strong>Compound Profits</n-text>
                <n-text class="step-description">
                  Watch micro-trades compound into macro profits with automated reinvestment.
                </n-text>
              </n-space>
            </n-card>
          </n-grid-item>
        </n-grid>

        <!-- Stats Section -->
        <n-grid :x-gap="24" cols="1 768:3" class="stats-grid">
          <n-grid-item>
            <n-card class="stat-card">
              <n-statistic label="Exchanges Supported">
                <n-number-animation :from="0" :to="100" />
                <template #suffix>+</template>
              </n-statistic>
            </n-card>
          </n-grid-item>
          
          <n-grid-item>
            <n-card class="stat-card">
              <n-statistic label="Trading Pairs">
                <n-number-animation :from="0" :to="5000" />
                <template #suffix>+</template>
              </n-statistic>
            </n-card>
          </n-grid-item>
          
          <n-grid-item>
            <n-card class="stat-card">
              <n-statistic label="Bot Strategies">
                <n-number-animation :from="0" :to="12" />
              </n-statistic>
            </n-card>
          </n-grid-item>
        </n-grid>
      </n-space>
    </section>

    <!-- CTA Section -->
    <section class="cta-section">
      <n-space vertical align="center" :size="24">
        <n-h2>
          <n-gradient-text type="primary">
            Start Your Micro-Trading Journey
          </n-gradient-text>
        </n-h2>
        <n-text class="cta-subtitle">
          Precision Trading Services - Coming Soon
        </n-text>
        <nuxt-link v-if="isAuthenticated" to="/dashboard">
          <n-button type="primary" size="large" class="cta-button">
            Go to Dashboard
          </n-button>
        </nuxt-link>
      </n-space>
    </section>

  </div>
</template>

<script setup>
import NuxtLink from "#app/components/nuxt-link";

definePageMeta({
  layout: "no-sidebar",
});

// Check if user is authenticated using the new auth-check cookie
const authCheck = useCookie('auth-check');
const isAuthenticated = computed(() => authCheck.value === 'true' || authCheck.value === true);
</script>

<style scoped>
.landing-page {
  background: var(--n-color);
}

/* Hero Section */
.hero-section {
  position: relative;
  min-height: 90vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 2rem;
}

.hero-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
}

.hero-gradient {
  position: absolute;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center top, 
    rgba(24, 160, 88, 0.15) 0%, 
    transparent 50%),
    radial-gradient(ellipse at left bottom, 
    rgba(36, 171, 255, 0.1) 0%, 
    transparent 50%),
    radial-gradient(ellipse at right bottom, 
    rgba(147, 51, 234, 0.1) 0%, 
    transparent 50%);
  animation: gradientShift 20s ease infinite;
}

@keyframes gradientShift {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.8; }
}

.hero-pattern {
  position: absolute;
  width: 100%;
  height: 100%;
  background-image: 
    linear-gradient(rgba(255, 255, 255, 0.01) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.01) 1px, transparent 1px);
  background-size: 50px 50px;
  opacity: 0.5;
}

.hero-content {
  position: relative;
  z-index: 1;
  text-align: center;
  max-width: 900px;
  width: 100%;
}

/* Logo Badge Animation */
.logo-badge {
  animation: float 6s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

.hero-title {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.title-main {
  font-size: clamp(2.5rem, 6vw, 4rem);
  font-weight: 900;
  letter-spacing: -0.02em;
  color: var(--n-text-color);
}

.title-subtitle {
  font-size: clamp(1.2rem, 3vw, 1.8rem);
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.hero-subtitle {
  font-size: 1.4rem;
  margin-bottom: 1rem;
}

.tagline-highlight {
  font-weight: 600;
  background: linear-gradient(90deg, #18a058, #24abff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-description {
  font-size: 1.1rem;
  line-height: 1.6;
  opacity: 0.8;
  max-width: 600px;
  margin: 0 auto 2rem;
}

.hero-buttons {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.primary-cta {
  font-size: 1.1rem;
  padding: 0.9rem 2.5rem;
  height: auto;
  font-weight: 600;
  box-shadow: 0 4px 14px rgba(24, 160, 88, 0.4);
  transition: all 0.3s;
}

.primary-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(24, 160, 88, 0.5);
}

.secondary-cta {
  font-size: 1.1rem;
  padding: 0.9rem 2.5rem;
  height: auto;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s;
}

.secondary-cta:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.hero-scroll-indicator {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  animation: bounce 2s infinite;
  opacity: 0.6;
  cursor: pointer;
}

@keyframes bounce {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(10px); }
}

.scroll-icon {
  transition: opacity 0.3s;
}

.hero-scroll-indicator:hover .scroll-icon {
  opacity: 1;
}

/* Services Section */
.services-section,
.cta-section {
  padding: 5rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.section-header {
  text-align: center;
  margin-bottom: 3rem;
}

.section-header h2 {
  font-size: clamp(2rem, 4vw, 3rem);
  margin-bottom: 1rem;
}

.section-subtitle {
  font-size: 1.2rem;
  opacity: 0.7;
  margin-top: 0.5rem;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.5;
}

.features-grid {
  width: 100%;
}

.feature-card {
  height: 100%;
  transition: all 0.3s;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
}

.feature-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent, rgba(24, 160, 88, 0.5), transparent);
  transform: translateX(-100%);
  transition: transform 0.6s;
}

.feature-card:hover::before {
  transform: translateX(100%);
}

.feature-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
  border-color: rgba(24, 160, 88, 0.3);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
}

/* How It Works Section */
.how-it-works-section {
  background: linear-gradient(180deg, transparent 0%, rgba(24, 160, 88, 0.02) 50%, transparent 100%);
  padding: 5rem 2rem;
}

.how-it-works-section .section-header {
  margin-bottom: 4rem;
}

.steps-grid {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto 4rem;
}

.step-card {
  height: 100%;
  text-align: center;
  transition: all 0.4s;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  position: relative;
  padding: 2rem 1.5rem;
}

.step-card::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, 
    transparent, 
    var(--n-color-primary), 
    transparent);
  transform: scaleX(0);
  transition: transform 0.4s;
}

.step-card:hover::after {
  transform: scaleX(1);
}

.step-card:hover {
  transform: translateY(-10px) scale(1.02);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  border-color: rgba(24, 160, 88, 0.4);
  background: linear-gradient(135deg, rgba(24, 160, 88, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%);
}

.step-number {
  font-size: 3.5rem;
  font-weight: 900;
  line-height: 1;
  margin-bottom: 1rem;
  letter-spacing: -0.02em;
}

.step-card:hover .step-number {
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.step-description {
  font-size: 0.95rem;
  opacity: 0.75;
  text-align: center;
  line-height: 1.5;
}

.stats-grid {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
}

.stat-card {
  text-align: center;
  background: linear-gradient(135deg, rgba(24, 160, 88, 0.05) 0%, rgba(36, 171, 255, 0.03) 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 2rem;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  border-color: rgba(24, 160, 88, 0.3);
}

/* CTA Section */
.cta-section {
  text-align: center;
  padding: 6rem 2rem;
  position: relative;
  overflow: hidden;
}

.cta-section::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, 
    rgba(24, 160, 88, 0.08) 0%, 
    transparent 70%);
  animation: rotate 30s linear infinite;
}

@keyframes rotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.cta-section > * {
  position: relative;
  z-index: 1;
}

.cta-subtitle {
  font-size: 1.3rem;
  opacity: 0.85;
  font-weight: 500;
}


/* Responsive */
@media (max-width: 768px) {
  .pricing-card.featured {
    transform: none;
  }
  
  .pricing-card.featured:hover {
    transform: translateY(-4px);
  }
}
</style>