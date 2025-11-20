<template>
  <div class="article">
    <div class="article__section">
      <h1 class="article__name">{{ data.name }}</h1>
      <p class="article__label">{{ data.label }}</p>
      <p class="article__station">{{ data.nearest_station }}・{{ data.distance_from_station }}</p>
    </div>
    <div class="article__section">
      <p class="article__image"><img :src="data.image || noimage" :alt="data.name + 'の写真'"></p>
    </div>
    <div class="article__section">
      <p class="article__description">{{ data.description }}</p>
    </div>
    <div class="article__section">
      <dl class="article__details">
        <dt v-if="data.address">住所</dt>
        <dd v-if="data.address">{{ data.address }}</dd>
        <dt v-if="data.opening_hours">営業時間</dt>
        <dd v-if="data.opening_hours">{{ data.opening_hours }}</dd>
        <dt v-if="data.website">WEBサイト</dt>
        <dd v-if="data.website"><a :href="data.website" target="_blank" rel="noopener">{{ data.website }}</a></dd>
        <dt v-if="data.phone_number">電話番号</dt>
        <dd v-if="data.phone_number"><a :href="'tel:' + data.website">{{ data.phone_number }}</a></dd>
      </dl>
    </div>
  </div>
</template>

<script setup>

import noimage from '@/assets/images/dummy.jpg';

const props = defineProps({
  data: Object
});

</script>

<style scoped lang="scss">

@use "@/assets/sass/variable";
@use "@/assets/sass/mixin";

.article{
  display: flex;
  flex-direction: column;
  gap: 16px 0;
  &__name{
    margin-block-end: 0.2em;
    font-size: 24px;
    font-weight: 700;
    line-height: 1.3;
  }
  &__label,
  &__station{
    margin-block: 0.2em;
    font-size: 13px;
    color: var(--color-on-surface-variant);
  }
  &__image{
    > img{
      border-radius: 12px;
      aspect-ratio: 16 / 9;
      object-fit: cover;
    }
  }
  &__description{
    font-size: 14px;
    line-height: 2;
  }
  &__details{
    border-radius: 12px;
    background-color: var(--color-surface-container);
    > dt{
      padding: 16px 16px 0;
      font-size: 11px;
      color: var(--color-on-surface-variant);
      &:not(:first-of-type){
        border-top: solid 1px var(--color-surface);
      }
    }
    > dd{
      padding: 4px 16px 16px;
      font-size: 14px;
      word-break: break-all;
      > a{
        color: var(--color-primary);
        text-decoration: underline;
      }
    }
  }
  @include mixin.mq(md){
    gap: 32px 0;
    padding: 0;
    &__name{
      font-size: 34px;
    }
    &__label,
    &__station{
      font-size: 15px;
    }
    &__description{
      font-size: 16px;
    }
    &__details{
      > dt{
        font-size: 13px;
      }
      > dd{
        font-size: 15px;
      }
    }
  }
}

</style>
