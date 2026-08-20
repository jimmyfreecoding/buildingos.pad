<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  disabledSos?: boolean
}>()

const emit = defineEmits<{
  (e: 'childFun', val: boolean): void
}>()

const dialogSos = ref(false)

const setSos = () => {
  dialogSos.value = false
  setTimeout(() => {
    emit('childFun', true)
  }, 200)
}

// Asset URLs
const bgService1 = new URL('../assets/images/bgService1.png', import.meta.url).href
const bgService2 = new URL('../assets/images/bgService2.png', import.meta.url).href
const bgService3 = new URL('../assets/images/bgService3.png', import.meta.url).href
const bgService4 = new URL('../assets/images/bgService4.png', import.meta.url).href
const erweima = new URL('../assets/images/erweima.png', import.meta.url).href
</script>

<template>
  <div class="left-box-box">
    <!-- 综合服务 -->
    <div style="font-size:28px;font-weight:700;padding:12px 0;opacity:0.85;">综合服务</div>
    <div class="content">
      <div class="serice flex-row align-center">
        <!-- 报事报修 -->
        <div class="serice-item flex-row align-center">
          <div class="flex-row align-center" style="position:relative;z-index:2;width:100%;height:100%;">
            <img class="erweima" :src="erweima" />
            <div class="txt-box">
              <div class="txt1">报事报修</div>
              <div class="txt2">Scan for admin service</div>
              <div class="txt3">故障/清洁/维修"码上报单"</div>
              <div class="txt4">请使用企业微信扫描二维码</div>
            </div>
            <img class="bgService" :src="bgService1" />
          </div>
        </div>
        <!-- 轻轻君 -->
        <div class="serice-item flex-row align-center">
          <div class="flex-row align-center" style="position:relative;z-index:2;width:100%;height:100%;">
            <img class="erweima" :src="erweima" />
            <div class="txt-box">
              <div class="txt1">轻轻君</div>
              <div class="txt2">administrative service</div>
              <div class="txt3">行政服务咨询</div>
              <div class="txt4">请使用企业微信扫描二维码</div>
            </div>
            <img class="bgService" :src="bgService2" />
          </div>
        </div>
      </div>

      <div class="serice flex-row align-center" style="padding-top:20px;">
        <!-- 楼层管家 -->
        <div class="serice-item flex-row align-center">
          <div class="flex-row align-center" style="position:relative;z-index:2;width:100%;height:100%;">
            <img class="erweima" :src="erweima" />
            <div class="txt-box">
              <div class="txt1">楼层管家</div>
              <div class="txt2">floor butler</div>
              <div class="txt3">有问题直接找楼长</div>
              <div class="txt4">请使用企业微信扫描二维码</div>
            </div>
            <img class="bgService" :src="bgService2" />
          </div>
        </div>
      </div>
    </div>

    <!-- 紧急呼叫 -->
    <div style="font-size:28px;font-weight:700;padding:12px 0;opacity:0.85;margin-top:40px;">紧急呼叫</div>
    <div
      @click="disabledSos ? null : dialogSos = true"
      class="hujiu-item flex-row align-center"
    >
      <img class="erweima" :src="bgService3" />
      <div class="txt-box">
        <div class="txt1">当您处于以下场景，你可以点击左侧按钮立即呼救：</div>
        <li class="txt2">医疗<span class="txt3">（遭遇意外伤害或突发疾病）</span></li>
        <li class="txt2">消防<span class="txt3">（发生火灾险情、爆炸物、气体泄漏）</span></li>
        <li class="txt2">安保<span class="txt3">（非法闯入、扰乱公司秩序、聚众闹事）</span></li>
      </div>
      <img class="bgService" :src="bgService4" />
    </div>
  </div>

  <!-- SOS确认弹窗 -->
  <el-dialog
    v-model="dialogSos"
    append-to-body
    width="550"
    top="280px"
    :show-close="false"
  >
    <div>确认呼救？</div>
    <div class="huliu-txt">确认呼救后，安保人员会前往您所在楼层进行救援，请谨慎操作此功能</div>
    <div class="huliu-txt">安保处联络方式：</div>
    <template #footer>
      <div class="dialog-footer flex-row justify-around">
        <el-button type="default" @click="dialogSos = false">取消</el-button>
        <el-button type="primary" @click="setSos">确认</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.left-box-box {
  width: 100%;
  height: 100%;
  background: #202838;
  padding: 20px 40px;
  overflow-y: auto;
  .content {
    width: calc(100% - 40px);
    margin-left: 20px;
    min-height: 196px;
    padding: 24px;
    margin-bottom: 60px;
    border-radius: 16px;
    background: #263041;

    .title {
      font-size: 20px;
      font-weight: 500;
      line-height: 28px;
      text-align: left;
      color: #fff;
      opacity: 0.85;
      clear: both;
      margin: 32px 0 16px 0;
    }
    .serice {
      gap: 24px;
      .serice-item {
        width: 754px;
        flex: 0 0 754px;
        flex-wrap: wrap;
        height: 196px;
        gap: 20px;
        border-radius: 14px;
        position: relative;
        padding: 0 20px;
        overflow: hidden;
        background-image: linear-gradient(112.88deg, #7c8aa3 4.92%, #34435b 22.21%, #313f56 35.62%, #313f56 55.07%, #314157 74.54%);
        &::before {
          content: '';
          display: inline-block;
          width: calc(100% - 2px);
          height: calc(100% - 2px);
          position: absolute;
          top: 1px;
          left: 1px;
          border-radius: 14px;
          background: linear-gradient(96.9deg, #4a5a76 8.02%, #34445e 88%);
        }
        .erweima {
          width: 148px;
          height: 148px;
        }
        .txt-box {
          margin-left: 40px;
        }
        .txt1 {
          font-size: 28px;
          color: #fff;
        }
        .txt2 {
          font-size: 20px;
          color: #fff;
          opacity: 0.45;
          margin-bottom: 20px;
        }
        .txt3 {
          font-size: 22px;
          color: #fff;
          opacity: 0.65;
          margin-bottom: 14px;
        }
        .txt4 {
          font-size: 14px;
          color: #fff;
          opacity: 0.45;
        }
        .bgService {
          width: 200px;
          height: 190px;
          position: absolute;
          right: -20px;
          bottom: -30px;
        }
      }

      .close {
        background-image: linear-gradient(96.08deg, #3d4d65 5.78%, rgba(63, 79, 108, 0) 22.99%, rgba(63, 79, 108, 0) 75.06%, #2c3850 91.49%);
        &::before {
          content: '';
          display: inline-block;
          width: calc(100% - 2px);
          height: calc(100% - 2px);
          border-radius: 16px;
          position: absolute;
          top: 1px;
          left: 1px;
          border-radius: transparent;
          background: #1a2130 !important;
        }
      }
    }
  }
  .hujiu-item {
    width: calc(100% - 40px);
    margin-left: 20px;
    height: 296px;
    gap: 20px;
    border-radius: 14px;
    position: relative;
    padding: 0 20px;
    overflow: hidden;
    background: #263041;
    cursor: pointer;
    .erweima {
      width: 310px;
      height: 310px;
      position: relative;
      z-index: 2;
    }
    .txt-box {
      margin-left: 40px;
      position: relative;
      z-index: 2;
    }
    .txt1 {
      font-size: 22px;
      color: #fff;
      opacity: 0.65;
      line-height: 38px;
    }
    .txt2 {
      font-size: 22px;
      color: #fff;
      opacity: 0.8;
      line-height: 34px;
    }
    .txt3 {
      font-size: 22px;
      color: #fff;
      opacity: 0.4;
    }
    .bgService {
      width: 300px;
      height: auto;
      position: absolute;
      right: 0px;
      bottom: 0px;
    }
  }
}
.flex-row { display: flex; flex-direction: row; }
.align-center { align-items: center; }
.justify-around { justify-content: space-around; }
.justify-between { justify-content: space-between; }
</style>

<style lang="scss">
.dialog-footer {
  margin: 0px 0 40px 0 !important;
  padding: 0 20px;
}
.huliu-txt {
  font-size: 20px;
  font-weight: 400;
  text-align: left;
  color: #fff;
  opacity: 0.45;
  margin-top: 16px;
  line-height: 28px;
  padding: 0 30px;
}
</style>
