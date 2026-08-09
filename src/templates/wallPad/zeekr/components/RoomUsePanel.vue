<script setup lang="ts">
const props = defineProps<{
  roomoSensorObj: any
  meetingRooms: any[]
  wcmanStatusObj: any
  wcwomanStatusObj: any
}>()

const showStatus = (code: string) => {
  let returnStyle = ''
  let returnTitle = '调试中'
  const sensorData = props.roomoSensorObj[code]
  if (sensorData && sensorData.status !== undefined) {
    if (sensorData.online?.includes(1)) {
      if (!sensorData.status?.includes('busy')) {
        returnStyle = ''
        returnTitle = '空闲'
      } else {
        returnStyle = 'bg-active'
        returnTitle = '使用中'
      }
    } else {
      returnStyle = ''
      returnTitle = '调试中'
    }
  }
  return [returnStyle, returnTitle]
}

const showText = (cwobj: any) => {
  let count = 0
  let returnText = '空闲'
  const keys = Object.keys(cwobj || {})
  if (keys.length > 0) {
    keys.forEach((t) => {
      if (cwobj[t] == 1) count++
    })
  }
  if (count === 0) returnText = '无人'
  else if (count > 0 && count < keys.length) returnText = '空闲'
  else if (count === keys.length) returnText = '满员'
  return returnText
}
</script>

<template>
  <div class="left-box-box">
    <div class="index-title-box flex-row align-center">
      <div class="txt">会议室实时状态</div>
    </div>
    <div class="content">
      <div class="rooms flex-row align-center justify-between">
        <div
          v-for="(item, index) in meetingRooms"
          :key="index"
          class="rooms-item flex-row align-center justify-between"
          :style="{ marginRight: index == meetingRooms.length - 1 ? 'auto' : '0' }"
          :class="showStatus(item.code)[0]"
        >
          <div style="width:100%;position:relative;z-index:2" class="padding20 flex-row align-center justify-between">
            <div class="txt">{{ item.code.substring(1) }}</div>
            <div class="txt">{{ showStatus(item.code)[1] }}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="index-title-box flex-row align-center" style="margin-top:40px">
      <div class="txt">厕卫实时状态</div>
    </div>
    <div class="content">
      <div class="rooms flex-row align-center justify-around">
        <div class="rooms-item flex-row align-center justify-between" :class="[showText(wcmanStatusObj) === '无人' ? 'bg-black' : '']">
          <div style="width:100%;position:relative;z-index:2" class="padding20 flex-row align-center justify-between">
            <div class="txt">男卫</div>
            <div class="txt">{{ showText(wcmanStatusObj) }}</div>
          </div>
        </div>
        <div class="rooms-item flex-row align-center justify-between" :class="[showText(wcwomanStatusObj) === '无人' ? 'bg-black' : '']">
          <div style="width:100%;position:relative;z-index:2" class="padding20 flex-row align-center justify-between">
            <div class="txt">女卫</div>
            <div class="txt">{{ showText(wcwomanStatusObj) }}</div>
          </div>
        </div>
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
  .index-title-box {
    font-size: 26px;
    letter-spacing: 2px;
    margin: 20px 20px 20px 26px;
    position: relative;
    z-index: 1;
  }
  .content {
    width: calc(100% - 40px);
    margin-left: 20px;
    padding: 24px;
    margin-bottom: 20px;
    border-radius: 16px;
    position: relative;
    background-image: linear-gradient(112.88deg, #52647d 4.92%, #34435b 22.21%, #313f56 35.62%, #2e3b51 55.07%, #314157 74.54%);
    &::before {
      content: '';
      display: inline-block;
      width: calc(100% - 2px);
      height: calc(100% - 2px);
      position: absolute;
      top: 1px;
      left: 1px;
      border-radius: 16px;
      background: #263041;
    }
    .rooms {
      gap: 24px;
      flex-wrap: wrap;
      .rooms-item {
        font-size: 32px;
        height: 88px;
        flex: 1 0 354px;
        flex-wrap: wrap;
        border-radius: 14px;
        position: relative;
        background-image: linear-gradient(96.08deg, #607594 5.78%, rgba(63, 79, 108, 0) 22.99%, rgba(63, 79, 108, 0) 75.06%, #3f4f6c 91.49%);
        &::before {
          content: '';
          display: inline-block;
          width: calc(100% - 2px);
          height: calc(100% - 2px);
          position: absolute;
          top: 1px;
          left: 1px;
          border-radius: 14px;
          background: #54647de0;
        }
        &:last-child {
          flex: 0 0 354px;
        }
        .txt {
          font-size: 32px;
        }
      }
      .bg-active {
        background: #f95c2a88 !important;
        border-radius: 14px;
        &::before {
          content: '';
          display: inline-block;
          width: calc(100% - 2px);
          height: calc(100% - 2px);
          position: absolute;
          top: 1px;
          left: 1px;
          border-radius: 14px;
          background: #f95c2a88;
        }
      }
    }
  }
}
.padding20 { padding: 24px; }
.flex-row { display: flex; flex-direction: row; }
.justify-between { justify-content: space-between; }
.justify-around { justify-content: space-around; }
.align-center { align-items: center; }
</style>
