<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  inside: any
  outside: any
  obj: any
}>()

const airValue = (avalue: number, airtype: string) => {
  let showValue: any = '0'
  let parcent = 0

  if (airtype === 'formaldehyde') {
    let sValue = parseFloat((avalue * 1.230).toFixed(3))
    let tValue = sValue > 0.07 ? 0.07 : sValue
    if (tValue === 0) tValue = 0.001
    showValue = tValue
    parcent = 100 - (tValue / 0.16 * 100)
  } else if (airtype === 'co2') {
    let tValue = avalue > 800 ? 802 : avalue
    showValue = tValue
    parcent = 100 - (tValue / 2000 * 100)
  } else if (airtype === 'pm25') {
    let tValue = avalue > 75 ? 75 : avalue
    showValue = tValue
    parcent = 100 - (tValue / 400 * 100)
  } else if (airtype === 'tvoc') {
    let sValue = parseFloat((avalue * 0.0023).toFixed(3))
    let tValue = sValue > 0.4 ? 0.4 : sValue
    if (tValue === 0) tValue = 0.1
    showValue = tValue
    parcent = 100 - (tValue / 2 * 100)
  }
  return { showValue, parcent }
}

const iconWen = new URL('../assets/images/wen.png', import.meta.url).href
const iconTem = new URL('../assets/images/tem.png', import.meta.url).href
</script>

<template>
  <div class="left-box-box">
    <div style="font-size:28px;font-weight:700;padding:12px 0;opacity:0.85;">{{ obj.floor }} {{ obj.name }} 室内外体感对比</div>
    <div class="content align-center flex-row justify-between">
      <div class="main tem flex-col justify-around">
        <div class="title-box flex-row">
          <img class="icon" :src="iconWen" />
          <div>室内温度</div>
        </div>
        <div class="font32 tem-box flex-row">
          <div>{{ (inside.temperature).toFixed(1) }}℃</div>
        </div>
        <el-progress color="#00000000" :percentage="100 - ((inside.temperature - 1 - 16) / (36 - 16)) * 100" :show-text="false" :stroke-width="4"></el-progress>
        <div class="bot-box">室外温度：{{ outside.temperatureNum }}℃</div>
      </div>
      <div class="main hun flex-col justify-around">
        <div class="title-box flex-row">
          <img class="icon" :src="iconTem" />
          <div>室内湿度</div>
        </div>
        <div class="font32 tem-box flex-row">
          <div>{{ inside.humidity }}%</div>
        </div>
        <el-progress color="#00000000" :percentage="100 - inside.humidity" :show-text="false" :stroke-width="4"></el-progress>
        <div class="bot-box">室外湿度：{{ outside.humidity }}</div>
      </div>
    </div>
    <div style="font-size:28px;font-weight:700;padding:12px 0;opacity:0.85;">{{ obj.floor }} {{ obj.name }} 室内环境指标</div>
    <div class="content align-center flex-row justify-between">
      <div class="main qita flex-col justify-around">
        <div class="title-box flex-row align-center">
          <div class="dot"></div>
          <div>室内PM2.5</div>
        </div>
        <div class="font32 tem-box flex-row">
          <div>{{ airValue(inside.pm25, 'pm25').showValue }}<span style="letter-spacing:-4px;">μg</span> /m³</div>
          <div class="color1" style="margin-left:14px">优</div>
        </div>
        <el-progress color="#00000000" :percentage="airValue(inside.pm25, 'pm25').parcent" :show-text="false" :stroke-width="4"></el-progress>
        <div class="bot-box"></div>
      </div>
      <div class="main qita flex-col justify-around">
        <div class="title-box flex-row align-center">
          <div class="dot"></div>
          <div>CO₂</div>
        </div>
        <div class="font32 tem-box flex-row">
          <div>{{ airValue(inside.co2, 'co2').showValue }}ppm</div>
          <div class="color1" style="margin-left:14px">清新</div>
        </div>
        <el-progress color="#00000000" :percentage="airValue(inside.co2, 'co2').parcent" :show-text="false" :stroke-width="4"></el-progress>
        <div class="bot-box"></div>
      </div>
    </div>
    <div class="content align-center flex-row justify-between">
      <div class="main qita flex-col justify-around">
        <div class="title-box flex-row align-center">
          <div class="bgcolor4 dot"></div>
          <div>TVOC</div>
        </div>
        <div class="font32 tem-box flex-row">
          <div>{{ airValue(inside.tvoc, 'tvoc').showValue }}mg/m³</div>
          <div class="color4" style="margin-left:14px">安全</div>
        </div>
        <el-progress color="#00000000" :percentage="airValue(inside.tvoc, 'tvoc').parcent" :show-text="false" :stroke-width="4"></el-progress>
        <div class="bot-box"></div>
      </div>
      <div class="main qita flex-col justify-around">
        <div class="title-box flex-row align-center">
          <div class="bgcolor4 dot"></div>
          <div>甲醛</div>
        </div>
        <div class="font32 tem-box flex-row">
          <div>{{ airValue(inside.formaldehyde, 'formaldehyde').showValue }}mg/m³</div>
          <div class="color4" style="margin-left:14px">安全</div>
        </div>
        <el-progress color="#00000000" :percentage="airValue(inside.formaldehyde, 'formaldehyde').parcent" :show-text="false" :stroke-width="4"></el-progress>
        <div class="bot-box"></div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.left-box-box {
  width: 900px;
  height: 100%;
  background: #202838;
  padding: 20px 40px;
  overflow-y: auto;
  .content {
    width: calc(100% - 40px);
    margin-left: 20px;
    height: 280px;
    padding: 0 24px;
    margin-bottom: 20px;
    border-radius: 16px;
    background: #263041;
    .main {
      font-size: 22px;
      width: 354px;
      height: 232px;
      padding: 14px 24px;
      border-radius: 16px;
      position: relative;
      background-image: linear-gradient(112.88deg, #52647D 4.92%, #34435B 22.21%, #313F56 35.62%, #2E3B51 55.07%, #314157 74.54%);
      &::before {
        content: '';
        display: inline-block;
        width: calc(100% - 2px);
        height: calc(100% - 2px);
        position: absolute;
        top: 1px;
        left: 1px;
        border-radius: 16px;
        background: linear-gradient(102.66deg, #3B475C 6.07%, #2B374A 91.4%);
      }
    }
    .dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background-color: #79D172;
      margin-right: 8px;
    }
    .icon {
      width: 28px;
      height: 28px;
      margin-right: 8px;
    }
    .font32 {
      font-size: 32px;
      position: relative;
    }
    .color1 { color: #79D172; }
    .bgcolor1 { background: #79D172; }
    .color2 { color: #88C271; }
    .bgcolor2 { background: #88C271; }
    .color3 { color: #C7D263; }
    .bgcolor3 { background: #C7D263; }
    .color4 { color: #79D172; }
    .bgcolor4 { background: #79D172; }
    .title-box { opacity: 0.65; }
    .bot-box { opacity: 0.45; }
  }
}
.flex-row { display: flex; flex-direction: row; }
.flex-col { display: flex; flex-direction: column; }
.justify-between { justify-content: space-between; }
.align-center { align-items: center; }
.justify-around { justify-content: space-around; }
</style>

<style lang="scss">
.el-progress-bar__outer {
  overflow: visible !important;
}
.el-progress-bar {
  transform: rotate(180deg);
}
.tem .el-progress-bar__outer {
  background: linear-gradient(90deg, #EE4730 0%, #F49301 25%, #EEE73D 50%, #87DD8B 75%, #418BFB 100%) !important;
}
.tem .el-progress-bar__inner {
  background-color: rgba(61, 66, 69, 0.8) !important;
  height: 6px;
  top: -1px;
}
.tem .el-progress-bar__inner::after {
  width: 6px;
  height: 6px;
  position: absolute;
  right: 0px;
  border-radius: 50%;
  top: -2px;
  border: 4px solid #fff;
}

.hun .el-progress-bar__outer {
  background: linear-gradient(90deg, #EE4730 0%, #F49301 25%, #EEE73D 50%, #87DD8B 75%, #418BFB 100%) !important;
}
.hun .el-progress-bar__inner {
  background-color: rgba(61, 66, 69, 0.8) !important;
  height: 6px;
  top: -1px;
}
.hun .el-progress-bar__inner::after {
  width: 6px;
  height: 6px;
  position: absolute;
  right: 0px;
  border-radius: 50%;
  top: -2px;
  border: 4px solid #fff;
}

.qita .el-progress-bar__outer {
  background: linear-gradient(90deg, #EE4730 0%, #F49301 25%, #EEE73D 50%, #87DD8B 75%, #418BFB 100%) !important;
}
.qita .el-progress-bar__inner {
  background-color: rgba(61, 66, 69, 0.8) !important;
  height: 6px;
  top: -1px;
}
.qita .el-progress-bar__inner::after {
  width: 6px;
  height: 6px;
  position: absolute;
  right: 0px;
  border-radius: 50%;
  top: -2px;
  border: 4px solid #fff;
}

.el-progress-bar__inner::after {
  width: 18px;
  height: 18px;
  position: absolute;
  right: 0px;
  border-radius: 50%;
  top: -2px;
  border: 4px solid #fff;
}
</style>
