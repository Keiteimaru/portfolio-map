<template>
  <div class="dialog">
    <div class="dialog__container" role="dialog" aria-modal="true">
      <p class="dialog__title">ただいま、情報を準備中です</p>
      <p class="dialog__text">川西市の歴史、隠れた魅力、アクセス方法など、役立つ情報をまもなく公開します。ご期待ください！</p>
      <div class="dialog__navigation">
        <ButtonComponents size="sm" @click="$emit('close')">とじる</ButtonComponents>
      </div>
    </div>
    <div class="dialog__overlay" @click="$emit('close')"></div>
  </div>
</template>

<script setup>

import ButtonComponents from '@/components/Button.vue';

const emit = defineEmits([
  'close'
])

</script>

<style lang="scss" scoped>

.dialog{
  z-index: 1000;
  position: fixed;
  inset: 0;
  &__overlay{
    z-index: 1;
    position: absolute;
    inset: 0;
    background-color: rgba(0 0 0 / 50%);
  }
  &__container{
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 2;
    position: absolute;
    inset: 0;
    margin: auto;
    padding: 16px;
    border-radius: 20px;
    width: min(400px, calc(100dvw - 40px));
    height: max-content;
    background-color: var(--color-surface);
  }
  &__title{
    text-align: center;
    font-size: 16px;
    font-weight: 700;
  }
  &__text{
    margin: 16px 0 0;
    text-align: center;
    font-size: 14px;
    color: var(--color-on-surface-variant);
  }
  &__navigation{
    margin: 16px 0 0;
    > *{
      min-width: 100px;
    }
  }
}
</style>
