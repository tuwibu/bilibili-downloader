import UA from '../assets/data/ua'
import { formatSeconed, filterTitle, sleep } from '../utils'
import { qualityMap } from '../assets/data/quality'
import { customAlphabet } from 'nanoid'
import alphabet from '../assets/data/alphabet'
import { VideoData, Page, DownloadUrl, Subtitle, TaskData, Audio } from '../type'
import { store, pinia } from '../store'
import axios from 'axios'
import puppeteer from 'puppeteer'
import { message } from 'ant-design-vue'

// 自定义uuid
const nanoid = customAlphabet(alphabet, 16)

/**
 * @params videoInfo: 当前下载的视频详情 selected：所选的分p quality：所选的清晰度
 * @returns 返回下载数据 Array
 */
const getDownloadList = async (videoInfo: VideoData, selected: number[], quality: number) => {
  const downloadList: VideoData[] = []
  for (let index = 0; index < selected.length; index++) {
    const currentPage = selected[index]
    const currentPageData = videoInfo.page.find(item => item.page === currentPage)
    if (!currentPageData) throw new Error('Gặp lỗi địa chỉ tải xuống video')
    const currentCid = currentPageData.cid
    const currentBvid = currentPageData.bvid
    const downloadUrl: DownloadUrl = { video: '', audio: '' }
    const videoUrl = videoInfo.video.find(item => item.id === quality && item.cid === currentCid)
    const audioUrl = getHighQualityAudio(videoInfo.audio)
    if (videoUrl && audioUrl) {
      downloadUrl.video = videoUrl.url
      downloadUrl.audio = audioUrl.url
    } else {
      const { video, audio } = await getDownloadUrl(currentCid, currentBvid, quality)
      downloadUrl.video = video
      downloadUrl.audio = audio
    }
    const subtitle = await getSubtitle(currentCid, currentBvid)
    const taskId = nanoid()
    const videoData: VideoData = {
      ...videoInfo,
      id: taskId,
      title: currentPageData.title,
      url: currentPageData.url,
      quality: quality,
      duration: currentPageData.duration,
      createdTime: +new Date(),
      cid: currentCid,
      bvid: currentBvid,
      downloadUrl,
      filePathList: handleFilePathList(selected.length === 1 ? 0 : currentPage, currentPageData.title, videoInfo.up[0].name, currentBvid, taskId),
      fileDir: handleFileDir(selected.length === 1 ? 0 : currentPage, currentPageData.title, videoInfo.up[0].name, currentBvid, taskId),
      subtitle
    }
    downloadList.push(videoData)
    if (index !== selected.length - 1) {
      await sleep(1000)
    }
  }
  return downloadList
}

const getDownloadChannel = async (
  videoInfo: VideoData[],
  selecteds: {
    url: string,
    num: number
  }[],
  quality: number
) => {
  const downloadList: VideoData[] = []
  for (let index = 0; index < videoInfo.length; index++) {
    const video = videoInfo[index]
    const selected = selecteds[index]
    const currentPageData = video.page.find(item => item.page === selected.num)
    if (!currentPageData) throw new Error('lỗi khi lấy đường dẫn tải xuống video')
    const currentCid = currentPageData.cid
    const currentBvid = currentPageData.bvid
    const downloadUrl: DownloadUrl = { video: '', audio: '' }
    const videoUrl = video.video.find(item => item.id === quality && item.cid === currentCid)
    const audioUrl = getHighQualityAudio(video.audio)
    if (videoUrl && audioUrl) {
      downloadUrl.video = videoUrl.url
      downloadUrl.audio = audioUrl.url
    } else {
      const { video, audio } = await getDownloadUrl(currentCid, currentBvid, quality)
      downloadUrl.video = video
      downloadUrl.audio = audio
    }
    const subtitle = await getSubtitle(currentCid, currentBvid)
    const taskId = nanoid()
    const videoData: VideoData = {
      ...video,
      id: taskId,
      title: currentPageData.title,
      url: currentPageData.url,
      quality: quality,
      duration: currentPageData.duration,
      createdTime: +new Date(),
      cid: currentCid,
      bvid: currentBvid,
      downloadUrl,
      filePathList: handleFilePathList(selected.num === 1 ? 0 : selected.num, currentPageData.title, video.up[0].name, currentBvid, taskId),
      fileDir: handleFileDir(selected.num === 1 ? 0 : selected.num, currentPageData.title, video.up[0].name, currentBvid, taskId),
      subtitle
    }
    downloadList.push(videoData)
    if (index !== videoInfo.length - 1) {
      await sleep(1000)
    }
  }
  return downloadList
}

const addDownload = (videoList: VideoData[] | TaskData[]) => {
  console.log('addDownload')
  const allowDownloadCount = store.settingStore(pinia).downloadingMaxSize - store.baseStore(pinia).downloadingTaskCount
  const taskList: TaskData[] = []
  if (allowDownloadCount >= 0) {
    videoList.forEach((item, index) => {
      if (index < allowDownloadCount) {
        taskList.push({
          ...item,
          status: 1,
          progress: 0
        })
      } else {
        taskList.push({
          ...item,
          status: 4,
          progress: 0
        })
      }
    })
  }
  return taskList
}

/**
 *
 * @returns 保存cookie中的bfe_id
 */
const saveResponseCookies = (cookies: string[]) => {
  if (cookies && cookies.length) {
    const cookiesString = cookies.join(';')
    console.log('bfe: ', cookiesString)
    store.settingStore(pinia).setBfeId(cookiesString)
  }
}

/**
 *
 * @returns 0: 游客，未登录 1：普通用户 2：大会员
 */
const checkLogin = async (SESSDATA: string) => {
  const { body } = await window.electron.got('https://api.bilibili.com/x/web-interface/nav', {
    headers: {
      'User-Agent': `${UA}`,
      cookie: `SESSDATA=${SESSDATA}`
    },
    responseType: 'json'
  })
  if (body.data.isLogin && !body.data.vipStatus) {
    return 1
  } else if (body.data.isLogin && body.data.vipStatus) {
    return 2
  } else {
    return 0
  }
}

// 检查url合法
const checkUrl = (url: string, type: string, data?: {
  videoUrl: string,
}[]) => {
  if (type === 'video') {
    const mapUrl = {
      'video/av': 'BV',
      'video/BV': 'BV',
      'play/ss': 'ss',
      'play/ep': 'ep'
    }
    let flag = false
    for (const key in mapUrl) {
      if (url.includes(key)) {
        flag = true
        return mapUrl[key]
      }
    }
    if (!flag) {
      return ''
    }
  } else if (type === 'channel' && data) {
    const mapUrl = {
      'video/av': 'BV',
      'video/BV': 'BV',
      'play/ss': 'ss',
      'play/ep': 'ep'
    }
    // eslint-disable-next-line prefer-const
    let newData: { url: string; type: any }[] = []
    for (let index = 0; index < data.length; index++) {
      const element = data[index]
      for (const key in mapUrl) {
        if (element.videoUrl.includes(key)) {
          newData.push({
            url: element.videoUrl,
            type: element.videoUrl.includes(key) ? mapUrl[key] : null
          })
        }
      }
    }
    // filter type === null
    return newData.filter(item => item.type !== null)
  }
}

// 检查url是否有重定向
const checkUrlRedirect = async (videoUrl: string, type: string, data?: {
  url: string,
  type: string
}[]) => {
  if (type === 'video') {
    const params = {
      videoUrl,
      config: {
        headers: {
          'User-Agent': `${UA}`,
          cookie: `SESSDATA=${store.settingStore(pinia).SESSDATA}`
        }
      }
    }
    const { body, redirectUrls } = await window.electron.got(params.videoUrl, params.config)
    const url = redirectUrls[0] ? redirectUrls[0] : videoUrl
    return {
      body,
      url
    }
  } else if (type === 'channel' && data) {
    const newData: { body: any; url: string; type: string }[] = []
    for (let index = 0; index < data.length; index++) {
      const element = data[index]
      message.info(`Đang lấy dữ liệu${index + 1}/${data.length}`)
      const params = {
        videoUrl: element.url,
        config: {
          headers: {
            'User-Agent': `${UA}`,
            cookie: `SESSDATA=${store.settingStore(pinia).SESSDATA}`
          }
        }
      }
      const { body, redirectUrls } = await window.electron.got(params.videoUrl, params.config)
      const url = redirectUrls[0] ? redirectUrls[0] : element.url
      newData.push({
        body,
        url,
        type: element.type
      })
    }
    return newData
  }
}

const parseHtml = async (html: string, videoType: string, url: string, type: string, data?: any) => {
  if (type === 'video') {
    switch (videoType) {
      case 'BV':
        return parseBV(html, url, type)
      case 'ss':
        return parseSS(html, type)
      case 'ep':
        return parseEP(html, url, type)
      default:
        return -1
    }
  } else if (type === 'channel' && data) {
    const infos: VideoData[] = []
    for (let index = 0; index < data.length; index++) {
      const element = data[index]
      switch (element.type) {
        case 'BV':
          // eslint-disable-next-line no-case-declarations
          const info = await parseBV(element.body, element.url, type)
          info && infos.push(info)
          break
        case 'ss':
          // eslint-disable-next-line no-case-declarations
          const ssInfo = await parseSS(element.body, type)
          ssInfo && infos.push(ssInfo)
          break
        case 'ep':
          // eslint-disable-next-line no-case-declarations
          const epInfo = await parseEP(element.body, element.url, type)
          epInfo && infos.push(epInfo)
          break
        default:
          break
      }
    }
    return infos
  }
}

const convertToSeconds = (time: string) => {
  // 00:03:59
  const timeArray = time.split(':')
  const hour = +timeArray[0]
  const minute = +timeArray[1]
  const second = +timeArray[2]
  return hour * 3600 + minute * 60 + second
}

const parseBV = async (html: string, url: string, type: string) => {
  try {
    const videoInfo = html.match(/\<\/script\>\<script\>window\.\_\_INITIAL\_STATE\_\_\=([\s\S]*?)\;\(function\(\)/)
    if (!videoInfo) throw new Error('parse bv error')
    const { videoData } = JSON.parse(videoInfo[1])
    let acceptQuality = null
    try {
      let downLoadData: any = html.match(/\<script\>window\.\_\_playinfo\_\_\=([\s\S]*?)\<\/script\>\<script\>window\.\_\_INITIAL\_STATE\_\_\=/)
      if (!downLoadData) throw new Error('parse bv error')
      downLoadData = JSON.parse(downLoadData[1])
      acceptQuality = {
        accept_quality: downLoadData.data.accept_quality,
        video: downLoadData.data.dash.video,
        audio: downLoadData.data.dash.audio
      }
    } catch (error) {
      acceptQuality = await getAcceptQuality(videoData.cid, videoData.bvid)
    }
    const obj: VideoData = {
      id: '',
      title: videoData.title,
      url,
      bvid: videoData.bvid,
      cid: videoData.cid,
      cover: videoData.pic,
      createdTime: -1,
      quality: -1,
      view: videoData.stat.view,
      danmaku: videoData.stat.danmaku,
      reply: videoData.stat.reply,
      duration: formatSeconed(videoData.duration),
      up: videoData.hasOwnProperty('staff') ? videoData.staff.map((item: any) => ({ name: item.name, mid: item.mid })) : [{ name: videoData.owner.name, mid: videoData.owner.mid }],
      qualityOptions: acceptQuality.accept_quality.map((item: any) => ({ label: qualityMap[item], value: item })),
      page: parseBVPageData(videoData, url),
      subtitle: [],
      video: acceptQuality.video ? acceptQuality.video.map((item: any) => ({ id: item.id, cid: videoData.cid, url: item.baseUrl })) : [],
      audio: acceptQuality.audio ? acceptQuality.audio.map((item: any) => ({ id: item.id, cid: videoData.cid, url: item.baseUrl })) : [],
      filePathList: [],
      fileDir: '',
      size: -1,
      downloadUrl: { video: '', audio: '' }
    }
    if (type === 'channel' && convertToSeconds(obj.duration) < 2700) {
      return null
    } else {
      console.log('bv')
      console.log(obj)
      return obj
    }
  } catch (error: any) {
    throw new Error(error)
  }
}

const parseEP = async (html: string, url: string, type: string) => {
  try {
    const videoInfo = html.match(/\<script\>window\.\_\_INITIAL\_STATE\_\_\=([\s\S]*?)\;\(function\(\)\{var s\;/)
    if (!videoInfo) throw new Error('parse ep error')
    const { h1Title, mediaInfo, epInfo, epList } = JSON.parse(videoInfo[1])
    // 获取视频下载地址
    let acceptQuality = null
    try {
      let downLoadData: any = html.match(/\<script\>window\.\_\_playinfo\_\_\=([\s\S]*?)\<\/script\>\<script\>window\.\_\_INITIAL\_STATE\_\_\=/)
      if (!downLoadData) throw new Error('parse ep error')
      downLoadData = JSON.parse(downLoadData[1])
      acceptQuality = {
        accept_quality: downLoadData.data.accept_quality,
        video: downLoadData.data.dash.video,
        audio: downLoadData.data.dash.audio
      }
    } catch (error) {
      acceptQuality = await getAcceptQuality(epInfo.cid, epInfo.bvid)
    }
    const obj: VideoData = {
      id: '',
      title: h1Title,
      url,
      bvid: epInfo.bvid,
      cid: epInfo.cid,
      cover: `http:${mediaInfo.cover}`,
      createdTime: -1,
      quality: -1,
      view: mediaInfo.stat.views,
      danmaku: mediaInfo.stat.danmakus,
      reply: mediaInfo.stat.reply,
      duration: formatSeconed(epInfo.duration / 1000),
      up: [{ name: mediaInfo.upInfo.name, mid: mediaInfo.upInfo.mid }],
      qualityOptions: acceptQuality.accept_quality.map((item: any) => ({ label: qualityMap[item], value: item })),
      page: parseEPPageData(epList),
      subtitle: [],
      video: acceptQuality.video ? acceptQuality.video.map((item: any) => ({ id: item.id, cid: epInfo.cid, url: item.baseUrl })) : [],
      audio: acceptQuality.audio ? acceptQuality.audio.map((item: any) => ({ id: item.id, cid: epInfo.cid, url: item.baseUrl })) : [],
      filePathList: [],
      fileDir: '',
      size: -1,
      downloadUrl: { video: '', audio: '' }
    }
    if (type === 'channel' && convertToSeconds(obj.duration) < 2700) {
      return null
    } else {
      console.log('ep')
      console.log(obj)
      return obj
    }
  } catch (error: any) {
    throw new Error(error)
  }
}

const parseSS = async (html: string, type: string) => {
  try {
    const videoInfo = html.match(/\<script\>window\.\_\_INITIAL\_STATE\_\_\=([\s\S]*?)\;\(function\(\)\{var s\;/)
    if (!videoInfo) throw new Error('parse ss error')
    const { mediaInfo } = JSON.parse(videoInfo[1])
    const params = {
      url: `https://www.bilibili.com/bangumi/play/ep${mediaInfo.newestEp.id}`,
      config: {
        headers: {
          'User-Agent': `${UA}`,
          cookie: `SESSDATA=${store.settingStore(pinia).SESSDATA}`
        }
      }
    }
    const { body } = await window.electron.got(params.url, params.config)
    return parseEP(body, params.url, type)
  } catch (error: any) {
    throw new Error(error)
  }
}

// 获取视频清晰度列表
const getAcceptQuality = async (cid: string, bvid: string) => {
  const SESSDATA = store.settingStore(pinia).SESSDATA
  const bfeId = store.settingStore(pinia).bfeId
  const config = {
    headers: {
      'User-Agent': `${UA}`,
      cookie: `SESSDATA=${SESSDATA};bfe_id=${bfeId}`
    },
    responseType: 'json'
  }
  const { body: { data: { accept_quality, dash: { video, audio } } }, headers: { 'set-cookie': responseCookies } } = await window.electron.got(
    `https://api.bilibili.com/x/player/playurl?cid=${cid}&bvid=${bvid}&qn=127&type=&otype=json&fourk=1&fnver=0&fnval=80&session=68191c1dc3c75042c6f35fba895d65b0`,
    config
  )
  // 保存返回的cookies
  saveResponseCookies(responseCookies)
  return {
    accept_quality,
    video,
    audio
  }
}

// 获取指定清晰度视频下载地址
const getDownloadUrl = async (cid: number, bvid: string, quality: number) => {
  const SESSDATA = store.settingStore(pinia).SESSDATA
  const bfeId = store.settingStore(pinia).bfeId
  const config = {
    headers: {
      'User-Agent': `${UA}`,
      // bfe_id必须要加
      cookie: `SESSDATA=${SESSDATA};bfe_id=${bfeId}`
    },
    responseType: 'json'
  }
  const { body: { data: { dash } }, headers: { 'set-cookie': responseCookies } } = await window.electron.got(
    `https://api.bilibili.com/x/player/playurl?cid=${cid}&bvid=${bvid}&qn=${quality}&type=&otype=json&fourk=1&fnver=0&fnval=80&session=68191c1dc3c75042c6f35fba895d65b0`,
    config
  )
  // 保存返回的cookies
  saveResponseCookies(responseCookies)
  return {
    video: dash.video.find((item: any) => item.id === quality) ? dash.video.find((item: any) => item.id === quality).baseUrl : dash.video[0].baseUrl,
    audio: getHighQualityAudio(dash.audio).baseUrl
  }
}

// 获取视频字幕
const getSubtitle = async (cid: number, bvid: string) => {
  const SESSDATA = store.settingStore(pinia).SESSDATA
  const bfeId = store.settingStore(pinia).bfeId
  const config = {
    headers: {
      'User-Agent': `${UA}`,
      cookie: `SESSDATA=${SESSDATA};bfe_id=${bfeId}`
    },
    responseType: 'json'
  }
  const { body: { data: { subtitle } } } = await window.electron.got(`https://api.bilibili.com/x/player/v2?cid=${cid}&bvid=${bvid}`, config)
  const subtitleList: Subtitle[] = subtitle.subtitles ? subtitle.subtitles.map((item: any) => ({ title: item.lan_doc, url: item.subtitle_url })) : []
  return subtitleList
}

// 处理filePathList
const handleFilePathList = (page: number, title: string, up: string, bvid: string, id: string): string[] => {
  const downloadPath = store.settingStore().downloadPath
  // const name = `${!page ? '' : `[P${page}]`}${filterTitle(`${title}-${up}-${bvid}-${id}`)}`
  const isFolder = store.settingStore().isFolder
  const name = `${id}-${Date.now()}`
  return [
    `${downloadPath}/${isFolder ? `${name}/` : ''}video.mp4`,
    `${downloadPath}/${isFolder ? `${name}/` : ''}image.png`,
    `${downloadPath}/${isFolder ? `${name}/` : ''}m4s-video.m4s`,
    `${downloadPath}/${isFolder ? `${name}/` : ''}audio.m4s`,
    // txt
    `${downloadPath}/${isFolder ? `${name}/` : ''}name.txt`,
    isFolder ? `${downloadPath}/${name}/` : ''
  ]
}

// 处理fileDir
const handleFileDir = (page: number, title: string, up: string, bvid: string, id: string): string => {
  const downloadPath = store.settingStore().downloadPath
  // const name = `${!page ? '' : `[P${page}]`}${filterTitle(`${title}-${up}-${bvid}-${id}`)}`
  const name = `${id}-${Date.now()}`
  const isFolder = store.settingStore().isFolder
  return `${downloadPath}${isFolder ? `/${name}/` : ''}`
}

// 处理bv多p逻辑
const parseBVPageData = ({ bvid, title, pages }: { bvid: string, title: string, pages: any[] }, url: string): Page[] => {
  const len = pages.length
  if (len === 1) {
    return [
      {
        title,
        url,
        page: pages[0].page,
        duration: formatSeconed(pages[0].duration),
        cid: pages[0].cid,
        bvid: bvid
      }
    ]
  } else {
    return pages.map(item => ({
      title: item.part,
      page: item.page,
      duration: formatSeconed(item.duration),
      cid: item.cid,
      bvid: bvid,
      url: `${url}?p=${item.page}`
    }))
  }
}

// 处理ep多p逻辑
const parseEPPageData = (epList: any[]): Page[] => {
  return epList.map((item, index) => ({
    title: item.share_copy,
    page: index + 1,
    duration: formatSeconed(item.duration / 1000),
    cid: item.cid,
    bvid: item.bvid,
    url: item.share_url
  }))
}

// 获取码率最高的audio
const getHighQualityAudio = (audioArray: any[]) => {
  return audioArray.sort((a, b) => b.id - a.id)[0]
}

export {
  checkLogin,
  checkUrl,
  checkUrlRedirect,
  parseHtml,
  getDownloadList,
  addDownload,
  getDownloadChannel
}
