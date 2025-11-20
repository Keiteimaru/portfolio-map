<template>
  <div class="map">
    <div class="map__container">
      <div class="header">
        <p class="header-logo"><img src="@/assets/images/logo.svg" alt="川西案内センター（仮）"></p>
        <button class="header-access" href="">サイトのご案内</button>
      </div>
    </div>
    <div class="map__container2">
      <div class="canvas">
        <div id="canvas" class="canvas__body"></div>
      </div>
    </div>
    <div class="map__container3">
      <div class="navigation" v-if="!appArticle">
        <div class="navigation__container">
          <CategoryComponent :categories="categories" :selected-category="selectedCategory" @change-category="updateCategory($event)" />
        </div>
        <div class="navigation__container2">
          <ul v-if="activeData" class="content-list">
            <li class="content-list__item" v-for="item in activeData" :key="item.id">
              <CardComponent :data="item" @show-article="showArticle($event)" />
            </li>
          </ul>
        </div>
      </div>

      <div class="content" v-if="appArticle">
        <div class="content__container">
          <ClusterComponent v-if="appCluster" :data="appCluster" :article="appArticle" @show-article="showArticle($event)" />
          <ArticleComponent :data="appArticle" />
        </div>
        <div class="content__container2">
          <button class="content__close" @click="closeArticle()">とじる</button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>

import { MAPBOX_ACCESS_TOKEN } from '@/constants/index';
import { ref, shallowRef, provide, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Swiper, SwiperSlide } from 'swiper/vue';
import 'swiper/css';
import { Navigation } from 'swiper/modules';
import 'swiper/css/navigation';

import spotsData from '@/assets/data/spots.json';
import noimage from '@/assets/images/dummy.jpg';

/** components 読込 */
import CardComponent from '@/components/Card.vue';
import ArticleComponent from '@/components/Article.vue';
import CategoryComponent from '@/components/Category.vue';
import ClusterComponent from '@/components/Cluster.vue';
import DialogComponents from '@/components/Dialog.vue'

const router = useRouter();
const route = useRoute();

const appMap = shallowRef(null);
const appMarkers = ref([]);
const appMarkersOnScreen = ref([]);
const isUpdatingMarkers = ref(false);
let updateMarkerFrame = null;

const appArticle = ref(null);
const appCluster = ref(null);

const selectedCategory = ref(0);
const categories = ref([
  { id: 0, name: 'すべて' },
  { id: 99, name: '紅葉' },
  { id: 1, name: '名所' },
  { id: 2, name: 'ライフスタイル' },
  { id: 3, name: 'テクノロジー' },
  { id: 4, name: 'ライフスタイル' },
  { id: 5, name: '旅行' },
  { id: 6, name: 'グルメ' },
]);

const activeData = ref(null);


onMounted(() => {

  // コンテンツデータの取得
  activeData.value = spotsData;

  // GeoJSONに変換
  const geojson = convertGeojson(spotsData);

  // マップボックス初回生成
  mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
  appMap.value = new mapboxgl.Map({
    container: 'canvas',
    style: 'mapbox://styles/keiteimaru/cmi5hrq7i00rz01su74zu28qs',
    center: [135.41155425720257, 34.874942602125884],
    zoom: 12,
    language: 'ja',
    attributionControl: false,
  });

  appMap.value .on('load', () => {
    appMap.value.addSource('marker', {
      type: 'geojson',
      data: geojson,
      cluster: true,
      clusterRadius: 45
    });
    appMap.value.addLayer({
      'id': 'marker',
      'type': 'circle',
      'source': 'marker',
      'paint': {
        'circle-opacity': 0,
        'circle-radius': 4
      }
    });
  });

  appMap.value.on('render', ()=> {
    updateMarker();
    updateMarkerZindex();
  });

});


/**
 * オブジェクト配列をGeoJSON形式に変換
 */
const convertGeojson = (data) => {
  const geojson = {
    type: 'FeatureCollection',
    features: []
  };
  data.forEach((item) => {
    const feature = {
      type: 'Feature',
      properties: item,
      geometry: {
        type: 'Point',
        coordinates: [item.longitude, item.latitude]
      }
    };
    geojson.features.push(feature);
  });
  return geojson;
}


/**
 * マーカー描画の更新
 */
const updateMarker = async() => {

  if (isUpdatingMarkers.value) return;
  if (updateMarkerFrame) cancelAnimationFrame(updateMarkerFrame);

  updateMarkerFrame = requestAnimationFrame(async() => {
    isUpdatingMarkers.value = true;
    
    try {
      if (!appMap.value.getLayer('marker')) return;
      
      const features = appMap.value.queryRenderedFeatures({ layers: ['marker'] });
      const newMarkers = {};

      for (const { geometry, properties: props } of features) {
        const id = props.cluster ? `CL${props.cluster_id}` : props.id;
        let marker = appMarkers.value[id];

        if (!marker) {
          const isCluster = props.cluster;
          const markerData = isCluster ? await getClusterMarkerData(props.cluster_id) : props;
          const data = isCluster ? markerData[0] : markerData;
          const count = isCluster ? props.point_count : 0;

          marker = appMarkers.value[id] = new mapboxgl.Marker({
            element: createMarkerElement(data, count),
            anchor: 'bottom'
          }).setLngLat([data.longitude, data.latitude]);
        }

        newMarkers[id] = marker;

        if (!appMarkersOnScreen.value[id]) {
          marker.addTo(appMap.value);
          if (!marker.clickHandler) {
            const markerData = props.cluster ? await getClusterMarkerData(props.cluster_id) : props;
            marker.clickHandler = () => {
              props.cluster ? showArticle(markerData[0], markerData) : showArticle(markerData, []);
            };
            marker.getElement().addEventListener('click', marker.clickHandler);
          }
        }
      }

      Object.keys(appMarkersOnScreen.value).forEach(id => {
        if (!newMarkers[id]) appMarkersOnScreen.value[id].remove();
      });

      appMarkersOnScreen.value = newMarkers;
    } catch (error) {
      console.error(error);
    } finally {
      isUpdatingMarkers.value = false;
    }
  });
}


/**
 * マーカーの重なり順を更新
 */
const updateMarkerZindex = () => {
  const markerEls = document.getElementsByClassName('mapboxgl-marker');
  if (!markerEls.length) return;

  Array.from(markerEls).forEach((item) => {
    const matrix = window.getComputedStyle(item).transform;
    if (matrix === 'none') return;

    const values = matrix.match(/matrix.*\((.+)\)/)?.[1].split(', ');
    if (!values) return;

    const yPos = matrix.includes('3d') ? values[13] : values[5];
    item.style.zIndex = Math.max(1, Math.ceil(Number(yPos)));
  });
}


/**
 * クラスターマーカーのデータ取得
 */
const getClusterMarkerData = async(id) => {
  return new Promise((resolve, reject) => {
    appMap.value.getSource('marker').getClusterLeaves(id, 99, 0, (err, d) => {
      const newArray = d ? d.map(item => (item.properties)) : [];
      resolve(newArray);
    });
  });
}


/**
 * マーカーのDOM要素を作成
 */
const createMarkerElement = (data, count = 0) => {

  const element = document.createElement('div');
  let appendClass = '';
  let clusterElement = '';

  if(count > 0){
    clusterElement = `<span class="marker__cluster">${count}</span>`;
  }

  element.id = `marker-${data.id}`;
  element.className = 'marker' + appendClass;
  element.insertAdjacentHTML( 'beforeend', `
    <div class="marker__container">
      <div class="marker__container__body">
        <img class="marker__image" src="${data.image || noimage}" alt="" loading="lazy">
        ${clusterElement}
      </div>
      <div class="marker__container__tip"></div>
    </div>
    <div class="marker__shadow"></div>
    <div class="marker__name">${data.name}</div>
  `);

  return element;
}


/**
 * カテゴリーの更新処理
 */
const updateCategory = (id) => {

  selectedCategory.value = id;

  // 一覧データをフィルター
  activeData.value = id === 0 ? spotsData : spotsData.filter(spot => spot.category == id);

  // マップデータをフィルター(数値を文字列に変換)
  const geojson = convertGeojson(activeData.value);
  appMap.value.getSource('marker').setData(geojson);

  // 既存のマーカーを全て削除
  for (const key in appMarkersOnScreen.value) {
    appMarkersOnScreen.value[key].remove();
  }
  appMarkersOnScreen.value = {};
  appMarkers.value = {};

}


/**
 * 記事の表示処理
 */
const showArticle = (articleData, clusterData) => {
  appArticle.value = articleData;
  appMap.value.easeTo({
    center: [articleData.longitude, articleData.latitude],
    padding: 20
  });
  
  if (clusterData && clusterData.length > 0) {
    appCluster.value = clusterData;

    // クラスターマーカーのDOM要素を探して位置を更新
    const targetMarkerId = `marker-${clusterData[0].id}`;
    for (const id in appMarkersOnScreen.value) {
      if (id.startsWith('CL')) {
        const clusterMarker = appMarkersOnScreen.value[id];
        const markerElement = clusterMarker.getElement();
        if (markerElement && markerElement.id === targetMarkerId) {
          clusterMarker.setLngLat([articleData.longitude, articleData.latitude]);
          
          // marker__textの内容を更新
          const textElement = markerElement.querySelector('.marker__text');
          if (textElement) {
            textElement.textContent = articleData.name;
          }
          
          break;
        }
      }
    }
  }
}


/**
 * 記事の非表示処理
 */
const closeArticle = () => {

  // クラスターマーカーの場合、一件目のデータに戻す
  if (appCluster.value && appCluster.value.length > 0) {
    const originalData = appCluster.value[0];
    const targetMarkerId = `marker-${originalData.id}`;
    
    for (const id in appMarkersOnScreen.value) {
      if (id.startsWith('CL')) {
        const clusterMarker = appMarkersOnScreen.value[id];
        const markerElement = clusterMarker.getElement();
        if (markerElement && markerElement.id === targetMarkerId) {
          clusterMarker.setLngLat([originalData.longitude, originalData.latitude]);
          
          const textElement = markerElement.querySelector('.marker__text');
          if (textElement) {
            textElement.textContent = originalData.name;
          }
          
          break;
        }
      }
    }
  }
  
  appCluster.value = null;
  appArticle.value = null;
}

</script>

<style scoped lang="scss">

@use "@/assets/sass/variable";
@use "@/assets/sass/mixin";

.map{
  display: grid;
  grid-template-rows: 56px 1fr auto;
  gap: 12px 0;
  overflow: hidden;
  position: fixed;
  inset: 0;
  padding: 0 12px;
  &__container,
  &__container2,
  &__container3{
    min-width: 0;
  }
  @include mixin.mq(md){
    grid-template-columns: 1fr auto;
    grid-template-rows: auto 1fr;
    gap: 12px 24px;
    padding: 0 32px 24px;
    &__container{
      grid-area: 1 / 1 / 2 / 3;
    }
    &__container2{
      grid-area: 2 / 1 / 3 / 2;
      min-height: 0;
    }
    &__container3{
      grid-area: 2 / 2 / 3 / 3;
      padding: 0;
      min-height: 0;
    }
  }
}

.header{
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  @include mixin.mq(md){
    height: 80px;
  }
}

.header-logo{
  height: 28px;
  > img{
    width: auto;
    height: inherit;
  }
  @include mixin.mq(md){
    height: 44px;
  }
}

.header-access{
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 1.5em;
  border-radius: 18px;
  height: 36px;
  font-size: 12px;
  font-weight: 700;
  background-color: var(--color-secondary);
  color: var(--color-on-secondary);
  @include mixin.mq(md){
    border-radius: 24px;
    height: 48px;
    font-size: 15px;
  }
}

.canvas{
  overflow: hidden;
  position: relative;
  border: solid 4px var(--color-primary);
  border-radius: 12px;
  width: 100%;
  height: 100%;
  &__body{
    width: 100%;
    height: 100%;
  }
  @include mixin.mq(md){
    border-radius: 20px;
  }
}

.navigation{
  display: flex;
  flex-direction: column;
  gap: 12px 0;
  height: max(30dvh, 280px);
  &__container{
    flex: 0 0 auto;
    min-height: 0;
  }
  &__container2{
    flex: 1 1 auto;
    min-height: 0;
  }
  @include mixin.mq(md){
    gap: 20px 0;
    width: var(--size-content-width);
    height: 100%;
  }
}

.content-list{
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  gap: 8px 0;
  padding: 0 0 12px;
  height: 100%;
  // scrollbar-color: var(--color-primary) var(--color-surface);
  @include mixin.mq(md){
    gap: 12px 0;
    padding: 0;
  }
}

.content{
  display: flex;
  flex-direction: column;
  position: relative;
  overflow-y: auto;
  height: 50dvh;
  &__container{
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    gap: 20px 0;
  }
  &__container2{
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    position: sticky;
    bottom: 0;
    padding: 12px 0;
  }
  &__close{
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 18px;
    width: 100px;
    height: 36px;
    background-color: var(--color-secondary);
    color: var(--color-on-secondary);
  }
  @include mixin.mq(md){
    width: var(--size-content-width);
    height: 100%;
    &__container2{
      padding: 20px 0 0;
    }
    &__close{
      border-radius: 24px;
      width: 100%;
      height: 48px;
    }
  }
}

</style>

<style lang="scss">

.marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  &__container{
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 2;
    position: relative;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.12));
    &__body{
      display: grid;
      grid-template: 1fr / 1fr;
      align-items: center;
      justify-content: center;
      position: relative;
      border: solid 3px var(--color-surface);
      border-radius: 12px;
      width: 56px;
      height: 56px;
      background-color: var(--color-surface);
    }
    &__tip{
      margin: -2px 0 0;
      width: 8px;
      height: 8px;
      background: var(--color-surface);
      clip-path: polygon(0 0, 50% 100%, 100% 0);
    }
  }
  &__shadow{
    z-index: 1;
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    margin: 0 auto;
    border-radius: 50%;
    width: 16px;
    height: 6px;
    background-color: rgba(0 0 0 / 20%);
    transform: translateY(50%);
  }
  &__image{
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 9px;
    width: 100%;
    aspect-ratio: 1 / 1;
    object-fit: cover;
  }
  &__name {
    z-index: 1;
    position: absolute;
    top: calc(100% + 4px);
    left: 50%;
    transform: translateX(-50%);
    width: max-content;
    max-width: 12em;
    line-height: 1.3;
    font-size: 12px;
    font-weight: 700;
    color: var(--color-on-surface);
    pointer-events: none;

    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-shadow:
      0px -1px 0 rgba(255 255 255 / 50%),
      1px -1px 0 rgba(255 255 255 / 50%),
      1px 0 0 rgba(255 255 255 / 50%),
      1px 1px 0 rgba(255 255 255 / 50%),
      0 1px 0 rgba(255 255 255 / 50%),
      -1px 1px 0 rgba(255 255 255 / 50%),
      -1px 0 0 rgba(255 255 255 / 50%),
      -1px -1px 0 rgba(255 255 255 / 50%);
  }
  &__cluster{
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    position: absolute;
    top: 0;
    right: 0;
    padding: 0 4px;
    border: solid 1px;
    border-radius: 14px;
    width: max-content;
    min-width: 28px;
    height: 28px;
    background-color: var(--color-secondary);
    line-height: 1;
    letter-spacing: normal;
    font-size: 13px;
    font-family: "Poppins";
    color: var(--color-on-secondary);
    transform: translate(45%, -45%);
  }

  $this: &;
  &.is-selected{
    z-index: 99999999!important;
    #{$this}__body{
      transform-origin: bottom center;
      animation: markerSelectedPulse 2s ease-in-out infinite;
    }
  }
}

@keyframes markerSelectedPulse {
  0%   { transform: scale(1.1); opacity: 1; }
  50%  { transform: scale(1.3); opacity: 0.9; }
  100% { transform: scale(1.1); opacity: 1; }
}

</style>