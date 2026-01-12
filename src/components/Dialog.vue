<script setup lang="ts">
import { computed } from 'vue'
import { X } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  modelValue: boolean
  width?: string
}>(), {
  width: '600px'
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})
</script>

<template>
  <el-dialog
    v-model="visible"
    :show-close="false"
    :modal="true"
    :append-to-body="true"
    :width="width"
    class="!bg-transparent !shadow-none !p-0 custom-dialog"
    align-center
  >
    <div class="relative">
      <!-- Close Button (Outside Top Right) -->
      <button 
        class="absolute -right-12 -top-12 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all active:scale-95 z-50"
        @click="visible = false"
      >
        <X class="w-5 h-5 text-white/80" />
      </button>

      <!-- Dialog Content -->
      <div class="bg-white rounded-[2rem] p-12 min-h-[400px] flex flex-col justify-between shadow-2xl">
        <slot></slot>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped>
:deep(.el-dialog__header) {
  display: none;
}
:deep(.el-dialog__body) {
  padding: 0;
}
:deep(.custom-dialog) {
  background: transparent !important;
  box-shadow: none !important;
}
</style>