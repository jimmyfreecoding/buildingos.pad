<template>
  <!-- 当日会议时间轴（原项目 src/components/meetList.vue）：进行中标签用主题主色 -->
  <div class="meeting-list">
    <el-table
      :data="props.data"
      :highlight-current-row="false"
      height="300"
      row-class-name="row-class-name"
      :row-style="{ background: 'rgba(255,255,255,0)', color: '#fff', borderColor: 'rgba(255,255,255,0)' }"
      :header-cell-style="{ background: 'rgba(156, 156, 156)', color: '#fff', fontSize: '22px', fontFamily: 'ly-regular' }"
      style="width: 100%"
    >
      <template #empty>
        <span>暂无数据</span>
      </template>
      <el-table-column align="center" label="会议时间" width="180px">
        <template #default="{ row }">{{ row.startTime }}-{{ row.endTime }}</template>
      </el-table-column>
      <el-table-column prop="name" align="center" label="预订人" />
      <el-table-column prop="dept" align="center" label="预约部门" width="200px" />
      <el-table-column prop="status" align="center" label="状态">
        <template #default="scope">
          <div
            class="btn"
            :class="statusMap[scope.row.status][0]"
            :style="scope.row.status === 1 ? { background: accent } : undefined"
          >
            {{ statusMap[scope.row.status][1] }}
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  data: Array<Record<string, any>>
  /** 主题主色（进行中标签） */
  accent?: string
}>(), { accent: '#f36604' })

const statusMap = ref<Record<number, [string, string]>>({
  0: ['btn-weikaishi', '未开始'],
  1: ['btn-jinxingzhong', '进行中'],
  2: ['btn-keyuyue', '可预约'],
})
</script>

<style>
.el-table .cell {
  font-family: 'DingTalk-JinBuTi' !important;
}
.el-table__empty-text {
  color: rgba(255, 255, 255, 0) !important;
}
.row-class-name {
  pointer-events: none !important;
}
</style>

<style scoped lang="scss">
.meeting-list {
  width: 706px;

  .btn {
    width: 95px;
    height: 32px;
    line-height: 32px;
    border-radius: 16px;
    text-align: center;
    font-size: 20px;
    color: #fff;
    margin: 0 auto;
    margin-top: 6px;
  }
  /* 进行中：底色由主题 accent 动态注入 */
  .btn-jinxingzhong {
    background: #f36604;
  }
  .btn-keyuyue {
    background: #40891f;
  }
  .btn-weikaishi {
    background: #1054d2;
  }
  :deep(.el-table) {
    background-color: transparent !important;
  }
  :deep(.el-table .el-table__cell) {
    height: 44px;
    line-height: 44px;
    font-size: 22px;
    font-family: 'ly-regular', serif;
    border-bottom: none !important;
  }
  :deep(.el-table td.el-table__cell),
  :deep(.el-table th.el-table__cell.is-leaf) {
    background: rgba(255, 255, 255, 0);
    border-bottom: none !important;
    padding: 4px 0;
    .cell {
      width: 100%;
      background: rgba(127, 127, 127, 0.2);
      height: 44px;
      line-height: 44px;
      font-size: 22px;
      font-family: 'DingTalk-JinBuTi', serif !important;
    }
  }
  :deep(.el-table__inner-wrapper::before) {
    content: '';
    background-color: rgba(127, 127, 127, 0) !important;
  }
}
</style>
