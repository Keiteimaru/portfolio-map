<template>
  <div
    :class="[
      'loader',
      `loader--${variant}`,
      `loader--${size}`
    ]"
  >
    <slot />
  </div>
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
  }
});



</script>

<style scoped lang="scss">

@use "@/assets/sass/variable";
@use "@/assets/sass/mixin";

.loader {
  display: block;
  border: solid 4px var(--color-primary);
  border-bottom-color: transparent;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: rotation 1s linear infinite;
}

 @keyframes rotation {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

</style>