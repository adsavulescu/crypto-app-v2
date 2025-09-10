<script setup>
import { CrossUp, CrossDown } from "technicalindicators";
import { SMA, RSI, MACD, BollingerBands } from '@debut/indicators';
import { useAppStore } from '~/stores/app.store';
import { inject, watch, computed } from 'vue';
const app = useAppStore()

// Get userID from the store instead of cookie
const userID = computed(() => app.getCurrentUser?.id || null);

// WebSocket implementation - no longer using setIntervalAsync

// Inject theme from app.vue
const isDark = inject('isDark');

let currentExchange = ref(app.getUserSelectedExchange);
let currentSymbol = ref(app.getUserSelectedMarket);

let chartInstance = '';
let chartCandlesSeries = '';
let chartVolumeSeries = '';
let chartMA12Series = '';
let chartMA21Series = '';
let chartMA50Series = '';
let chartMA100Series = '';
let chartMA200Series = '';
let chartRSISeries = '';
let chartMACDSeries = '';
let chartMACDSignalSeries = '';
let chartMACDHistogramSeries = '';
let chartBBLowerSeries = '';
let chartBBMiddleSeries = '';
let chartBBUpperSeries = '';

let SMA12Indicator = new SMA(12);
let SMA21Indicator = new SMA(21);
let SMA50Indicator = new SMA(50);
let SMA100Indicator = new SMA(100);
let SMA200Indicator = new SMA(200);
let RSIIndicator = new RSI(14);
let MACDIndicator = new MACD(12, 26, 9);
let BBIndicator = new BollingerBands(20, 2);



let chartIndicators = ['volume', 'MA12', 'MA21', 'MA50', 'MA100', 'MA200', 'RSI', 'MACD', 'BB'];
let selectedIndicators = ref(['volume', 'MA12', 'MA21', 'MA50', 'MA100', 'MA200', 'RSI', 'MACD', 'BB']);

let chartTimeframes = app.getAvailableTimeframes;

let selectedTimeframe = ref(['1m']);

let isSocketConnected = ref(false);
let lastBarTime = null;

// Theme colors function
const getChartColors = () => {
  if (isDark.value) {
    return {
      backgroundColor: '#18181c',
      lineColor: '#2B2B43',
      textColor: '#D9D9D9',
      gridVertLines: '#2B2B43',
      gridHorzLines: '#363C4E',
      crossHair: '#758696'
    };
  } else {
    return {
      backgroundColor: '#ffffff',
      lineColor: '#e1e1e1',
      textColor: '#191919',
      gridVertLines: '#e1e1e1',
      gridHorzLines: '#f0f0f0',
      crossHair: '#9B9B9B'
    };
  }
};

// Update chart theme
const updateChartTheme = () => {
  if (chartInstance) {
    const colors = getChartColors();
    chartInstance.applyOptions({
      layout: {
        backgroundColor: colors.backgroundColor,
        lineColor: colors.lineColor,
        textColor: colors.textColor,
      },
      grid: {
        vertLines: {
          color: colors.gridVertLines,
        },
        horzLines: {
          color: colors.gridHorzLines,
        },
      },
      crossHair: {
        color: colors.crossHair,
      },
    });
  }
};

onMounted(async () => {
  const { $lightweightCharts, $socket } = useNuxtApp()
  const colors = getChartColors();

  //init chart lib
  chartInstance = $lightweightCharts.createChart('chart', {
    autoSize: true,
    timeScale: {
      timeVisible: true,
    },
    rightPriceScale: {
      scaleMargins: {
        top: 0.3,
        bottom: 0.25,
      },
    },
    layout: {
      backgroundColor: colors.backgroundColor,
      lineColor: colors.lineColor,
      textColor: colors.textColor,
    },
    watermark: {
      color: 'rgba(0, 0, 0, 0)',
    },
    crossHair: {
      color: colors.crossHair,
    },
    grid: {
      vertLines: {
        color: colors.gridVertLines,
      },
      horzLines: {
        color: colors.gridHorzLines,
      },
    },
  });

  //add candles series
  chartCandlesSeries = chartInstance.addCandlestickSeries({
    autoScale:true,
    priceFormat: {
      type: 'price',
      precision: 4,
      minMove: 0.0001,
    },
  });

  //add volume series
  chartVolumeSeries = chartInstance.addHistogramSeries({
    priceFormat: {
      type: 'volume',
    },
    priceScaleId: 'volume',
    priceLineVisible: false,
    scaleMargins: {
      top: 0.8,
      bottom: 0,
    },
  });

  //add MA12 series
  chartMA12Series = chartInstance.addLineSeries({
      color:'#a821f3',
      lineWidth:1,
      priceLineVisible: false,
      lastValueVisible: false,
      rightPriceScale: {
          visible: false,
      },
  });

  //add MA21 series
  chartMA21Series = chartInstance.addLineSeries({
      color:'#6921f3',
      lineWidth:1,
      priceLineVisible: false,
      lastValueVisible: false,
      rightPriceScale: {
          visible: false,
      },
  });

  //add MA50 series
  chartMA50Series = chartInstance.addLineSeries({
      color:'#ffeb3b',
      lineWidth:1,
      priceLineVisible: false,
      lastValueVisible: false,
      rightPriceScale: {
          visible: false,
      },
  });

  //add MA100 series
  chartMA100Series = chartInstance.addLineSeries({
    color:'#ff9800',
    lineWidth:1,
    priceLineVisible: false,
    lastValueVisible: false,
    rightPriceScale: {
      visible: false,
    },
  });

  //add MA200 series
  chartMA200Series = chartInstance.addLineSeries({
    color:'#f23645',
    lineWidth:1,
    priceLineVisible: false,
    lastValueVisible: false,
    rightPriceScale: {
      visible: false,
    },
  });

  //add RSI series
  chartRSISeries = chartInstance.addLineSeries({
      priceScaleId: 'rsi',
      // priceLineVisible: false,
      // lastValueVisible: false,
      scaleMargins: {
          top: 0.8,
          bottom: 0,
      },
      lineWidth:1
  });

  //add MACD Series
  chartMACDSeries = chartInstance.addLineSeries({
      color: '#2962FF',
      priceScaleId: 'macd',
      priceLineVisible: false,
      // lastValueVisible: false,
      lineWidth:1
  });

  chartMACDSignalSeries = chartInstance.addLineSeries({
      color: '#FF6D00',
      priceScaleId: 'macd',
      priceLineVisible: false,
      // lastValueVisible: false,
      lineWidth:1
  });

  chartMACDHistogramSeries = chartInstance.addHistogramSeries({
      priceScaleId: 'macd',
      priceLineVisible: false,
      lastValueVisible: false,
      scaleMargins: {
          top: 0.8,
          bottom: 0,
      },
  });

  //add BB series
  chartBBLowerSeries = chartInstance.addLineSeries({
    // priceScaleId: 'bb',
    color:'#459800',
    lineWidth:1,
    priceLineVisible: false,
    lastValueVisible: false,
    rightPriceScale: {
      visible: false,
    },
  });

  chartBBMiddleSeries = chartInstance.addLineSeries({
    // priceScaleId: 'bb',
    color:'#459800',
    lineWidth:1,
    priceLineVisible: false,
    lastValueVisible: false,
    rightPriceScale: {
      visible: false,
    },
  });

  chartBBUpperSeries = chartInstance.addLineSeries({
    // priceScaleId: 'bb',
    color:'#459800',
    lineWidth:1,
    priceLineVisible: false,
    lastValueVisible: false,
    rightPriceScale: {
      visible: false,
    },
  });

  // Remove any existing listeners first
  $socket.off('chart:data');
  $socket.off('chart:update');
  $socket.off('chart:error');
  $socket.off('chart:subscribed');
  
  // Set up socket listeners for chart data
  $socket.on('chart:data', (response) => {
    console.log('[Chart] Received initial data:', response.candles?.length, 'candles');
    
    // Validate that we have candles data
    if (!response.candles || !Array.isArray(response.candles) || response.candles.length === 0) {
      console.warn('[Chart] No valid candle data received');
      return;
    }
    
    const data = formatCandlesData(response.candles, false);
    
    // Validate formatted data before setting to chart
    if (!data || !data.candles || !Array.isArray(data.candles) || data.candles.length === 0) {
      console.warn('[Chart] Formatted data is invalid');
      return;
    }
    
    // Debug: Check first MA12 item for time value
    if (data.MA12?.length > 0) {
      console.log('[Chart] First MA12 item:', data.MA12[0]);
    }
    
    // Set data to chart with validation
    try {
      chartCandlesSeries.setData(data.candles);
      if (data.volume?.length) chartVolumeSeries.setData(data.volume);
      if (data.MA12?.length) chartMA12Series.setData(data.MA12);
      if (data.MA21?.length) chartMA21Series.setData(data.MA21);
      if (data.MA50?.length) chartMA50Series.setData(data.MA50);
      if (data.MA100?.length) chartMA100Series.setData(data.MA100);
      if (data.MA200?.length) chartMA200Series.setData(data.MA200);
      if (data.RSI?.length) chartRSISeries.setData(data.RSI);
      if (data.MACD?.length) chartMACDSeries.setData(data.MACD);
      if (data.MACDSignal?.length) chartMACDSignalSeries.setData(data.MACDSignal);
      if (data.MACDHistogram?.length) chartMACDHistogramSeries.setData(data.MACDHistogram);
      if (data.BBLower?.length) chartBBLowerSeries.setData(data.BBLower);
      if (data.BBMiddle?.length) chartBBMiddleSeries.setData(data.BBMiddle);
      if (data.BBUpper?.length) chartBBUpperSeries.setData(data.BBUpper);

      let markers = checkForCrossOvers(data);
      chartCandlesSeries.setMarkers(markers);
    } catch (error) {
      console.error('[Chart] Error setting chart data:', error);
    }

    //set last bar tracker
    if (data.candles.length) {
      lastBarTime = data.candles[data.candles.length - 1].time;
    }
  });

  $socket.on('chart:update', (response) => {
    const { candle } = response;
    if (!candle) return;

    let live = true;
    if (lastBarTime < candle.time) {
      lastBarTime = candle.time;
      live = false;
    }

    const formattedData = formatCandlesData([candle], live);
    
    chartCandlesSeries.update(formattedData.candles[formattedData.candles.length - 1]);
    chartVolumeSeries.update(formattedData.volume[formattedData.volume.length - 1]);
    if (formattedData.MA12.length) chartMA12Series.update(formattedData.MA12[formattedData.MA12.length - 1]);
    if (formattedData.MA21.length) chartMA21Series.update(formattedData.MA21[formattedData.MA21.length - 1]);
    if (formattedData.MA50.length) chartMA50Series.update(formattedData.MA50[formattedData.MA50.length - 1]);
    if (formattedData.MA100.length) chartMA100Series.update(formattedData.MA100[formattedData.MA100.length - 1]);
    if (formattedData.MA200.length) chartMA200Series.update(formattedData.MA200[formattedData.MA200.length - 1]);
    if (formattedData.RSI.length) chartRSISeries.update(formattedData.RSI[formattedData.RSI.length - 1]);
    if (formattedData.MACD.length) chartMACDSeries.update(formattedData.MACD[formattedData.MACD.length - 1]);
    if (formattedData.MACDSignal.length) chartMACDSignalSeries.update(formattedData.MACDSignal[formattedData.MACDSignal.length - 1]);
    if (formattedData.MACDHistogram.length) chartMACDHistogramSeries.update(formattedData.MACDHistogram[formattedData.MACDHistogram.length - 1]);
    if (formattedData.BBLower.length) chartBBLowerSeries.update(formattedData.BBLower[formattedData.BBLower.length - 1]);
    if (formattedData.BBMiddle.length) chartBBMiddleSeries.update(formattedData.BBMiddle[formattedData.BBMiddle.length - 1]);
    if (formattedData.BBUpper.length) chartBBUpperSeries.update(formattedData.BBUpper[formattedData.BBUpper.length - 1]);
  });

  $socket.on('chart:error', (error) => {
    console.error('[Chart] Socket error:', error);
  });

  $socket.on('chart:subscribed', (data) => {
    console.log('[Chart] Subscribed to:', data.subscriptionKey);
    isSocketConnected.value = true;
  });

  // Use nextTick to ensure socket is ready and wait for userID
  nextTick(() => {
    // Only emit if we have a userID
    if (!userID.value) {
      console.log('[Chart] Waiting for userID to be available...');
      // Watch for userID to become available
      const unwatch = watch(userID, (newUserID) => {
        if (newUserID) {
          console.log('[Chart] UserID now available, loading chart data');
          loadChartData();
          unwatch(); // Stop watching once loaded
        }
      }, { immediate: true });
    } else {
      loadChartData();
    }
  });

  function loadChartData() {
    // Request initial data via socket
    $socket.emit('chart:load', {
      userID: userID.value,
      exchange: currentExchange.value,
      symbol: currentSymbol.value,
      timeframe: selectedTimeframe.value[0],
      limit: 1000
    });

    // Subscribe to live updates
    $socket.emit('chart:subscribe', {
      userID: userID.value,
      exchange: currentExchange.value,
      symbol: currentSymbol.value,
      timeframe: selectedTimeframe.value[0]
    });
  }

  const chartDiv = document.getElementById('chart');

  //fit chart to page
  chartInstance.applyOptions({
    width: chartDiv.offsetWidth,
    height: chartDiv.offsetHeight
  });

  window.onresize = function() {
    chartInstance.applyOptions({
      width: chartDiv.offsetWidth,
      height: chartDiv.offsetHeight
    });
  }
  
  // Watch for theme changes
  watch(isDark, () => {
    updateChartTheme();
  });
})



onUnmounted(() => {
  const { $socket } = useNuxtApp();
  
  // Unsubscribe from socket events
  $socket.emit('chart:unsubscribe', {
    exchange: currentExchange.value,
    symbol: currentSymbol.value,
    timeframe: selectedTimeframe.value[0]
  });
  
  // Remove listeners
  $socket.off('chart:data');
  $socket.off('chart:update');
  $socket.off('chart:error');
  $socket.off('chart:subscribed');
});

// Removed HTTP fetch functions - now using WebSocket only

async function updateAvailableIndicators(indicator) {
  // selectedTimeframe.value = [timeframe];

  // console.log(indicator);

  /*VOLUME*/
  if (indicator === 'volume'){
    chartVolumeSeries.applyOptions({
      visible: selectedIndicators.value.includes(indicator)
    });
  }

  /*MA12*/
  if (indicator === 'MA12') {
    chartMA12Series.applyOptions({
      visible: selectedIndicators.value.includes(indicator)
    });
  }

  /*MA21*/
  if (indicator === 'MA21') {
    chartMA21Series.applyOptions({
      visible: selectedIndicators.value.includes(indicator)
    });
  }

  /*MA50*/
  if (indicator === 'MA50') {
    chartMA50Series.applyOptions({
      visible: selectedIndicators.value.includes(indicator)
    });
  }

  /*MA100*/
  if (indicator === 'MA100') {
    chartMA100Series.applyOptions({
      visible: selectedIndicators.value.includes(indicator)
    });
  }

  /*MA200*/
  if (indicator === 'MA200') {
    chartMA200Series.applyOptions({
      visible: selectedIndicators.value.includes(indicator)
    });
  }

  if (indicator === 'RSI') {
    chartRSISeries.applyOptions({
      visible: selectedIndicators.value.includes(indicator)
    });
  }


  /*MACD*/
  if (indicator === 'MACD') {
    chartMACDSeries.applyOptions({
      visible: selectedIndicators.value.includes(indicator)
    });
    chartMACDSignalSeries.applyOptions({
      visible: selectedIndicators.value.includes(indicator)
    });
    chartMACDHistogramSeries.applyOptions({
      visible: selectedIndicators.value.includes(indicator)
    });
  }


  /*BB*/
  if (indicator === 'BB') {
    chartBBLowerSeries.applyOptions({
      visible: selectedIndicators.value.includes(indicator)
    });
    chartBBMiddleSeries.applyOptions({
      visible: selectedIndicators.value.includes(indicator)
    });
    chartBBUpperSeries.applyOptions({
      visible: selectedIndicators.value.includes(indicator)
    });
  }
}

async function updateCurrentTimeframe(timeframe) {
  const { $socket } = useNuxtApp();
  
  // Unsubscribe from old timeframe
  $socket.emit('chart:unsubscribe', {
    exchange: currentExchange.value,
    symbol: currentSymbol.value,
    timeframe: selectedTimeframe.value[0]
  });
  
  selectedTimeframe.value = [timeframe];

  // Reset indicators
  SMA12Indicator = new SMA(12);
  SMA21Indicator = new SMA(21);
  SMA50Indicator = new SMA(50);
  SMA100Indicator = new SMA(100);
  SMA200Indicator = new SMA(200);
  RSIIndicator = new RSI(14);
  MACDIndicator = new MACD(12, 26, 9);
  BBIndicator = new BollingerBands(20, 2);

  // Request new data via socket (only if userID is available)
  if (userID.value) {
    $socket.emit('chart:load', {
      userID: userID.value,
      exchange: currentExchange.value,
      symbol: currentSymbol.value,
      timeframe: timeframe,
      limit: 1000
    });

    // Subscribe to new timeframe
    $socket.emit('chart:subscribe', {
      userID: userID.value,
      exchange: currentExchange.value,
      symbol: currentSymbol.value,
      timeframe: timeframe
    });
  }
}


function formatCandlesData(data, live = false) {
  // Validate input data
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.warn('[Chart] formatCandlesData: Invalid input data');
    return {
      candles: [],
      volume: [],
      MA12: [],
      MA21: [],
      MA50: [],
      MA100: [],
      MA200: [],
      RSI: [],
      MACD: [],
      MACDSignal: [],
      MACDHistogram: [],
      BBLower: [],
      BBMiddle: [],
      BBUpper: [],
    };
  }
  
  let prices = [];
  let returnData = {
    candles:[],
    volume:[],
    MA12:[],
    MA21:[],
    MA50:[],
    MA100:[],
    MA200:[],
    RSI:[],
    MACD:[],
    MACDSignal:[],
    MACDHistogram:[],
    BBLower:[],
    BBMiddle:[],
    BBUpper:[],
  }

  for (let i = 0; i < data.length; i++) {
    // CCXT returns data as arrays: [timestamp, open, high, low, close, volume]
    let candle;
    if (Array.isArray(data[i])) {
      // Array format from CCXT
      if (data[i].length < 6) {
        console.warn('[Chart] Invalid candle array at index', i, data[i]);
        continue;
      }
      candle = {
        time: data[i][0],
        open: data[i][1],
        high: data[i][2],
        low: data[i][3],
        close: data[i][4],
        volume: data[i][5]
      };
    } else {
      // Object format (for compatibility)
      candle = data[i];
    }
    
    // Convert time to seconds if it's in milliseconds (lightweight-charts expects seconds)
    let time = candle.time;
    if (time > 9999999999) { // If time is in milliseconds
      time = Math.floor(time / 1000);
    }
    
    returnData.candles.push({
      time: time,
      open: parseFloat(candle.open),
      high: parseFloat(candle.high),
      low: parseFloat(candle.low),
      close: parseFloat(candle.close),
    });

    returnData.volume.push({
      time: time,
      value: parseFloat(candle.volume || 0),
      color: (candle.open < candle.close) ? 'rgb(38,166,154)' : 'rgb(239,83,80)'
    });

    prices.push(candle.close);
  }

  // console.log(prices);

  let i = 0;
  prices.forEach((price, index) => {
    // Get the time from the corresponding candle
    const time = returnData.candles[index]?.time;
    if (!time) {
      i++;
      return; // Skip if no corresponding time
    }

    let SMA12Res = 0;
    let SMA21Res = 0;
    let SMA50Res = 0;
    let SMA100Res = 0;
    let SMA200Res = 0;
    let RSIRes = 0
    let MACDRes = 0;
    let BBRes = 0;

    if (live) {

      SMA12Res  = SMA12Indicator.momentValue(price);
      SMA21Res  = SMA21Indicator.momentValue(price);
      SMA50Res  = SMA50Indicator.momentValue(price);
      SMA100Res = SMA100Indicator.momentValue(price);
      SMA200Res = SMA200Indicator.momentValue(price);
      RSIRes    = RSIIndicator.momentValue(price);
      MACDRes   = MACDIndicator.momentValue(price);
      BBRes     = BBIndicator.momentValue(price);

    } else {

      SMA12Res  = SMA12Indicator.nextValue(price);
      SMA21Res  = SMA21Indicator.nextValue(price);
      SMA50Res  = SMA50Indicator.nextValue(price);
      SMA100Res = SMA100Indicator.nextValue(price);
      SMA200Res = SMA200Indicator.nextValue(price);
      RSIRes    = RSIIndicator.nextValue(price);
      MACDRes   = MACDIndicator.nextValue(price);
      BBRes     = BBIndicator.nextValue(price);
    }

    if(SMA12Res) {
      returnData.MA12.push({
        time: time,
        value:SMA12Res,
      });
    }

    if(SMA21Res) {
      returnData.MA21.push({
        time: time,
        value:SMA21Res,
      });
    }

    if(SMA50Res) {
      returnData.MA50.push({
        time: time,
        value:SMA50Res,
      });
    }

    if(SMA100Res) {
      returnData.MA100.push({
        time: time,
        value:SMA100Res,
      });
    }

    if(SMA200Res) {
      returnData.MA200.push({
        time: time,
        value:SMA200Res,
      });
    }

    if(RSIRes) {
      returnData.RSI.push({
        time: time,
        value:RSIRes,
      });
    }

    if(MACDRes) {
      returnData.MACD.push({
        time: time,
        value:MACDRes.macd,
      });

      returnData.MACDSignal.push({
        time: time,
        value:MACDRes.signal,
      });

      returnData.MACDHistogram.push({
        time: time,
        value:MACDRes.histogram,
        color:(MACDRes.histogram > 0) ? 'rgb(38,166,154)' : 'rgb(239,83,80)'
      });
    }

    if(BBRes) {
      returnData.BBLower.push({
        time: time,
        value:BBRes.lower,
      });

      returnData.BBMiddle.push({
        time: time,
        value:BBRes.middle,
      });

      returnData.BBUpper.push({
        time: time,
        value:BBRes.upper,
      });
    }

    i++;
  });


  return returnData;
}

function checkForCrossOvers(data) {

  // console.log(data);

  let maOffset = data.MA12.length - data.MA21.length;
  let markers = [];
  let MA12 = [];
  for (let i = maOffset; i < data.MA12.length; i++) {
    MA12.push(data.MA12[i].value);
  }

  let MA21 = [];
  for (let i = 0; i < data.MA21.length; i++) {
    MA21.push(data.MA21[i].value);
  }

  let crossLines = {
    lineA: MA12,
    lineB: MA21,
  };

  let crossUp = new CrossUp(crossLines);
  let crossDown = new CrossDown(crossLines);
  let crossUpValues = crossUp.getResult();
  let crossDownValues = crossDown.getResult();

  let offset = data.candles.length - crossUpValues.length;

  // console.log(maOffset, crossLines);

  for (let i = 0; i < crossUpValues.length; i++) {
    if (crossUpValues[i] === true) {
      markers.push({ time: data.candles[i+offset].time, position: 'belowBar', color: '#2196F3', shape: 'arrowUp', text: 'BUY' });
    }

    if (crossDownValues[i] === true) {
      markers.push({ time: data.candles[i+offset].time, position: 'aboveBar', color: '#e91e63', shape: 'arrowDown', text: 'SELL' });
    }
  }

  let RSIOffset = data.candles.length - data.RSI.length;
  let overboughtCondition = false;
  let oversoldCondition = false;

  for (let i = 0; i < data.RSI.length; i++) {
    if (data.RSI[i].value > 80 && !overboughtCondition) {
      markers.push({ time: data.candles[i + RSIOffset].time, position: 'aboveBar', color: '#e91e63', shape: 'circle', text: 'OB' });
      overboughtCondition = true;
    } else {
      overboughtCondition = false;
    }
    if (data.RSI[i].value < 20 && !oversoldCondition) {
      markers.push({ time: data.candles[i + RSIOffset].time, position: 'belowBar', color: '#2196F3', shape: 'circle', text: 'OS' });
      oversoldCondition = true;
    } else {
      oversoldCondition = false;
    }
  }

  return markers;
}
</script>

<template>
  <n-card style="margin-bottom: 10px">

    <n-checkbox-group v-model:value="selectedIndicators">
      <n-space item-style="display: flex;">
        <n-checkbox :value="indicator" :label="indicator" v-for="indicator in chartIndicators" @click="updateAvailableIndicators(indicator)"/>
      </n-space>
    </n-checkbox-group>

    <n-checkbox-group v-model:value="selectedTimeframe">
      <n-space item-style="display: flex;">
        <n-checkbox :value="timeframe" :label="timeframe" v-for="timeframe in chartTimeframes" @click="updateCurrentTimeframe(timeframe)"/>
      </n-space>
    </n-checkbox-group>


    <div id="chart" style="height:400px"></div>
  </n-card>
</template>

<style scoped>

</style>
