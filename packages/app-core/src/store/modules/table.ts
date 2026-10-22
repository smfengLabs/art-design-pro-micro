import { defineStore } from 'pinia'
import { ref } from 'vue'
import { TableSizeEnum } from '@art/app-utils'

export const useTableStore = defineStore(
  'tableStore',
  () => {
    const tableSize = ref(TableSizeEnum.DEFAULT)
    const isZebra = ref(false)
    const isBorder = ref(false)
    const isHeaderBackground = ref(false)

    const isFullScreen = ref(false)

    const setTableSize = (size: TableSizeEnum) => (tableSize.value = size)

    const setIsZebra = (value: boolean) => (isZebra.value = value)

    const setIsBorder = (value: boolean) => (isBorder.value = value)

    const setIsHeaderBackground = (value: boolean) => (isHeaderBackground.value = value)

    const setIsFullScreen = (value: boolean) => (isFullScreen.value = value)

    return {
      tableSize,
      isZebra,
      isBorder,
      isHeaderBackground,
      setTableSize,
      setIsZebra,
      setIsBorder,
      setIsHeaderBackground,
      isFullScreen,
      setIsFullScreen
    }
  },
  {
    persist: {
      key: 'table',
      storage: localStorage
    }
  }
)
