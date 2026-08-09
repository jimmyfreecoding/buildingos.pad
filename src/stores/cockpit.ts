import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useCockpitStore = defineStore('cockpit', () => {
  // --- UI State (always local) ---
  const background = ref<{ type: 'image' | 'video'; src: string }>({
    type: 'video',
    src: '/pad/video/snow.mp4',
  })

  const brightness = ref(80)

  const setBackground = (type: 'image' | 'video', src: string) => {
    background.value = { type, src }
  }

  // --- Device Mock Data (fallback when no MQTT backend) ---
  const lights = ref([
    { id: 'living', name: 'Living Room', isOn: true, icon: 'Lamp' },
    { id: 'kitchen', name: 'Kitchen', isOn: false, icon: 'ChefHat' },
    { id: 'office', name: 'Office', isOn: true, icon: 'Monitor' },
    { id: 'hall', name: 'Hallway', isOn: false, icon: 'Footprints' },
  ])

  const climate = ref({
    temperature: 24,
    isOn: true,
    mode: 'cool' as 'cool' | 'heat' | 'auto',
  })

  const environment = ref({
    indoorTemp: 23.5,
    humidity: 45,
    co2: 450,
    pm25: 12,
  })

  const toggleLight = (id: string) => {
    const light = lights.value.find((l) => l.id === id)
    if (light) light.isOn = !light.isOn
  }

  return {
    background,
    brightness,
    lights,
    climate,
    environment,
    setBackground,
    toggleLight,
  }
})
