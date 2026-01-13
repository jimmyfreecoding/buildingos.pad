import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useCockpitStore = defineStore('cockpit', () => {
  // Background State
  const background = ref({
    type: 'video' as 'image' | 'video',
    src: '/pad/video/snow.mp4' // Default Video
  })

  // Lighting State
  const lights = ref([
    { id: 'living', name: 'Living Room', isOn: true, icon: 'Lamp' },
    { id: 'kitchen', name: 'Kitchen', isOn: false, icon: 'ChefHat' }, // Lucide might not have ChefHat easily mapped, use generic
    { id: 'office', name: 'Office', isOn: true, icon: 'Monitor' },
    { id: 'hall', name: 'Hallway', isOn: false, icon: 'Footprints' }
  ])

  const brightness = ref(80)

  // Climate State
  const climate = ref({
    temperature: 24,
    isOn: true,
    mode: 'cool' as 'cool' | 'heat' | 'auto'
  })

  // Environment State (Mock Data)
  const environment = ref({
    indoorTemp: 23.5,
    humidity: 45,
    co2: 450, // ppm
    pm25: 12  // µg/m³
  })

  const toggleLight = (id: string) => {
    const light = lights.value.find(l => l.id === id)
    if (light) light.isOn = !light.isOn
  }

  const setBackground = (type: 'image' | 'video', src: string) => {
    background.value = { type, src }
  }

  return {
    background,
    lights,
    brightness,
    climate,
    environment,
    toggleLight,
    setBackground
  }
})
