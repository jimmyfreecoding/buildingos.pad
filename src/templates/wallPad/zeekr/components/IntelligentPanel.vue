<script setup lang="ts">
import iconZn1 from '../assets/images/iconZn1.png'
import iconZn2 from '../assets/images/iconZn2.png'
import iconZnLine from '../assets/images/iconZnLine.png'
import bgZhineng1 from '../assets/images/bgZhineng1.png'
import bgZhineng from '../assets/images/bgZhineng.png'
import iconZnLine1 from '../assets/images/iconZnLine1.png'
import iconZnLine2 from '../assets/images/iconZnLine2.png'
import iconZnLine3 from '../assets/images/iconZnLine3.png'
import iconZnLine4 from '../assets/images/iconZnLine4.png'
import iconZnLine5 from '../assets/images/iconZnLine5.png'
import iconZn01 from '../assets/images/iconZn01.png'
import iconZn02 from '../assets/images/iconZn02.png'
import iconZn03 from '../assets/images/iconZn03.png'
import iconZn04 from '../assets/images/iconZn04.png'
import iconZn05 from '../assets/images/iconZn05.png'

const activities = [
  { content: '智能化等级Lv.5', timestamp: '自我学习控制', size: 'large', icon: iconZn2 },
  { content: '智能化等级Lv.4', timestamp: '感知控制', size: 'middle', icon: iconZn1 },
  { content: '智能化等级Lv.3', timestamp: '逻辑控制', size: 'middle', icon: iconZn1 },
  { content: '智能化等级Lv.2', timestamp: '定时控制', size: 'middle', icon: iconZn1 },
  { content: '智能化等级Lv.1', timestamp: '远程运维', size: 'middle', icon: iconZn1 },
]
</script>

<template>
  <div class="left-box-box">
    <img class="bg-liudong" :src="bgZhineng" />
    <div class="index-title-box flex-row align-center">
      <div class="txt">杭州极氪大厦</div>
    </div>
    <div class="intell-content flex-row justify-between">
      <div class="time-box">
        <div v-for="(item, index) in activities" :key="index" class="time-line flex-row">
          <div :class="item.size" class="left flex-col align-center">
            <img class="img" :src="item.icon" />
            <img v-if="index < activities.length - 1" class="line" :src="iconZnLine" />
          </div>
          <div :class="item.size" class="right">
            <div class="txt1">{{ item.content }}</div>
            <div class="txt2">{{ item.timestamp }}</div>
          </div>
        </div>
      </div>
      <div class="ta-box flex-row">
        <div class="tg-card">
          <div class="tg-wrapper flex-row" style="margin-top:20px">
            <div class="ta-left">
              <div class="ta-left-content">
                <div class="line-left"></div>
                <div class="ta-content">
                  <div class="txt1">AI算法控制</div>
                  <div class="txt2">极氪智慧楼宇按照智能化L5级标准建设，通过物联网数据中台可以完成30年的超长存储，通过数据进行机器学习，不断优化AI算法来完成L5级楼宇智能。</div>
                </div>
              </div>
            </div>
            <img class="lines" :src="iconZnLine1" style="margin-top:20px" />
            <img class="img" :src="iconZn01" />
          </div>
          <div class="tg-wrapper flex-row">
            <div class="ta-left" style="margin-top:100px">
              <div class="ta-left-content">
                <div class="line-left"></div>
                <div class="ta-content">
                  <div class="txt1">场景配置</div>
                  <div class="txt2">配置逻辑条件进行智能化控制，如实现场景联动等应用</div>
                </div>
              </div>
            </div>
            <img class="lines" :src="iconZnLine2" style="margin-top:100px" />
            <img class="img" :src="iconZn02" />
          </div>
          <div class="tg-wrapper flex-row">
            <div class="ta-left" style="margin-top:210px">
              <div class="ta-left-content">
                <div class="line-left"></div>
                <div class="ta-content">
                  <div class="txt1">多操作端</div>
                  <div class="txt2">远程进行运维管理：建筑运维</div>
                </div>
              </div>
            </div>
            <img class="lines" :src="iconZnLine3" style="margin-top:210px" />
            <img class="img" :src="iconZn03" />
          </div>
        </div>
        <img class="bg" :src="bgZhineng1" />
        <div class="tg-card">
          <div class="tg-wrapper flex-row">
            <img class="lines right" :src="iconZnLine4" style="margin-top:100px" />
            <div class="ta-left" style="margin-top:100px">
              <div class="ta-left-content">
                <div class="ta-content">
                  <div class="txt1" style="float:right">多种传感器覆盖</div>
                  <div class="txt2">上万个传感器可对楼宇的空气、环境、能耗指标实时监测和调控</div>
                </div>
                <div class="line-right"></div>
              </div>
            </div>
            <img class="img right" :src="iconZn04" />
          </div>
          <div class="tg-wrapper flex-row">
            <img class="lines right" :src="iconZnLine5" style="margin-top:200px" />
            <div class="ta-left" style="margin-top:200px">
              <div class="ta-left-content">
                <div class="ta-content">
                  <div class="txt1" style="float:right">算法策略</div>
                  <div class="txt2">通过AI调控策略自动进行调节，确保时刻处于能耗和体验的最佳平衡点</div>
                </div>
                <div class="line-right"></div>
              </div>
            </div>
            <img class="img right" :src="iconZn05" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.left-box-box {
  width: 100%;
  height: 100%;
  background: #202838;
  padding: 20px 100px 20px 40px;
  position: relative;
  overflow: hidden;
  .bg-liudong {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
  .index-title-box {
    font-size: 26px;
    letter-spacing: 2px;
    margin: 20px 20px 20px 26px;
    position: relative;
    z-index: 1;
  }
  .intell-content {
    width: 100%;
    padding: 20px 13px;
    margin-bottom: 20px;
    border-radius: 16px;
    position: relative;
    z-index: 1;
    .left {
      margin-right: 20px;
      width: 48px;
      .line {
        width: 23px;
        height: 138px;
        margin: 16px 0;
      }
    }
    .large .img { width: 48px; height: 48px; }
    .middle .img { width: 36px; height: 36px; }
    .large .txt1 {
      font-size: 28px;
      font-weight: 500;
      line-height: 28px;
      text-align: left;
      color: #fff;
    }
    .large .txt2 {
      font-size: 24px;
      font-weight: 500;
      line-height: 42px;
      text-align: left;
      color: #fff;
      margin-top: 14px !important;
      margin-bottom: 100px;
    }
    .middle .txt1 {
      font-size: 24px;
      font-weight: 500;
      line-height: 28px;
      text-align: left;
      color: #8194B6;
    }
    .middle .txt2 {
      font-size: 22px;
      font-weight: 500;
      line-height: 42px;
      text-align: left;
      color: #60708C;
      margin-top: 10px !important;
      margin-bottom: 100px;
    }
  }
  .ta-box {
    .tg-card {
      .tg-wrapper {
        position: relative;
        .lines {
          width: auto;
          height: 20px;
          position: absolute;
          left: 320px;
          top: 30px;
        }
        .lines.right {
          width: 171px;
          height: 104px;
          position: absolute;
          left: -162px;
          top: 30px;
          z-index: 1;
        }
        .img {
          width: 135px;
          height: 120px;
          position: absolute;
          bottom: 0;
          right: 0;
        }
        .img.right {
          left: 0;
        }
        .ta-left {
          width: 330px;
          height: auto;
          border-radius: 8px;
          position: relative;
          overflow: hidden;
          background-image: linear-gradient(112.88deg, #52647D 4.92%, #34435B 22.21%, #313F56 35.62%, #2E3B51 55.07%, #314157 74.54%);
          &::before {
            content: '';
            display: inline-block;
            width: calc(100% - 2px);
            height: calc(100% - 2px);
            position: absolute;
            top: 1px;
            left: 1px;
            border-radius: transparent;
            background: #3B475C !important;
          }
          .line-left {
            width: 10px;
            height: 100%;
            position: absolute;
            top: 0;
            left: 0;
            z-index: 2;
            background: #F76400 !important;
          }
          .line-right {
            width: 10px;
            height: 100%;
            position: absolute;
            top: 0;
            right: 0;
            z-index: 2;
            background: #F76400 !important;
          }
          .lines {
            height: 20px;
            width: auto;
          }
          .ta-left-content {
            width: 330px;
            position: relative;
            z-index: 2;
            padding: 20px 24px 20px 30px;
          }
          .txt1 {
            text-align: center;
            border-radius: 4px;
            background: rgba(255, 255, 255, 0.2);
            font-size: 20px;
            margin-bottom: 16px;
            padding: 4px 10px;
            width: max-content;
          }
          .txt2 {
            clear: both;
            color: #FFF;
            font-family: "PingFang SC";
            font-size: 20px;
            font-style: normal;
            font-weight: 400;
            line-height: normal;
            text-align: justify;
          }
        }
      }
    }
    .bg {
      width: 425px;
      height: auto;
      margin: 0 30px;
    }
  }
}
.time-box {
  .time-line:first-child {
    .right {
      padding-top: 12px;
    }
  }
  .time-line:nth-child(n + 2) {
    .right {
      padding-top: 6px;
    }
  }
}
.flex-row { display: flex; flex-direction: row; }
.flex-col { display: flex; flex-direction: column; }
.align-center { align-items: center; }
.justify-between { justify-content: space-between; }
</style>
