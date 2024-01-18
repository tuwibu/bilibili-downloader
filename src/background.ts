'use strict'

import { app, protocol, BrowserWindow, ipcMain, shell, dialog, Menu, globalShortcut } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import installExtension, { VUEJS3_DEVTOOLS } from 'electron-devtools-installer'
import path from 'path'
import fs from 'fs-extra'
import { settingData } from './assets/data/default'
import { TaskData, SettingData } from './type'
import downloadVideo from './core/download'
import puppeteer from 'puppeteer'
const Store = require('electron-store')
const got = require('got')
const log = require('electron-log')

const store = new Store({
  name: 'database'
})
const isDevelopment = process.env.NODE_ENV !== 'production'
let win: BrowserWindow

// 设置软件系统菜单
const template: any = [
  {
    label: app.name,
    submenu: [
      { label: 'Về', role: 'about' },
      { label: 'thu nhỏ', role: 'minimize' },
      { label: 'thoát', role: 'quit' }
    ]
  },
  {
    label: 'Vận hành',
    submenu: [
      { label: 'chọn tất cả', role: 'selectAll' },
      { label: 'sao chép', role: 'copy' },
      { label: 'dán', role: 'paste' }
    ]
  }
]
const appMenu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(appMenu)

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

// 打开浏览器
ipcMain.on('open-browser', (event, url) => {
  shell.openExternal(url)
})

// 打开本地文件
ipcMain.on('open-path', (event, path) => {
  shell.openPath(path)
})

ipcMain.handle('getvideos', async (event, {
  url,
  cookie
}) => {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null
  })
  const page = await browser.newPage()
  if (cookie) {
    try {
      const rawData = await fs.readFileSync(cookie, 'utf8')
      const cookieData = await JSON.parse(rawData)
      await page.setCookie(...cookieData)
    } catch (error: any) {
      await browser.close()
      throw new Error(`readFileSync error: ${error.message}`)
    }
  }
  await page.goto(url, {
    waitUntil: 'networkidle0',
    timeout: 0
  })
  await page.reload({
    waitUntil: 'networkidle0',
    timeout: 0
  })
  await page.waitForTimeout(1000)
  const avatar = await page.evaluate(() => {
    const avatar = document.querySelector('.header-entry-avatar .bili-avatar')
    return avatar !== null
  })
  if (!avatar) {
    await browser.close()
    throw new Error('Chưa đăng nhập, vui lòng file nhập cookie trong setting')
  }
  await page.waitForSelector('.cube-list', {
    timeout: 0
  })
  const avatarChannel = await page.waitForSelector('.h-info > div.avatar-container img', {
    timeout: 0
  })
  const avatarUrl = await avatarChannel?.evaluate(node => node.getAttribute('src'))
  const channelName = await page.waitForSelector('.h-info > div.h-basic #h-name', {
    timeout: 0
  })
  const name = await channelName?.evaluate(node => node.textContent)
  const countVideo = await page.waitForSelector('#submit-video-type-filter a.active span', {
    timeout: 0
  })
  const count = await countVideo?.evaluate(node => node.textContent)
  const videos: {
    videoUrl: string
  }[] = []
  await page.waitForSelector('.cube-list > li > a.cover', {
    timeout: 0
  })
  const lists = await page.$$('.cube-list > li > a.cover')
  if (lists.length) {
    for (const item of lists) {
      const url = await item.evaluate(node => node.getAttribute('href'))
      if (url) videos.push({ videoUrl: 'https:' + url })
    }
  }
  await browser.close()
  return {
    info: {
      avatar: 'https:' + avatarUrl,
      name,
      count,
      url: url
    },
    videos
  }
})

// 打开选择文件夹dialog
ipcMain.handle('open-dir-dialog', () => {
  const filePaths = dialog.showOpenDialogSync({
    title: 'Chọn địa chỉ tải xuống',
    defaultPath: app.getPath('downloads'),
    properties: ['openDirectory']
  })
  if (filePaths) {
    return Promise.resolve(filePaths[0])
  } else {
    return Promise.resolve('')
  }
})

ipcMain.handle('open-dir-dialog-file', () => {
  const filePaths = dialog.showOpenDialogSync({
    title: 'Chọn file json',
    defaultPath: app.getPath('downloads'),
    properties: ['openFile'],
    filters: [
      { name: 'JSON Files', extensions: ['json'] }
    ]
  })
  if (filePaths && filePaths.length > 0) {
    const selectedFilePath = filePaths[0]
    const extname = path.extname(selectedFilePath)

    if (extname.toLowerCase() === '.json') {
      return Promise.resolve(selectedFilePath)
    } else {
      dialog.showErrorBox('Lỗi', 'Chỉ chấp nhận tệp JSON.')
      return Promise.resolve('')
    }
  } else {
    return Promise.resolve('')
  }
})

// 打开文件夹
ipcMain.on('open-dir', (event, list) => {
  const fileDirs: string[] = []
  list.forEach((id: string) => {
    const task = store.get(`taskList.${id}`)
    if (task && task.fileDir) fileDirs.push(task.fileDir)
  })
  fileDirs.forEach(dir => {
    shell.openPath(dir)
  })
})

// 发送http请求
ipcMain.handle('got', (event, url, option) => {
  return new Promise((resolve, reject) => {
    got(url, option)
      .then((res: any) => {
        return resolve({ body: res.body, redirectUrls: res.redirectUrls, headers: res.headers })
      })
      .catch((error: any) => {
        log.error(`http error: ${error.message}`)
        return reject(error.message)
      })
  })
})

// 发送http请求，得到buffer
ipcMain.handle('got-buffer', (event, url, option) => {
  return new Promise((resolve, reject) => {
    got(url, option)
      .buffer()
      .then((res: any) => {
        return resolve(res)
      })
      .catch((error: any) => {
        log.error(`http error: ${error.message}`)
        return reject(error.message)
      })
  })
})

// electron-store 操作
ipcMain.handle('get-store', (event, path) => {
  return Promise.resolve(store.get(path))
})

ipcMain.on('set-store', (event, path, data) => {
  store.set(path, data)
})

ipcMain.on('delete-store', (event, path) => {
  store.delete(path)
})

// 创建右键菜单
ipcMain.handle('show-context-menu', (event, type: string) => {
  return new Promise((resolve, reject) => {
    const menuMap = {
      download: [
        {
          label: 'Xóa tác vụ',
          type: 'normal',
          click: () => resolve('delete')
        },
        {
          label: 'tải lại',
          type: 'normal',
          click: () => resolve('reload')
        },
        {
          label: 'mở thư mục',
          type: 'normal',
          click: () => resolve('open')
        },
        {
          label: 'chọn tất cả',
          type: 'normal',
          click: () => resolve('selectAll')
        },
        {
          label: 'phát video',
          type: 'normal',
          click: () => resolve('play')
        }
      ],
      home: [
        { label: 'Chọn tất cả', role: 'selectAll' },
        { label: 'copy', role: 'copy' },
        { label: 'dán', role: 'paste' }
      ]
    }
    const template: any = menuMap[type]
    const contextMenu = Menu.buildFromTemplate(template)
    contextMenu.popup({ window: win })
  })
})

// 打开删除任务dialog
ipcMain.handle('open-delete-video-dialog', (event, taskCount) => {
  return new Promise((resolve, reject) => {
    dialog.showMessageBox(win, {
      type: 'info',
      title: 'gợi ý',
      message: `Hiện đã được chọn${taskCount}nhiệm vụ, bạn có chắc chắn muốn xóa nó không?？`,
      checkboxLabel: 'Đồng thời xóa các tập tin',
      buttons: ['Hủy bỏ', 'xóa bỏ']
    })
      .then(res => {
        return resolve(res)
      })
      .catch(error => {
        return reject(error)
      })
  })
})

// 删除任务文件
ipcMain.handle('delete-videos', (event, filePaths) => {
  for (const key in filePaths) {
    fs.removeSync(filePaths[key])
  }
  return Promise.resolve('success')
})

// 下载任务
ipcMain.on('download-video', (event, task: TaskData) => {
  const setting: SettingData = store.get('setting')
  downloadVideo(task, event, setting)
})

// 获取视频大小
ipcMain.handle('get-video-size', (event, id: string) => {
  const task = store.get(`taskList.${id}`)
  if (task && task.filePathList) {
    try {
      const stat = fs.statSync(task.filePathList[0])
      return Promise.resolve(stat.size)
    } catch (error: any) {
      log.error(`get-video-size error: ${error.message}`)
    }
    try {
      const stat1 = fs.statSync(task.filePathList[2])
      const stat2 = fs.statSync(task.filePathList[3])
      return Promise.resolve(stat1.size + stat2.size)
    } catch (error) {
      return Promise.resolve(0)
    }
  }
})

// 关闭app
ipcMain.on('close-app', () => {
  handleCloseApp()
})

// 最小化app
ipcMain.on('minimize-app', () => {
  if (!win.isMinimized()) win.minimize()
})

// 打开删除任务dialog
ipcMain.handle('open-reload-video-dialog', (event, taskCount) => {
  return new Promise((resolve, reject) => {
    dialog.showMessageBox(win, {
      type: 'info',
      title: 'gợi ý',
      message: `Hiện đã được chọn${taskCount}task, bạn có chắc chắn muốn tải xuống lại không?`,
      buttons: ['Hủy bỏ', 'Tải xuống']
    })
      .then(res => {
        return resolve(res)
      })
      .catch(error => {
        return reject(error)
      })
  })
})

// 保存弹幕文件
ipcMain.on('save-danmuku-file', (event, content, path) => {
  fs.writeFile(path, content, { encoding: 'utf8' })
})

async function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    resizable: false,
    maximizable: false,
    minimizable: true,
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: (process.env
        .ELECTRON_NODE_INTEGRATION as unknown) as boolean,
      contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false
    }
  })

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string)
    if (!process.env.IS_TEST) win.webContents.openDevTools({ mode: 'detach' })
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    win.loadURL('app://./index.html')
  }
}

function initStore () {
  const setting = store.get('setting')
  const taskList = store.get('taskList')
  if (!setting) {
    store.set('setting', {
      ...settingData,
      downloadPath: app.getPath('downloads')
    })
  } else {
    store.set('setting', {
      ...settingData,
      ...store.get('setting')
    })
  }
  if (!taskList) {
    store.set('taskList', {})
  }
  // 存储store
  win.webContents.on('did-finish-load', () => {
    win.webContents.send('init-store', {
      setting: store.get('setting'),
      taskList: store.get('taskList')
    })
  })
}

function handleCloseApp () {
  // 检查当前是否有下载中任务
  const taskList = store.get('taskList')
  let count = 0
  for (const key in taskList) {
    const task = taskList[key]
    if (task.status !== 0 && task.status !== 5) {
      count += 1
      task.status = 5
      task.progress = 100
    }
  }
  dialog.showMessageBox(win, {
    type: 'info',
    title: '提示',
    message: count ? `Hiện nay có${count}Một tác vụ đang được tải xuống. Việc đóng phần mềm sẽ khiến tác vụ tải xuống không thành công. Bạn có muốn tiếp tục đóng phần mềm không? ` : 'Có nên đóng ứng dụng không',
    buttons: ['Hủy bỏ', 'Khép kín']
  })
    .then(res => {
      console.log(res)
      if (count) store.set('taskList', taskList)
      if (res.response === 1) win.destroy()
    })
    .catch(error => {
      console.log(error)
    })
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  app.quit()
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS3_DEVTOOLS)
    } catch (e: any) {
      console.error('Vue Devtools failed to install:', e.toString())
    }
  }
  // 创建渲染进程
  createWindow()
  // 初始化store
  initStore()
  // 监听win close
  win.on('close', event => {
    console.log('on win close')
    event.preventDefault()
    handleCloseApp()
  })
  // 添加快捷键
  globalShortcut.register('CommandOrControl+Shift+L', () => {
    const focusWin = BrowserWindow.getFocusedWindow()
    if (focusWin && focusWin.webContents.isDevToolsOpened()) {
      focusWin.webContents.closeDevTools()
    } else if (focusWin && !focusWin.webContents.isDevToolsOpened()) {
      focusWin.webContents.openDevTools({ mode: 'detach' })
    }
  })
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
}
