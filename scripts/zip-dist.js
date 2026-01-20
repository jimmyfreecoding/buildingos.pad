import fs from 'node:fs'
import path from 'node:path'
import archiver from 'archiver'
import { fileURLToPath } from 'node:url'
import packageJson from '../package.json' with { type: 'json' }

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const projectName = packageJson.name
const projectVersion = packageJson.version

const zipFileName = 'pad.zip'
const distPath = path.join(__dirname, '../dist')
const zipFilePath = path.join(distPath, zipFileName)

if (!fs.existsSync(distPath)) {
  console.error('❌ dist目录不存在，请先执行构建命令')
  process.exit(1)
}

function getBuildId() {
  return (
    process.env.CI_BUILD_ID ||
    process.env.BUILD_ID ||
    process.env.GITHUB_RUN_ID ||
    process.env.GITLAB_PIPELINE_ID ||
    process.env.JENKINS_BUILD_ID ||
    process.env.BUILD_NUMBER ||
    process.env.GITHUB_SHA ||
    process.env.CI_COMMIT_SHA ||
    'local'
  )
}

const versionInfo = {
  name: projectName || 'frontend',
  version: projectVersion || '0.0.0',
  build: getBuildId(),
  time: new Date().toISOString(),
}

try {
  fs.writeFileSync(path.join(distPath, 'version.json'), JSON.stringify(versionInfo, null, 2), 'utf-8')
  console.log('📝 已生成 version.json:', versionInfo)
} catch (e) {
  console.error('❌ 生成 version.json 失败:', e)
}

const output = fs.createWriteStream(zipFilePath)
const archive = archiver('zip', { zlib: { level: 9 } })

output.on('close', function () {
  const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2)
  console.log('✅ 压缩包创建成功！')
  console.log(`📦 文件名: ${zipFileName}`)
  console.log(`📊 大小: ${sizeInMB} MB`)
  console.log(`📍 位置: ${zipFilePath}`)
})

archive.on('error', function (err) {
  console.error('❌ 压缩过程中出现错误:', err)
  throw err
})

console.log('🚀 开始压缩dist目录...')
archive.pipe(output)
archive.glob('**/*', { cwd: distPath, ignore: [zipFileName] })
archive.finalize()
