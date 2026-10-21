<!-- 登录页面 -->
<template>
  <div class="flex w-full h-screen">
    <LoginLeftView />

    <div class="relative flex-1">
      <AuthTopBar />

      <div class="auth-right-wrap">
        <div class="form">
          <h3 class="title">{{ $t('login.title') }}</h3>
          <p class="sub-title">{{ $t('login.subTitle') }}</p>
          <ElForm
            ref="formRef"
            :model="formData"
            :rules="rules"
            :key="formKey"
            @keyup.enter="handleSubmit"
            style="margin-top: 25px"
          >
            <ElFormItem prop="username">
              <ElInput
                class="custom-height"
                :placeholder="$t('login.placeholder.username')"
                v-model.trim="formData.username"
              />
            </ElFormItem>
            <ElFormItem prop="password">
              <ElInput
                class="custom-height"
                :placeholder="$t('login.placeholder.password')"
                v-model.trim="formData.password"
                type="password"
                autocomplete="off"
                show-password
              />
            </ElFormItem>

            <!-- 推拽验证 -->
            <div class="relative pb-5 mt-6">
              <div
                class="relative z-[2] overflow-hidden select-none rounded-lg border border-transparent tad-300"
                :class="{ '!border-[#FF4E4F]': !isPassing && isClickPass }"
              >
                <ArtDragVerify
                  ref="dragVerify"
                  v-model:value="isPassing"
                  :text="$t('login.sliderText')"
                  textColor="var(--art-gray-700)"
                  :successText="$t('login.sliderSuccessText')"
                  progressBarBg="var(--main-color)"
                  :background="isDark ? '#26272F' : '#F1F1F4'"
                  handlerBg="var(--default-box-color)"
                />
              </div>
              <p
                class="absolute top-0 z-[1] px-px mt-2 text-xs text-[#f56c6c] tad-300"
                :class="{ 'translate-y-10': !isPassing && isClickPass }"
              >
                {{ $t('login.placeholder.slider') }}
              </p>
            </div>

            <div class="flex-cb mt-2 text-sm">
              <ElCheckbox v-model="formData.rememberPassword">{{
                $t('login.rememberPwd')
              }}</ElCheckbox>
              <RouterLink class="text-theme" :to="{ name: 'ForgetPassword' }">{{
                $t('login.forgetPwd')
              }}</RouterLink>
            </div>

            <div style="margin-top: 30px">
              <ElButton
                class="w-full custom-height"
                type="primary"
                @click="handleSubmit"
                :loading="loading"
                v-ripple
              >
                {{ $t('login.btnText') }}
              </ElButton>
            </div>

            <div class="mt-5 text-sm text-gray-600">
              <span>{{ $t('login.noAccount') }}</span>
              <RouterLink class="text-theme" :to="{ name: 'Register' }">{{
                $t('login.register')
              }}</RouterLink>
            </div>
          </ElForm>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, computed, watch } from 'vue'
  import { storeToRefs } from 'pinia'
  import LoginLeftView from './LoginLeftView.vue'
  import AuthTopBar from './AuthTopBar.vue'
  import ArtDragVerify from '../../forms/art-drag-verify/index.vue'
  import { useSettingStore } from '@art/app-core'
  import { useI18n } from 'vue-i18n'
  import type { FormInstance, FormRules } from 'element-plus'
  import type { LoginFormData } from './types'

  defineOptions({ name: 'Login' })

  interface Props {
    /** 登录请求进行中（由业务页面控制） */
    loading?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    loading: false
  })

  const emit = defineEmits<{
    submit: [formData: LoginFormData]
  }>()

  const settingStore = useSettingStore()
  const { isDark } = storeToRefs(settingStore)
  const { t, locale } = useI18n()
  const formKey = ref(0)

  // 监听语言切换，重置表单
  watch(locale, () => {
    formKey.value++
  })

  const dragVerify = ref()
  const isPassing = ref(false)
  const isClickPass = ref(false)
  const formRef = ref<FormInstance>()

  const formData = reactive<LoginFormData>({
    username: '',
    password: '',
    rememberPassword: true
  })

  const rules = computed<FormRules>(() => ({
    username: [{ required: true, message: t('login.placeholder.username'), trigger: 'blur' }],
    password: [{ required: true, message: t('login.placeholder.password'), trigger: 'blur' }]
  }))

  // 请求结束后由父级解除 loading，同时重置拖拽验证，便于失败重试
  watch(
    () => props.loading,
    (value, oldValue) => {
      if (oldValue && !value) {
        resetDragVerify()
      }
    }
  )

  // 只做表单校验与事件抛出，不发起请求、不操作路由和用户状态
  const handleSubmit = async () => {
    if (props.loading || !formRef.value) return

    try {
      const valid = await formRef.value.validate()
      if (!valid) return

      if (!isPassing.value) {
        isClickPass.value = true
        return
      }

      emit('submit', { ...formData })
    } catch {
      // 表单校验失败时由 Element Plus 展示字段提示
    }
  }

  // 重置拖拽验证与错误提示
  const resetDragVerify = () => {
    isPassing.value = false
    isClickPass.value = false
    dragVerify.value?.reset()
  }
</script>

<style scoped>
  @reference '@styles/core/tailwind.css';

  /* 授权页右侧区域 */
  .auth-right-wrap {
    @apply absolute inset-0 w-[440px] h-[650px] py-[5px] m-auto overflow-hidden
      max-sm:px-7 max-sm:w-full
      animate-[slideInRight_0.6s_cubic-bezier(0.25,0.46,0.45,0.94)_forwards]
      max-md:animate-none;

    .form {
      @apply h-full py-[40px];
    }

    .title {
      @apply text-g-900 text-4xl font-semibold max-md:text-3xl max-sm:pt-10;
    }

    .sub-title {
      @apply mt-[10px] text-g-600 text-sm;
    }

    .custom-height {
      @apply !h-[40px];
    }
  }

  /* 滑入动画 */
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(30px);
    }

    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
</style>
