<template>
  <a-modal
    wrapClassName="custom-modal-padding"
    :visible="visible"
    :confirmLoading="confirmLoading"
    :okButtonProps="{ disabled: !(quality !== -1) }"
    :closable="false"
    :maskClosable="false"
    title="Thông tin video hiện tại"
    okText="Tải xuống"
    cancelText="Hủy bỏ"
    @cancel="cancel"
    @ok="handleDownload">
    <div class="video-modal custom-scroll-bar">
      <div class="video-info fr">
        <div class="image">
          <a-image :src="infoChannel.avatar" />
        </div>
        <div class="content fc jsa pl16">
          <div class="text-active ellipsis-2" @click="openBrowser(infoChannel.url)">tên Channel:{{ infoChannel.name }}</div>
          <div class="text-active ellipsis-2" @click="openBrowser(infoChannel.url)">số lượng Video: {{ infoChannel.count }}</div>
        </div>
      </div>
      <div class="mt16">
        Chọn sự rõ ràng：
        <div class="mt8">
          <a-radio-group v-model:value="quality">
            <a-radio class="custom-radio" v-for="(item, index) in qualityDefault" :key="index" :value="item.value">
              {{ item.label }}
            </a-radio>
          </a-radio-group>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script lang="ts" setup>
import { ref, toRaw } from 'vue'
import { useRouter } from 'vue-router'
import { store } from '../../store'
import { getDownloadList, addDownload, getDownloadChannel } from '../../core/bilibili'
import { userQuality } from '../../assets/data/quality'
import { VideoData } from '../../type'
import { videoData } from '../../assets/data/default'
import { sleep } from '../../utils'
import { message } from 'ant-design-vue'

const visible = ref<boolean>(false)
const confirmLoading = ref<boolean>(false)
const quality = ref<number>(-1)
const videoInfo = ref<VideoData[]>([videoData])
const selecteds = ref<{
  url: string,
  num: number
}[]>([])
const allSelected = ref<boolean>(false)
const router = useRouter()
const infoChannel = ref<any>(null)
const qualityDefault = ref<any>([
  { label: '1080P siêu HD', value: 112 },
  { label: '1080P', value: 80 },
  { label: '720P', value: 64 },
  { label: '480P', value: 32 },
  { label: '320P', value: 16 }
])

const cancel = () => {
  visible.value = false
  confirmLoading.value = false
  quality.value = -1
  selecteds.value = []
}

const handleDownload = async () => {
  confirmLoading.value = true
  const lists = await getDownloadChannel(toRaw(videoInfo.value), toRaw(selecteds.value), quality.value)
  const taskList = addDownload(lists)
  store.taskStore().setTask(taskList)
  let count = 0
  let selectedTask = ''
  for (const key in taskList) {
    const task = taskList[key]
    message.open({
      key: task.id,
      content: `Đang tải xuống: ${task.title}`,
      icon: null
    })
    if (task.status === 1) {
      window.electron.downloadVideo(task)
      count += 1
      if (!selectedTask) selectedTask = task.id
    }
    await sleep(300)
  }
  store.baseStore().addDownloadingTaskCount(count)
  confirmLoading.value = false
  visible.value = false
  store.taskStore().setRightTaskId(selectedTask)
  router.push({ name: 'download' })
}

const open = (data: VideoData[], info: any) => {
  const quality = userQuality[store.baseStore().loginStatus]
  videoInfo.value = data
  infoChannel.value = info
  visible.value = true
  for (let index = 0; index < data.length; index++) {
    const element = data[index]
    selecteds.value.push({
      url: element.url,
      num: element.page[0].page
    })
  }
}

const openBrowser = (url: string) => {
  window.electron.openBrowser(url)
}

defineExpose({
  open
})

</script>

<style scoped lang="less">
.video-modal{
  height: 260px;
  overflow-y: overlay;
  .video-info{
    height: 71.25px;
    .image{
      flex: none;
      width: 114px;
      overflow: hidden;
      position: relative;
      img{
        display: block;
        width: 100%;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      }
    }
    .content{
      box-sizing: border-box;
      flex: none;
      width: 358px;
    }
  }
  .video-item{
    display: flex;
    justify-content: center;
    align-items: center;
    box-sizing: border-box;
    width: 100px;
    height: 50px;
    border: 1px solid #eeeeee;
    background: #ffffff;
    margin: 0px 18px 18px 0px;
    padding: 8px;
    cursor: pointer;
    overflow: hidden;
    user-select: none;
    &.active{
      color: #ffffff;
      background: @primary-color;
      border: 1px solid @primary-color;
    }
  }
}
.custom-radio{
  width: 130px;
}
</style>
