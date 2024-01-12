const qualityMap = {
  127: '8K siêu HD',
  126: 'Tầm nhìn Dolby',
  125: 'Màu sắc trung thực HDR',
  120: '4K siêu HD',
  116: '1080P60',
  112: '1080P siêu HD',
  80: '1080P',
  74: '720P60',
  64: '720P',
  32: '480P',
  16: '320P'
}

const resolution = {
  127: {
    width: 7680,
    height: 4320
  },
  126: {
    width: 4096,
    height: 2160
  },
  125: {
    width: 4096,
    height: 2160
  },
  120: {
    width: 4096,
    height: 2160
  },
  116: {
    width: 1920,
    height: 1080
  },
  112: {
    width: 1920,
    height: 1080
  },
  80: {
    width: 1920,
    height: 1080
  },
  74: {
    width: 1280,
    height: 720
  },
  64: {
    width: 1280,
    height: 720
  },
  32: {
    width: 855,
    height: 480
  },
  16: {
    width: 640,
    height: 360
  }
}

const userQuality = {
  0: [16, 32],
  1: [16, 32, 64, 80],
  2: [16, 32, 64, 74, 80, 112, 116, 120, 125, 126, 127]
}

export {
  qualityMap,
  userQuality,
  resolution
}
