# Crypto Trading App v2

A professional cryptocurrency trading application built with Nuxt 3, featuring advanced DCA (Dollar Cost Averaging) bots with AI-powered signal detection, real-time market data, and multi-exchange support.

## 🚀 Features

### Trading Capabilities
- **Multi-Exchange Support**: Integrated with major exchanges via CCXT
- **Real-time Market Data**: WebSocket connections for live price updates
- **Professional Trading Interface**: Advanced charting with TradingView-style charts
- **Portfolio Management**: Track balances across multiple exchanges

### DCA Bot System
- **Automated Trading**: Set-and-forget DCA strategies
- **AI-Powered Direction Detection**: Automatically detects market trend (LONG/SHORT)
- **Smart Entry Timing**: Waits for optimal entry points based on technical indicators
- **Safety Orders**: Pyramid averaging with configurable safety orders
- **Risk Management**: Stop-loss and take-profit automation

### Advanced Signal Detection (v2.0)
Our DCA bots use sophisticated multi-timeframe analysis:

#### Direction Detection
- Analyzes 100 1-hour candles for market trend
- Uses 6 technical indicators with weighted scoring
- MA Analysis (SMA 20/50/100/200) for trend strength
- EMA alignment, RSI, MACD, Volume, and Candle patterns

#### Smart Entry System
- Analyzes 100 30-minute candles for entry timing
- Primary signals: MA bounces, Support/Resistance, Bollinger Bands
- Confirmation indicators: MACD, RSI, ATR, Volume
- Requires actual pullback/rally for all bounce signals
- Score-based entry (≥4 points required)

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB 4.4+
- Yarn or npm
- Exchange API keys (Binance, etc.)

## 🛠️ Installation

1. Clone the repository:
```bash
git clone https://github.com/adsavulescu/crypto-app-v2.git
cd crypto-app-v2
```

2. Install dependencies:
```bash
yarn install
# or
npm install
```

3. Install and start MongoDB:
```bash
# Ubuntu/Debian
sudo apt-get install mongodb
sudo systemctl start mongod

# Or use the provided script
./install_mongodb.sh
```

4. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. Start the development server:
```bash
yarn dev
# or
npm run dev
```

The application will be available at `http://localhost:3000`

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Vue 3 + Nuxt 3, Naive UI, Pinia
- **Backend**: Nuxt Server API, MongoDB with Mongoose
- **Trading Core**: CCXT for exchange integration
- **Technical Analysis**: technicalindicators library
- **Real-time**: WebSocket for live data
- **Authentication**: JWT with httpOnly cookies

### Project Structure
```
crypto-app-v2/
├── pages/              # Nuxt pages (routes)
├── components/         # Vue components
├── server/
│   ├── api/v1/        # REST API endpoints
│   ├── models/        # MongoDB schemas
│   └── plugins/       # Core engines (DCA, CCXT wrapper)
├── strategies/        # Trading strategies
├── stores/           # Pinia state management
└── public/           # Static assets
```

## 🤖 DCA Bot Configuration

### Basic Parameters
- **Base Order Amount**: Initial position size
- **Safety Order Amount**: Size of averaging orders
- **Take Profit**: Target profit percentage
- **Safety Order Percent**: Price drop to trigger safety orders
- **Stop Loss**: Maximum acceptable loss
- **Max Safety Orders**: Limit on averaging orders

### Advanced Features
- **Direction**: `long`, `short`, or `auto` (AI-powered)
- **Deal Start Condition**: `always` or `smartStart` (wait for optimal entry)
- **Market Type**: `spot` or `future`
- **Leverage**: For futures trading (1-125x)

## 📊 Technical Indicators Used

- **Moving Averages**: SMA (20, 50, 100, 200), EMA (9, 21, 50)
- **Oscillators**: RSI (14), MACD (12, 26, 9)
- **Volatility**: Bollinger Bands (20, 2), ATR (14)
- **Volume**: Volume analysis with 20-period average
- **Price Action**: Support/Resistance levels, Candle patterns

## 🔒 Security

- JWT authentication with httpOnly cookies
- Bcrypt password hashing
- API rate limiting
- Input validation and sanitization
- Secure WebSocket connections

## 📈 Performance Optimizations

- 1-second polling for bot execution
- Efficient MongoDB queries with indexing
- WebSocket for real-time data (reduces API calls)
- Cached exchange instances
- Batch processing for multiple bots

## 🧪 Testing

```bash
# Run tests
yarn test

# Run with coverage
yarn test:coverage
```

## 🚀 Deployment

### Production Build
```bash
yarn build
yarn preview  # Test production build locally
```

### Environment Variables
Required environment variables for production:
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `NODE_ENV`: Set to 'production'

## 📝 Recent Updates

### v2.0 - Signal Detection Overhaul
- Switched from 1m to 1H timeframe for direction detection
- Switched from 1m to 30m timeframe for smart entry
- Added MA analysis with SMA 20/50/100/200
- Integrated Bollinger Bands and ATR
- Implemented support/resistance detection
- Fixed 17+ bugs including division by zero, array bounds, and logic errors
- Added comprehensive edge case handling

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is private and proprietary.

## 👥 Authors

- **Adrian Savulescu** - [adsavulescu](https://github.com/adsavulescu)

## 🙏 Acknowledgments

- CCXT team for exchange integration
- TradingView for charting inspiration
- Technical indicators library contributors

## ⚠️ Disclaimer

This software is for educational purposes only. Cryptocurrency trading carries significant risk. Always do your own research and never invest more than you can afford to lose.