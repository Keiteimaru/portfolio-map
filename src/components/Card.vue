<template>
  <div class="card" role="button" :aria-label="`${data.name}の詳細を表示`" @click="$emit('showArticle', data)">
    <div class="card__container">
      <div class="card__image">
        <img :src="data.image || noimage" alt="">
      </div>
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
  cursor: pointer;
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
    border-radius: 12px;
    width: 92px;
    height: 92px;
    > img{
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: all 0.3s;
    }
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
  $this: &;
  &:hover{
    #{$this}__image{
      > img{
        transform: scale(1.1);
      }
    }
  }
  @include mixin.mq(md){
    &__image{
      width: 112px;
      height: 112px;
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
