<template>
  <a-modal
    v-model:visible="visible"
    :closable="true"
    :footer="null">
    <div class="user fc ac">
      <img src="../../assets/images/user.png" alt="" class="avatar">
      <div class="version mt16">
        {{ `${projectName} - v${version}` }} <ReloadOutlined @click="checkUpdate.checkUpdate()" />
      </div>
      <div class="git mt16">địa chỉ dự án：<span class="text-active" @click="openBrowser(projectUrl)">{{ projectUrl }}</span></div>
      <div class="desc mt16">Công việc cá nhân, code tệ quá, nếu có vấn đề gì xin cho biết.，<span class="text-active" @click="openBrowser(`${projectUrl}/issues`)">Xin vui lòng bấm vào đây</span></div>
    </div>
  </a-modal>
  <CheckUpdate ref="checkUpdate" />
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import CheckUpdate from '../CheckUpdate/index.vue'

const checkUpdate = ref<any>(null)
const packageInfo = require('../../../package.json')
const visible = ref<boolean>(false)
const projectName = ref<string>(packageInfo.name)
const version = ref<string>(packageInfo.version)
const projectUrl = ref<string>(packageInfo.homepage)

const toogleVisible = () => {
  visible.value = !visible.value
}
const openBrowser = (url: string):void => {
  window.electron.openBrowser(url)
}
defineExpose({
  toogleVisible
})
</script>

<style scoped lang="less">
.user{
  .avatar{
    width: 150px;
    border: 1px solid #eeeeee;
    border-radius: 50%;
  }
}
</style>
