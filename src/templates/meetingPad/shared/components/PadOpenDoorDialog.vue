<template>
  <!-- 开门密码输入（原项目 src/components/reset.vue，vant 键盘改为项目内自绘键盘） -->
  <el-dialog
    :model-value="modelValue"
    title="开门密码"
    width="420px"
    align-center
    append-to-body
    class="open-door-dialog"
    @update:model-value="onVisible"
  >
    <div class="pad-pw">
      <div class="txt1">请输入管理员密码：</div>
      <div class="dots">
        <div v-for="i in 4" :key="i" class="dot" :class="{ active: value.length >= i, error: !!errorInfo }"></div>
      </div>
      <div class="error">{{ errorInfo }}</div>
      <div class="keyboard">
        <div v-for="(row, ri) in keys" :key="ri" class="kb-row">
          <div
            v-for="key in row"
            :key="key"
            class="kb-key"
            :class="{ empty: !key, del: key === 'del' }"
            @click="key === 'del' ? onDelete() : key ? onKey(key) : null"
          >
            {{ key === 'del' ? '删除' : key }}
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: boolean
  password?: string
}>(), { modelValue: false, password: '1205' })

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'open-door'): void
}>()

const value = ref('')
const errorInfo = ref('')
const keys = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['', '0', 'del']]

const onVisible = (v: boolean) => emit('update:modelValue', v)

watch(() => props.modelValue, (v) => {
  if (v) { value.value = ''; errorInfo.value = '' }
})

const onKey = (k: string) => {
  if (value.value.length >= 4) return
  errorInfo.value = ''
  value.value += k
  if (value.value.length === 4) {
    const expected = props.password || '1205'
    if (value.value === expected) {
      value.value = ''
      emit('open-door')
      emit('update:modelValue', false)
    } else {
      errorInfo.value = '密码错误'
      value.value = ''
    }
  }
}

const onDelete = () => { value.value = value.value.slice(0, -1) }
</script>

<style scoped>
.pad-pw {
  text-align: center;
}
.txt1 {
  font-size: 18px;
  margin-bottom: 16px;
}
.dots {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 6px;
}
.dot {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.25);
  transition: background 0.2s;
}
.dot.active {
  background: #ed8733;
  border-color: #ed8733;
}
.dot.error {
  background: #ff5443;
  border-color: #ff5443;
}
.error {
  height: 24px;
  color: #ff5443;
  font-size: 16px;
  margin-top: 4px;
}
.keyboard {
  width: 320px;
  margin: 10px auto 0;
}
.kb-row {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 8px;
}
.kb-key {
  width: 88px;
  height: 54px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
}
.kb-key:hover {
  background: rgba(255, 255, 255, 0.18);
}
.kb-key:active {
  background: rgba(255, 255, 255, 0.28);
}
.kb-key.empty {
  background: transparent;
  cursor: default;
}
.kb-key.del {
  font-size: 18px;
  background: rgba(255, 255, 255, 0.05);
}
</style>
