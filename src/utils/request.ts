import axios from 'axios'
import { stringify } from 'qs'
import { ElMessage } from 'element-plus'

const contentType = 'application/json;charset=UTF-8'
const timeout = 60000

const CODE_MESSAGE: Record<number, string> = {
  200: '服务器成功返回请求数据',
  201: '新建或修改数据成功',
  202: '一个请求已经进入后台排队(异步任务)',
  204: '删除数据成功',
  400: '发出信息有误',
  401: '用户没有权限(令牌失效、用户名、密码错误、登录过期)',
  402: '令牌过期',
  403: '用户得到授权，但是访问是被禁止的',
  404: '访问资源不存在',
  406: '请求格式不可得',
  410: '请求资源被永久删除，且不会被看到',
  500: '服务器发生错误',
  502: '网关错误',
  503: '服务不可用，服务器暂时过载或维护',
  504: '网关超时',
}

const instance = axios.create({
  baseURL: import.meta.env.VITE_APP_BASE_URL,
  withCredentials: true,
  timeout,
  headers: {
    'Content-Type': contentType,
  },
})

// Request Interceptor
instance.interceptors.request.use(
  (config: any) => {
    // Transform data if content type is x-www-form-urlencoded
    if (config.data && config.headers['Content-Type'] === 'application/x-www-form-urlencoded;charset=UTF-8') {
      config.data = stringify(config.data)
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response Interceptor
instance.interceptors.response.use(
  (response) => {
    const { data } = response
    // Directly return data for open APIs as requested
    return data
  },
  (error) => {
    const { response } = error
    console.error('Request Error:', error)
    
    if (response && response.status) {
      const errorText = CODE_MESSAGE[response.status] || response.statusText
      const { status, url } = response
      
      ElMessage.error({
        message: `请求错误 ${status}: ${url}`,
        grouping: true,
        duration: 5000
      })
      
      // If needed, we can also show the detailed error text from CODE_MESSAGE
      if (CODE_MESSAGE[status]) {
         ElMessage.error({
             message: CODE_MESSAGE[status],
             grouping: true
         })
      }
    } else if (!response) {
      ElMessage.error('您的网络发生异常，无法连接服务器')
    }

    if (response === undefined) {
      console.error('Network Error: No response received')
      return Promise.reject(new Error('Network Error'))
    }
    return Promise.reject(response.data || error)
  }
)

export default instance
