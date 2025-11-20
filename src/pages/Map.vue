<template>
  <div class="map">
    <div class="map__container">
      <header class="header">
        <h1 class="header-logo"><img src="@/assets/images/logo.svg" alt="川西案内センター（仮）"></h1>
        <ButtonComponents class="header-access" variant="secondary" size="sm" @on-click="appDialogVisible = true">サイトのご案内</ButtonComponents>
      </header>
    </div>
    <div class="map__container2">
      <div class="canvas">
        <div id="canvas" class="canvas__body" role="region" aria-label="地図表示エリア"></div>
      </div>
    </div>
    <div class="map__container3">
      <Transition name="fade" mode="out-in">
        <nav class="navigation" v-if="!appArticle" key="navigation" role="navigation" aria-label="観光スポット一覧">
          <div class="navigation__container">
            <CategoryComponent :categories="appCategoryData" :selected-category="appSelectedCategory" @change-category="updateCategory($event)" />
          </div>
          <div class="navigation__container2">
            <Transition name="fade-list" mode="out-in">
              <ul v-if="appContentList && appContentList.length > 0" :key="appSelectedCategory" class="content-list" role="list" aria-live="polite">
                <li class="content-list__item" v-for="item in appContentList" :key="item.id" role="listitem">
                  <CardComponent :data="item" @show-article="showArticle($event, true)" />
                </li>
              </ul>
              <div v-else class="content-list-empty" role="status" aria-live="polite">
                ごめんなさい！<br>
                絶賛、情報収集中です。
              </div>
            </Transition>
          </div>
        </nav>
        <article class="content" v-else key="content" role="article" aria-label="スポット情報">
          <div class="content__container">
            <ClusterComponent v-if="appCluster" :data="appCluster" :article="appArticle" @show-article="showArticle($event)" />
            <Transition name="fade" mode="out-in">
              <ArticleComponent :key="appArticle?.id" :data="appArticle" />
            </Transition>
          </div>
          <div class="content__container2">
            <button class="content__close" @click="closeArticle()" aria-label="記事を閉じる" type="button"><span class="material-symbols-rounded" aria-hidden="true">close</span></button>
          </div>
        </article>
      </Transition>
    </div>
  </div>
  <DialogComponents v-if="appDialogVisible" @close="appDialogVisible = false" />
</template>

<script setup>

import { MAPBOX_ACCESS_TOKEN } from '@/constants/index';
import { ref, shallowRef, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import CardComponent from '@/components/Card.vue';
import ArticleComponent from '@/components/Article.vue';
import CategoryComponent from '@/components/Category.vue';
import ClusterComponent from '@/components/Cluster.vue';
import DialogComponents from '@/components/Dialog.vue';
import ButtonComponents from '@/components/Button.vue';

const router = useRouter();
const route = useRoute();

import spotsData from '@/assets/data/spots.json';
import noimage from '@/assets/images/dummy.jpg';

const appMap = shallowRef(null);
const appMarkers = ref([]);
const appMarkersOnScreen = ref([]);

let appMarkerUpdateFrame = null;
const appMarkerUpdaing = ref(false);

const appContentList = ref(null);
const appArticle = ref(null);
const appCluster = ref(null);
const appDialogVisible = ref(false);

const appSelectedCategory = ref(0);
const appCategoryData = ref([
  { id: 0, name: 'すべて' },
  { id: 100, name: '紅葉' },
  { id: 1, name: '観光名所' },
  { id: 2, name: '自然・景観' },
  { id: 3, name: 'グルメ' },
  { id: 4, name: 'ショッピング' },
  { id: 5, name: '宿泊' },
  { id: 6, name: '体験' },
  { id: 7, name: '交通' },
]);



onMounted(() => {

  // コンテンツデータの取得
  appContentList.value = spotsData;

  // GeoJSONに変換
  const geojson = convertGeojson(spotsData);

  // マップボックス初回生成
  mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
  appMap.value = new mapboxgl.Map({
    container: 'canvas',
    style: 'mapbox://styles/keiteimaru/cmi5hrq7i00rz01su74zu28qs',
    center: [135.41853216103894, 34.88712146525946],
    zoom: window.innerWidth <= 1024 ? 11 : 12,
    language: 'ja',
    attributionControl: false,
  });

  appMap.value .on('load', () => {
    appMap.value.addSource('marker', {
      type: 'geojson',
      data: geojson,
      cluster: true,
      clusterRadius: 55
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

  if (appMarkerUpdaing.value) return;
  if (appMarkerUpdateFrame) cancelAnimationFrame(appMarkerUpdateFrame);

  appMarkerUpdateFrame = requestAnimationFrame(async() => {
    appMarkerUpdaing.value = true;
    
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

          if (!data) continue;

          marker = appMarkers.value[id] = new mapboxgl.Marker({
            element: createMarkerElement(data, count),
            anchor: 'bottom'
          }).setLngLat([data.longitude, data.latitude]);
        }

        newMarkers[id] = marker;

        if (!appMarkersOnScreen.value[id]) {
          marker.addTo(appMap.value);
          if (!marker.clickHandler) {
            const isCluster = props.cluster;
            const markerData = isCluster ? await getClusterMarkerData(props.cluster_id) : props;
            marker.clickHandler = () => {
              isCluster ? showArticle(markerData[0]) : showArticle(markerData);
              appCluster.value = isCluster ? markerData : null;
            };
            marker.keyHandler = (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                marker.clickHandler();
              }
            };
            marker.getElement().addEventListener('click', marker.clickHandler);
            marker.getElement().addEventListener('keydown', marker.keyHandler);
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
      appMarkerUpdaing.value = false;
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
  return new Promise((resolve) => {
    appMap.value.getSource('marker').getClusterLeaves(id, 99, 0, (err, d) => {
      let newArray = d ? d.map(item => item.properties) : [];
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
  element.setAttribute('role', 'button');
  element.setAttribute('tabindex', '0');
  element.setAttribute('aria-label', `${data.name}の詳細を表示`);
  element.insertAdjacentHTML( 'beforeend', `
    <div class="marker__container">
      <div class="marker__container__body">
        <img class="marker__image" src="${data.image || noimage}" alt="" loading="lazy">
        ${clusterElement}
      </div>
      <div class="marker__container__tip"></div>
    </div>
    <div class="marker__shadow" aria-hidden="true"></div>
    <div class="marker__name" aria-hidden="true">${data.name}</div>
  `);

  return element;
}


/**
 * カテゴリーの更新処理
 */
const updateCategory = (id) => {

  appSelectedCategory.value = id;

  // 一覧データをフィルター(カンマ区切りのcategoryにも対応)
  appContentList.value = id === 0 ? spotsData : spotsData.filter(spot => {
    const categories = spot.category.toString().split(',').map(c => c.trim());
    return categories.includes(id.toString());
  });

  // マップデータをフィルター(数値を文字列に変換)
  const geojson = convertGeojson(appContentList.value);
  appMap.value.getSource('marker').setData(geojson);
  

  // 既存のマーカーを全て削除
  for (const key in appMarkersOnScreen.value) {
    appMarkersOnScreen.value[key].remove();
  }
  appMarkersOnScreen.value = {};
  appMarkers.value = {};

  updateMarker();
  updateMarkerZindex();

}


/**
 * 記事の表示処理
 */
const showArticle = (articleData, updateZoom = false) => {
  appArticle.value = articleData;

  nextTick(() => {
    setTimeout(() => {
      appMap.value.resize();
      requestAnimationFrame(() => {

        // 中心座標をマーカー座標に更新
        const currentZoom = appMap.value.getZoom();
        const activeZoom = updateZoom && currentZoom < 14 ? 14 : currentZoom;
        const targetCenter = appCluster.value ? [appCluster.value[0].longitude, appCluster.value[0].latitude] : [appArticle.value.longitude, appArticle.value.latitude];
        appMap.value.easeTo({
          center: targetCenter,
          zoom: activeZoom,
          padding: 20,
          duration: 500
        });

        // easeToのアニメーション完了後にマーカーの選択状態を更新
        setTimeout(() => {
          const targetId = appCluster.value ? appCluster.value[0].id : appArticle.value.id;
          document.querySelectorAll('.marker.is-selected').forEach(el => el.classList.remove('is-selected'));
          document.getElementById(`marker-${targetId}`)?.classList.add('is-selected');
        }, 550);

      });
    }, 300);
  });
}


/**
 * 記事の非表示処理
 */
const closeArticle = () => {
  appCluster.value = null;
  appArticle.value = null;

  nextTick(() => {
    setTimeout(() => {
      const center = appMap.value.getCenter();
      appMap.value.resize();
      appMap.value.setCenter(center);

      // マーカーの選択状態を解除
      document.querySelectorAll('.marker.is-selected').forEach(el => el.classList.remove('is-selected'));
    }, 550);
  });
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
  &.fade-list-enter-active,
  &.fade-list-leave-active {
    overflow-y: hidden;
  }
}

.content-list-empty{
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  font-size: 14px;
  color: var(--color-on-surface-variant);
  @include mixin.mq(md){
    font-size: 16px;
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
    border-radius: 50%;
    width: 40px;
    height: 40px;
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
      width: 48px;
      height: 48px;
    }
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
}

.fade-list-enter-active,
.fade-list-leave-active {
  transition: opacity 0.3s ease;
}

.fade-list-enter-from,
.fade-list-leave-to {
  opacity: 0;
}

.fade-list-enter-to,
.fade-list-leave-from {
  opacity: 1;
}

</style>

<style lang="scss">

.marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  
  &:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
  
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
    #{$this}__container{
      transform-origin: bottom center;
      animation: markerSelectedPulse 2s ease-in-out infinite;
    }
    #{$this}__name{
      font-size: 13px;
      color: var(--color-primary);
    }
  }
}

@keyframes markerSelectedPulse {
  0%   { transform: scale(1.1); opacity: 1; }
  50%  { transform: scale(1.3); opacity: 0.9; }
  100% { transform: scale(1.1); opacity: 1; }
}

</style>