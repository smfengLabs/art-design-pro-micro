<template>
  <div
    ref="dragVerify"
    class="drag_verify"
    :style="dragVerifyStyle"
    @mousemove="dragMoving"
    @mouseup="dragFinish"
    @mouseleave="dragFinish"
    @touchmove="dragMoving"
    @touchend="dragFinish"
  >
    <div
      class="dv_progress_bar"
      :class="{ goFirst2: isOk }"
      ref="progressBar"
      :style="progressBarStyle"
    >
    </div>

    <div class="dv_text" :style="textStyle" ref="messageRef">
      <slot name="textBefore" v-if="$slots.textBefore"></slot>
      {{ message }}
      <slot name="textAfter" v-if="$slots.textAfter"></slot>
    </div>

    <div
      class="dv_handler dv_handler_bg"
      :class="{ goFirst: isOk }"
      @mousedown="dragStart"
      @touchstart="dragStart"
      ref="handler"
      :style="handlerStyle"
    >
      <ArtSvgIcon :icon="value ? successIcon : handlerIcon" class="text-g-600"></ArtSvgIcon>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { reactive, toRefs, ref, computed, onMounted, nextTick, onBeforeUnmount } from 'vue'
  import ArtSvgIcon from '../../base/art-svg-icon/index.vue'
  defineOptions({ name: 'ArtDragVerify' })

  const emit = defineEmits(['handlerMove', 'update:value', 'passCallback'])

  interface PropsType {
    /** 是否通过验证 */
    value: boolean
    /** 组件宽度 */
    width?: number | string
    /** 组件高度 */
    height?: number
    /** 默认提示文本 */
    text?: string
    /** 成功提示文本 */
    successText?: string
    /** 背景色 */
    background?: string
    /** 进度条背景色 */
    progressBarBg?: string
    /** 完成状态背景色 */
    completedBg?: string
    /** 是否圆角 */
    circle?: boolean
    /** 圆角大小 */
    radius?: string
    /** 滑块图标 */
    handlerIcon?: string
    /** 成功图标 */
    successIcon?: string
    /** 滑块背景色 */
    handlerBg?: string
    /** 文本大小 */
    textSize?: string
    /** 文本颜色 */
    textColor?: string
  }

  const props = withDefaults(defineProps<PropsType>(), {
    value: false,
    width: '100%',
    height: 40,
    text: '按住滑块拖动',
    successText: 'success',
    background: '#eee',
    progressBarBg: '#1385FF',
    completedBg: '#57D187',
    circle: false,
    radius: 'calc(var(--custom-radius) / 3 + 2px)',
    handlerIcon: 'solar:double-alt-arrow-right-linear',
    successIcon: 'ri:check-fill',
    handlerBg: '#fff',
    textSize: '13px',
    textColor: '#333'
  })

  interface StateType {
    isMoving: boolean // 是否正在拖拽
    x: number // 拖拽起始位置
    isOk: boolean // 是否验证成功
  }

  const state = reactive(<StateType>{
    isMoving: false,
    x: 0,
    isOk: false
  })

  const { isOk } = toRefs(state)

  const dragVerify = ref()
  const messageRef = ref()
  const handler = ref()
  const progressBar = ref()

  // 触摸事件变量 - 用于禁止页面滑动
  let startX: number, startY: number, moveX: number, moveY: number

  const onTouchStart = (e: any) => {
    startX = e.targetTouches[0].pageX
    startY = e.targetTouches[0].pageY
  }

  const onTouchMove = (e: any) => {
    moveX = e.targetTouches[0].pageX
    moveY = e.targetTouches[0].pageY

    // 如果横向移动距离大于纵向移动距离，阻止默认行为（防止页面滑动）
    if (Math.abs(moveX - startX) > Math.abs(moveY - startY)) {
      e.preventDefault()
    }
  }

  document.addEventListener('touchstart', onTouchStart)
  document.addEventListener('touchmove', onTouchMove, { passive: false })

  const getNumericWidth = (): number => {
    if (typeof props.width === 'string') {
      return dragVerify.value?.offsetWidth || 260
    }
    return props.width
  }

  const getStyleWidth = (): string => {
    if (typeof props.width === 'string') {
      return props.width
    }
    return props.width + 'px'
  }

  onMounted(() => {
    dragVerify.value?.style.setProperty('--textColor', props.textColor)

    nextTick(() => {
      const numericWidth = getNumericWidth()
      dragVerify.value?.style.setProperty('--width', Math.floor(numericWidth / 2) + 'px')
      dragVerify.value?.style.setProperty('--pwidth', -Math.floor(numericWidth / 2) + 'px')
    })

    document.addEventListener('touchstart', onTouchStart)
    document.addEventListener('touchmove', onTouchMove, { passive: false })
  })

  onBeforeUnmount(() => {
    document.removeEventListener('touchstart', onTouchStart)
    document.removeEventListener('touchmove', onTouchMove)
  })

  const handlerStyle = {
    left: '0',
    width: props.height + 'px',
    height: props.height + 'px',
    background: props.handlerBg
  }

  const dragVerifyStyle = computed(() => ({
    width: getStyleWidth(),
    height: props.height + 'px',
    lineHeight: props.height + 'px',
    background: props.background,
    borderRadius: props.circle ? props.height / 2 + 'px' : props.radius
  }))

  const progressBarStyle = {
    background: props.progressBarBg,
    height: props.height + 'px',
    borderRadius: props.circle
      ? props.height / 2 + 'px 0 0 ' + props.height / 2 + 'px'
      : props.radius
  }

  const textStyle = computed(() => ({
    fontSize: props.textSize
  }))

  const message = computed(() => {
    return props.value ? props.successText : props.text
  })

  const dragStart = (e: any) => {
    if (!props.value) {
      state.isMoving = true
      handler.value.style.transition = 'none'
      state.x =
        (e.pageX || e.touches[0].pageX) - parseInt(handler.value.style.left.replace('px', ''), 10)
    }
    emit('handlerMove')
  }

  const dragMoving = (e: any) => {
    if (state.isMoving && !props.value) {
      const numericWidth = getNumericWidth()
      let _x = (e.pageX || e.touches[0].pageX) - state.x

      if (_x > 0 && _x <= numericWidth - props.height) {
        handler.value.style.left = _x + 'px'
        progressBar.value.style.width = _x + props.height / 2 + 'px'
      } else if (_x > numericWidth - props.height) {
        handler.value.style.left = numericWidth - props.height + 'px'
        progressBar.value.style.width = numericWidth - props.height / 2 + 'px'
        passVerify()
      }
    }
  }

  const dragFinish = (e: any) => {
    if (state.isMoving && !props.value) {
      const numericWidth = getNumericWidth()
      let _x = (e.pageX || e.changedTouches[0].pageX) - state.x

      if (_x < numericWidth - props.height) {
        state.isOk = true
        handler.value.style.left = '0'
        handler.value.style.transition = 'all 0.2s'
        progressBar.value.style.width = '0'
        state.isOk = false
      } else {
        handler.value.style.transition = 'none'
        handler.value.style.left = numericWidth - props.height + 'px'
        progressBar.value.style.width = numericWidth - props.height / 2 + 'px'
        passVerify()
      }
      state.isMoving = false
    }
  }

  const passVerify = () => {
    emit('update:value', true)
    state.isMoving = false
    progressBar.value.style.background = props.completedBg
    messageRef.value.style['-webkit-text-fill-color'] = 'unset'
    messageRef.value.style.animation = 'slidetounlock2 2s cubic-bezier(0, 0.2, 1, 1) infinite'
    messageRef.value.style.color = '#fff'
    emit('passCallback')
  }

  const reset = () => {
    handler.value.style.left = '0'
    progressBar.value.style.width = '0'
    progressBar.value.style.background = props.progressBarBg
    messageRef.value.style['-webkit-text-fill-color'] = 'transparent'
    messageRef.value.style.animation = 'slidetounlock 2s cubic-bezier(0, 0.2, 1, 1) infinite'
    messageRef.value.style.color = props.background
    emit('update:value', false)
    state.isOk = false
    state.isMoving = false
    state.x = 0
  }

  defineExpose({
    reset
  })
</script>

<style lang="scss" scoped>
  .drag_verify {
    position: relative;
    box-sizing: border-box;
    overflow: hidden;
    text-align: center;
    border: 1px solid var(--default-border-dashed);

    .dv_handler {
      position: absolute;
      top: 0;
      left: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: move;

      i {
        padding-left: 0;
        font-size: 14px;
        color: #999;
      }

      .el-icon-circle-check {
        margin-top: 9px;
        color: #6c6;
      }
    }

    .dv_progress_bar {
      position: absolute;
      width: 0;
      height: 34px;
    }

    .dv_text {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: transparent;
      user-select: none;
      background: linear-gradient(
        to right,
        var(--textColor) 0%,
        var(--textColor) 40%,
        #fff 50%,
        var(--textColor) 60%,
        var(--textColor) 100%
      );
      -webkit-background-clip: text;
      background-clip: text;
      animation: slidetounlock 2s cubic-bezier(0, 0.2, 1, 1) infinite;
      -webkit-text-fill-color: transparent;
      text-size-adjust: none;

      * {
        -webkit-text-fill-color: var(--textColor);
      }
    }
  }

  .goFirst {
    left: 0 !important;
    transition: left 0.5s;
  }

  .goFirst2 {
    width: 0 !important;
    transition: width 0.5s;
  }
</style>

<style lang="scss">
  @keyframes slidetounlock {
    0% {
      background-position: var(--pwidth) 0;
    }

    100% {
      background-position: var(--width) 0;
    }
  }

  @keyframes slidetounlock2 {
    0% {
      background-position: var(--pwidth) 0;
    }

    100% {
      background-position: var(--pwidth) 0;
    }
  }
</style>
