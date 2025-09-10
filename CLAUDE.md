# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nuxt 3 full-stack cryptocurrency trading application with advanced DCA (Dollar Cost Averaging) bot functionality featuring AI-powered direction detection and smart entry timing. The application integrates with multiple exchanges via CCXT, provides automated trading strategies, and includes machine learning capabilities.

## Development Commands

```bash
# Start development server (localhost:3000)
yarn dev

# Build for production
yarn build

# Preview production build locally
yarn preview

# Generate static site
yarn generate
```

## Architecture Overview

### Full-Stack Structure
- **Frontend**: Vue 3 + Nuxt 3 with Composition API, Naive UI components, Pinia state management
- **Backend**: Nuxt server API routes with MongoDB (Mongoose), JWT authentication
- **Trading Core**: CCXT wrapper for exchange integration, custom trading engines

### Key Directory Purposes

- `pages/`: File-based routing - dashboard.vue (portfolio), trade.vue (trading interface), dca-bots.vue (bot management)
- `server/api/v1/`: REST API endpoints for all backend operations
- `server/models/`: MongoDB schemas (user, userExchanges, balance, candles, dcaBot)
- `server/plugins/`: Core business logic engines
  - `ccxtw.js`: CCXT wrapper for exchange operations
  - `DCAEngine.js`: DCA bot execution logic
  - `BacktestEngine.js`: Strategy backtesting
  - `BalanceEngine.js`: Portfolio management
- `strategies/`: Trading strategy implementations (simple, DCA, machine learning, etc.)
- `components/`: Reusable Vue components (charts, order management, DCA bot controls)
- `stores/app.store.js`: Centralized Pinia store for user exchange data

### Database Configuration

MongoDB on localhost:27017, database name: 'crypto-app-github'

### API Pattern

All backend APIs follow `/api/v1/{resource}` pattern with JWT authentication via cookies. Exchange operations go through the CCXT wrapper which handles error normalization.

### Trading Strategy Architecture

Strategies are pluggable modules in `/strategies/` that implement:
- Entry/exit signal generation
- Technical indicator calculations
- Risk management parameters
- Machine learning predictions (when applicable)

The DCAEngine executes strategies by polling their signals and managing order placement across exchanges.

### DCA Bot Smart Features

#### Auto Direction Detection (direction = "auto")
- Analyzes 100 1-hour candles (~4 days) to determine market trend
- Uses composite scoring system with 6 indicators:
  - MA Analysis (SMA 20/50/100/200): ±3 points for trend strength
  - EMA alignment (9/21/50 periods): ±2 points
  - RSI oversold/overbought: ±1 point
  - MACD histogram momentum: ±1 point
  - Volume spikes: +1 point
  - Candle patterns: ±1 point
- Score ≥3 = LONG, Score ≤-3 = SHORT
- Detects direction once per deal, stored in `activeDeal.detectedDirection`

#### Smart Entry Detection (dealStartCondition = "smartStart")
- Analyzes 100 30-minute candles (~2 days) for optimal entry timing
- Runs every second until conditions are met
- Primary signals (high weight):
  - MA bounce detection (20/50/100/200 periods): +3 points
  - Support/Resistance level bounces: +2 points
  - Bollinger Band bounces: +2 points
- Confirmation indicators:
  - MACD momentum turning: +1 point
  - RSI recovery/rejection: +1 point
  - ATR confirms meaningful move (>0.5x ATR): +1 point
  - Volume spike on bounce/rejection: +1 point
- Penalties:
  - RSI extreme (>70 or <30): -2 points
  - At opposite Bollinger Band: -1 point
  - No recent pullback/rally: -1 point
- Requires score ≥4 points to enter (balanced for DCA strategy)
- All bounce signals require actual pullback/rally (not just proximity)
- Tracks waiting time and shows status in UI

### Authentication Flow

JWT-based authentication with tokens stored in httpOnly cookies. Protected routes use `/middleware/auth.js` for verification. User passwords are hashed with bcrypt.

### State Management

Pinia store (`/stores/app.store.js`) manages:
- User exchange configurations
- Active exchange selection
- Portfolio data caching
- WebSocket connections for real-time data

### Key Technologies

- **Exchange Integration**: CCXT library for unified exchange API
- **Charts**: lightweight-charts for professional trading charts, Chart.js for portfolio visualization
- **Technical Analysis**: technicalindicators library
- **Machine Learning**: @tensorflow/tfjs for predictive models
- **UI Framework**: Naive UI with dark theme configuration