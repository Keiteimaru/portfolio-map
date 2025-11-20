<template>
  <div class="category">
    <swiper
      class="category-list"
      :slides-per-view="'auto'"
      :space-between="8"
      :modules="[Navigation]"
      :navigation="{
        prevEl: '.category-prev',
        nextEl: '.category-next',
      }"
    >
      <swiper-slide class="category-list__item" v-for="item in categories" :key="item.id">
        <button
          class="category-chip"
          :class="{ 'is-active': item.id === selectedCategory }"
          @click="$emit('changeCategory', item.id)"
        >{{ item.name }}</button>
      </swiper-slide>
    </swiper>
    <button class="category-prev"><span class="material-symbols-rounded">chevron_left</span></button>
    <button class="category-next"><span class="material-symbols-rounded">chevron_right</span></button>
  </div>
</template>

<script setup>

import { Swiper, SwiperSlide } from 'swiper/vue';
import 'swiper/css';
import { Navigation } from 'swiper/modules';
import 'swiper/css/navigation';

const props = defineProps({
  categories: Array,
  selectedCategory: Number
});
const emits = defineEmits([
  'changeCategory'
]);

</script>

<style scoped lang="scss">

@use "@/assets/sass/variable";
@use "@/assets/sass/mixin";

.category{
  position: relative;
  width: 100%;
}

.category-list{
  border-radius: 8px;
  width: 100%;
  &__item{
    width: auto;
  }
}

.category-chip{
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 0 12px;
  border-radius: 8px;
  height: 40px;
  background-color: var(--color-surface-container-high);
  font-size: 13px;
  font-weight: 700;
  color: var(--color-on-surface-variant);
  &.is-active{
    background-color: var(--color-primary);
    color: var(--color-on-primary);
  }
  @include mixin.mq(md){
    height: 48px;
    font-size: 15px;
  }
}

.category-prev,
.category-next{
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  position: absolute;
  top: 0;
  bottom: 0;
  margin: auto 0;
  border-radius: 8px;
  width: 28px;
  height: 40px;
  background-color: var(--color-primary-container);
  color: var(--color-on-primary-container);
  &:disabled{
    opacity: 0;
    pointer-events: none;
  }
  @include mixin.mq(md){
    height: 48px;
  }
}
.category-prev{
  left: 0;
}
.category-next{
  right: 0;
}

</style>
