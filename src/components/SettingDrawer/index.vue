<template>
  <a-drawer
    class="custom-drawer-scroll-bar"
    :visible="visible"
    :closable="false"
    :maskClosable="true"
    title="Cài đặt"
    :width="320"
    @close="hide"
  >
    <a-form>
      <a-form-item
        v-for="(item, index) in formConfig"
        :key="index"
        :labelCol="formItemLayout"
        :wrapperCol="formItemLayout"
        v-bind="validateInfos[item.name]">
        <template #label>
          {{ item.label }}
          <a-tooltip>
            <template #title>
              {{ item.tips }}
            </template>
            <InfoCircleOutlined style="font-size: 12px;display: inline-block;margin-left: 4px;" />
          </a-tooltip>
        </template>
        <template v-if="item.type === 'status'">
          <span :class="['dot', loginStatus === 0 ? 'offline' : 'online']"></span>
          {{ loginStatusText[loginStatus] }}
          <LoginOutlined v-if="loginStatus === 0" @click="loginModal.open()" />
          <a-popconfirm
            v-else
            title="Bạn có chắc chắn bạn muốn thoát?"
            ok-text="CÓ"
            cancel-text="KHÔNG"
            @confirm="quitLogin"
          >
            <LogoutOutlined />
          </a-popconfirm>
        </template>
        <a-input
          v-if="item.type === 'downloadPath'"
          :placeholder="item.placeholder"
          readonly
          class="custom-input"
          v-model:value="modelRef[item.name]"
          @click="openDirDialog">
          <template #suffix>
            <FolderOutlined style="color: rgba(0,0,0,.45)" />
          </template>
        </a-input>
        <a-input
          v-if="item.type === 'file'"
          :placeholder="item.placeholder"
          readonly
          class="custom-input"
          v-model:value="modelRef[item.name]"
          @click="openDirDialogFile">
          <template #suffix>
            <FolderOutlined style="color: rgba(0,0,0,.45)" />
          </template>
        </a-input>
        <a-input
          v-if="item.type === 'input'"
          :placeholder="item.placeholder"
          v-model:value="modelRef[item.name]"
        />
        <a-slider v-if="item.type === 'slider'" :max="5" :min="1" v-model:value="modelRef[item.name]" />
        <a-switch v-if="item.type === 'switch'" v-model:checked="modelRef[item.name]" />
      </a-form-item>
    </a-form>
  </a-drawer>
  <LoginModal ref="loginModal" />
</template>

<script lang="ts" setup>
import { ref, reactive, toRaw } from 'vue'
import { formConfig, formItemLayout, settingData, settingRules, loginStatusText } from '../../assets/data/setting'
import { Form } from 'ant-design-vue'
import { FolderOutlined, LoginOutlined, LogoutOutlined, InfoCircleOutlined } from '@ant-design/icons-vue'
import { store } from '../../store'
import { storeToRefs } from 'pinia'
import LoginModal from '../LoginModal/index.vue'

const { loginStatus } = storeToRefs(store.baseStore())
const { downloadPath, isDanmaku, isDelete, isFolder, isMerge, isSubtitle, downloadingMaxSize, cookie } = storeToRefs(store.settingStore())

const loginModal = ref<any>(null)
const visible = ref<boolean>(false)
const useForm = Form.useForm
const modelRef = reactive(settingData)
const rulesRef = reactive(settingRules)
const { validate, validateInfos } = useForm(modelRef, rulesRef)

const open = () => {
  modelRef.downloadPath = downloadPath.value
  modelRef.isMerge = isMerge.value
  modelRef.isDelete = isDelete.value
  modelRef.isSubtitle = isSubtitle.value
  modelRef.isDanmaku = isDanmaku.value
  modelRef.isFolder = isFolder.value
  modelRef.downloadingMaxSize = downloadingMaxSize.value
  modelRef.cookie = cookie.value
  toogleVisible()
}

const getModelRef = () => {
  return modelRef.cookie
}

const toogleVisible = () => {
  visible.value = !visible.value
}

const hide = () => {
  validate()
    .then(() => {
      store.settingStore().setSetting(toRaw(modelRef))
      store.settingStore().setCookie(modelRef.cookie)
      toogleVisible()
    })
    .catch(err => {
      console.log('error', err)
    })
}

const openDirDialogFile = () => {
  window.electron.openDirDialogFile()
    .then((res: string) => {
      console.log(res)
      modelRef.cookie = res
      store.settingStore().setDownloadPath(res)
    })
}

const openDirDialog = () => {
  window.electron.openDirDialog()
    .then((res: string) => {
      console.log(res)
      modelRef.downloadPath = res
      store.settingStore().setDownloadPath(res)
    })
}

const quitLogin = () => {
  store.baseStore().setLoginStatus(0)
  store.settingStore().setSESSDATA('')
}

defineExpose({
  open,
  getModelRef
})
</script>

<style scoped lang="less">
.custom-input{
  cursor: pointer;
  :deep(.ant-input){
    cursor: pointer;
  }
}
</style>
