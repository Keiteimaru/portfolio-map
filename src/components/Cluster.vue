<template>
  <div class="claster">
    <swiper
      class="cluster-list"
      :slides-per-view="'auto'"
      :space-between="8"
      :modules="[Navigation]"
      :navigation="{
        prevEl: '.cluster-prev',
        nextEl: '.cluster-next',
      }"
    >
      <swiper-slide class="cluster-list__item" v-for="item in data" :key="item.id">
        <div 
          class="cluster-card" 
          role="button"
          :class="{ 'is-selected': item.id === article.id }"
          :tabindex="item.id === article.id ? -1 : 0"
          :aria-label="`${item.name}を選択`"
          @click="$emit('showArticle', item)"
          @keydown.enter="$emit('showArticle', item)"
          @keydown.space.prevent="$emit('showArticle', item)"
        >
          <div class="cluster-card__image">
            <img :src="item.image || noimage" alt="">
            <span v-if="article.id === item.id" class="material-symbols-rounded">check</span>
          </div>
          <p class="cluster-card__name">{{ item.name }}</p>
        </div>
      </swiper-slide>
    </swiper>
    <button class="cluster-prev"><span class="material-symbols-rounded">chevron_left</span></button>
    <button class="cluster-next"><span class="material-symbols-rounded">chevron_right</span></button>
  </div>
</template>

<script setup>

import { Swiper, SwiperSlide } from 'swiper/vue';
import 'swiper/css';
import { Navigation } from 'swiper/modules';
import 'swiper/css/navigation';
import noimage from '@/assets/images/dummy.jpg';

const props = defineProps({
  data: Array,
  article: Object
});
const emits = defineEmits([
  'showArticle'
]);

</script>

<style scoped lang="scss">

@use "@/assets/sass/variable";
@use "@/assets/sass/mixin";

.claster{
  position: relative;
  background-color: var(--color-surface-container);
  border-radius: 12px;
  padding: 12px 0 8px;
  @include mixin.mq(md){
    padding: 16px 0 12px;
    border-radius: 20px;
  }
}

.cluster-list{
  padding: 0 8px;
  &__item{
    width: auto;
  }
}

.cluster-card{
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px 0;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  &__image{
    position: relative;
    border: solid 3px var(--color-surface);
    border-radius: 12px;
    width: 56px;
    height: 56px;
    > img{
      display: block;
      border-radius: 9px;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    > span{
      display: none;
    }
  }
  &__name{
    width: 72px;
    line-height: 1.3;
    text-align: center;
    font-size: 10px;
    color: var(--color-on-surface-variant);
    @include mixin.line-clamp(1);
  }

  $this: &;
  &.is-selected{
    pointer-events: none;
    #{$this}__image{
      > span{
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1;
        position: absolute;
        inset: 0;
        border-radius: 9px;
        background-color: rgba(0 0 0 / 50%);
        color: rgba(255 255 255);
      }
    }
    #{$this}__name{
      font-weight: 700;
      color: var(--color-primary);
    }
  }
}

.cluster-prev,
.cluster-next{
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  position: absolute;
  top: 0;
  bottom: 0;
  margin: auto 0;
  border-radius: 16px;
  width: 32px;
  height: 32px;
  background-color: var(--color-primary-container);
  color: var(--color-on-primary-container);
  &:disabled{
    opacity: 0;
    pointer-events: none;
  }
}
.cluster-prev{
  left: 8px;
}
.cluster-next{
  right: 8px;
}

</style>
