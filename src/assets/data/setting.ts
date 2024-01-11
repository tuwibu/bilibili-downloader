const formConfig = [
  {
    label: 'Trạng Thái Đăng Nhập',
    type: 'status',
    name: '',
    tips: 'Sau khi đăng nhập có thể tải tối đa 1080p, nếu ko chỉ tải được 480p'
  },
  {
    label: 'Đường dẫn tải xuống',
    placeholder: 'downloadPath',
    type: 'downloadPath',
    name: 'downloadPath',
    tips: 'Mặc định sẽ là folder download'
  },
  {
    label: 'Số lượng tải xuống tối đa',
    type: 'slider',
    name: 'downloadingMaxSize',
    tips: 'Số lượng tải xuống tối đa cùng lúc'
  },
  {
    label: 'Hợp nhất video và audio sau khi tải xuống',
    type: 'switch',
    name: 'isMerge',
    tips: 'File nguồn tải về là file m4s tách riêng âm thanh và video nên cần phải gộp lại.'
  },
  {
    label: 'Xóa file gốc sau khi tải xuống',
    type: 'switch',
    name: 'isDelete',
    tips: 'Xóa file m4s sau khi gộp file video và audio thành file mp4'
  },
  {
    label: 'Tạo thư mục cho từng video',
    type: 'switch',
    name: 'isFolder',
    tips: 'Sau khi bật, mỗi video sẽ được tải xuống trong một thư mục riêng biệt'
  },
  {
    label: 'Tải phụ đề xuống',
    type: 'switch',
    name: 'isSubtitle',
    tips: 'Sau khi bật lên nếu phát hiện video đang tải có phụ đề thì sẽ tải xuống.'
  },
  {
    label: 'Tải xuống rào chắn',
    type: 'switch',
    name: 'isDanmaku',
    tips: 'Khi bật, màn hình đầu dòng hiện tại của video sẽ được tải xuống.'
  },
  {
    label: 'Tải ảnh bìa xuống',
    type: 'switch',
    name: 'isCover',
    tips: 'Khi bật, ảnh bìa sẽ được tải xuống'
  }
]

const settingData = {
  downloadPath: '',
  isMerge: true,
  isDelete: true,
  isSubtitle: true,
  isDanmaku: true,
  isFolder: true,
  isCover: true,
  downloadingMaxSize: 5
}

const settingRules = {
  downloadPath: [
    {
      required: true,
      message: 'Vui lòng chọn đường dẫn tải xuống'
    }
  ],
  downloadingMaxSize: [
    {
      required: true,
      message: 'Vui lòng chọn số lượng tải xuống đồng thời tối đa'
    }
  ],
  isMerge: [
    {
      required: false
    }
  ],
  isDelete: [
    {
      required: false
    }
  ],
  isFolder: [
    {
      required: false
    }
  ],
  isSubtitle: [
    {
      required: false
    }
  ],
  isDanmaku: [
    {
      required: false
    }
  ],
  isCover: [
    {
      required: false
    }
  ]
}

const formItemLayout = { span: 24, offset: 0 }

const loginStatusText = ['Chưa đăng nhập', 'User', 'VIP']

export {
  settingData,
  formConfig,
  formItemLayout,
  settingRules,
  loginStatusText
}
