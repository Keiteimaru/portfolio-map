<template>
  <button
    :class="[
      'button',
      `button--${variant}`,
      `button--${size}`,
      { disabled }
    ]"
    :disabled="disabled"
    @click="$emit('onClick')"
  >
    <slot />
  </button>
</template>

<script setup>

const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
  },
  size: {
    type: String,
    default: 'md',
  },
  disabled: {
    type: Boolean,
    default: false,
  }
});

const emits = defineEmits([
  'onClick'
]);


</script>

<style scoped lang="scss">

@use "@/assets/sass/variable";
@use "@/assets/sass/mixin";

.button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 1.2em;
  border-radius: 20px;
  height: 36px;
  background-color: var(--color-surface-container-high);
  line-height: 1.3;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-on-surface);
  transition: opacity .2s;
  &:hover{
    opacity: .8;
  }
  &:disabled{
    opacity: .5;
    background-color: var(--color-surface-container-highest);
    color: var(--color-on-surface-variant);
    pointer-events: none;
  }
  &--primary{
    background-color: var(--color-primary);
    color: var(--color-on-primary);
  }
  &--secondary{
    background-color: var(--color-secondary);
    color: var(--color-on-secondary);
  }
  &--sm{
    border-radius: 18px;
    height: 36px;
    font-size: 13px;
  }
  &--md{
    border-radius: 20px;
    height: 40px;
    font-size: 14px;
  }
  &--lg{
    border-radius: 24px;
    height: 48px;
    font-size: 16px;
  }
  @include mixin.mq(lg) {
    border-radius: 24px;
    height: 48px;
    font-size: 16px;
    &--sm{
      border-radius: 20px;
      height: 40px;
      font-size: 14px;
    }
    &--md{
      border-radius: 24px;
      height: 48px;
      font-size: 16px;
    }
    &--lg{
      border-radius: 28px;
      height: 56px;
      font-size: 17px;
    }
  }
}

</style>