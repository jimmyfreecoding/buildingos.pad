// Project Configuration
// You can adjust the base resolution here to support 16:9 or 16:10 aspect ratios.
// Common 16:9 resolutions: 1920x1080, 2560x1440, 3840x2160
// Common 16:10 resolutions: 1920x1200, 1280x800, 2560x1600

// Read initData from localStorage
const getInitConfig = () => {
  try {
    const data = localStorage.getItem('initData')
    return data ? JSON.parse(data) : null
  } catch (e) {
    return null
  }
}

const initData = getInitConfig()
const is16_10 = initData?.ratio === '16:10'
const is1_1 = initData?.ratio === '1:1'

export const AppConfig = {
  // Base Design Resolution
  design: {
    width: is1_1 ? 480 : 1920,
    height: is1_1 ? 480 : (is16_10 ? 1200 : 1080),
  },

  // App Title
  title: 'GEEQEE Cockpit'
}
