<template>
  <div class="card" @click="$emit('showArticle', data)">
    <div class="card__container">
      <img class="card__image" :src="data.image || noimage" alt="">
    </div>
    <div class="card__container2">
      <p class="card__title">{{ data.name }}</p>
      <p class="card__label">{{ data.label }}</p>
      <p class="card__station">{{ data.nearest_station }}・{{ data.distance_from_station }}</p>
    </div>
  </div>
</template>

<script setup>

import noimage from '@/assets/images/dummy.jpg';

const props = defineProps({
  data: Object
});

const emits = defineEmits([
  'showArticle'
]);

</script>

<style scoped lang="scss">

@use "@/assets/sass/variable";
@use "@/assets/sass/mixin";

.card{
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0 8px;
  &__container{
    position: relative;
  }
  &__container2{
    display: flex;
    flex-direction: column;
    gap: 2px 0;
    position: relative;
  }
  &__image{
    overflow: hidden;
    border: solid 1px var(--color-surface-container-low);
    border-radius: 12px;
    aspect-ratio: 1 / 1;
    width: 92px;
    object-fit: cover;
  }
  &__title{
    font-size: 14px;
    font-weight: 700;
    @include mixin.line-clamp(2);
  }
  &__label,
  &__station{
    font-size: 12px;
    color: var(--color-on-surface-variant);
    @include mixin.line-clamp(1);
    > span{
      font-size: 1em;
    }
  }
  @include mixin.mq(md){
    &__image{
      width: 112px;
    }
    &__title{
      font-size: 16px;
    }
    &__label,
    &__station{
      font-size: 13px;
    }
  }
}

</style>
