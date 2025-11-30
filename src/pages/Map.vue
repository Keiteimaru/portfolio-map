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
        <div id="canvas" class="canvas__body"></div>
          <Transition name="fade-list" mode="out-in">
            <div class="canvas__loading" v-if="appMapLoading">
              <LoaderComponents />
            </div>
          </Transition>
      </div>
    </div>
    <div class="map__container3">
      <Transition name="fade" mode="out-in">
        <nav class="navigation" v-if="!appArticle" key="navigation" role="navigation" aria-label="スポット一覧">
          <div class="navigation__container">
            <CategoryComponent :categories="appCategoryData" :selected-category="appSelectedCategory" @change-category="updateCategory($event)" />
          </div>
          <div class="navigation__container2">
            <Transition name="fade-list" mode="out-in">
              <ul v-if="appLocationsOnScreen && appLocationsOnScreen.length > 0" :key="appSelectedCategory" class="content-list" role="list">
                <li class="content-list__item" v-for="item in appLocationsOnScreen" :key="item.id" role="listitem">
                  <CardComponent :data="item" @show-article="showArticle($event, true)" />
                </li>
              </ul>
                <div v-else-if="!appMapLoading" class="content-list-empty">
                ごめんなさい！<br>
                絶賛、情報収集中です。
                </div>
            </Transition>
          </div>
        </nav>
        <article class="content" v-else key="content" role="article" aria-label="スポット詳細">
          <div class="content__container">
            <ClusterComponent v-if="appCluster" :data="appCluster" :article="appArticle" @show-article="showArticle($event)" />
            <Transition name="fade" mode="out-in">
              <ArticleComponent :key="appArticle?.id" :data="appArticle" />
            </Transition>
          </div>
          <div class="content__container2">
            <button class="content__close" @click="closeArticle()" aria-label="詳細を閉じる" type="button"><span class="material-symbols-rounded" aria-hidden="true">close</span></button>
          </div>
        </article>
      </Transition>
    </div>
  </div>
  <DialogComponents v-if="appDialogVisible" @close="appDialogVisible = false" />
</template>

<script setup lang="ts">

import { MAPBOX_ACCESS_TOKEN } from '@/constants/index';
import { ref, shallowRef, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import axios from 'axios';
import { useRouter, useRoute } from 'vue-router';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import ButtonComponents from '@/components/Button.vue';
import CardComponent from '@/components/Card.vue';
import ArticleComponent from '@/components/Article.vue';
import CategoryComponent from '@/components/Category.vue';
import ClusterComponent from '@/components/Cluster.vue';
import DialogComponents from '@/components/Dialog.vue';
import LoaderComponents from '@/components/Loader.vue';

import noimage from '@/assets/images/dummy.jpg';

import type { Ref, ShallowRef } from 'vue';
import type { Map, Marker, GeoJSONSource } from 'mapbox-gl';
import type { AxiosResponse } from 'axios';

interface Location {
  id: number;
  name: string;
  label: string;
  category: string;
  description: string;
  longitude: number;
  latitude: number;
  image?: string;
  nearest_station?: string;
  distance_from_station?: string;
  opening_hours?: string;
  addres?: string;
  phone_number?: string;
  website?: string;
}
interface Category {
  id: number;
  name: string;
}
interface ClusterProperties {
  cluster: boolean;
  cluster_id: number;
  point_count: number;
}
interface MarkerWithHandlers extends Marker {
  clickHandler?: () => void;
  keyHandler?: (e: KeyboardEvent) => void;
}

const router = useRouter();
const route = useRoute();

const appLocations = ref<Location[] | null>(null);
const appLocationsOnScreen = ref<Location[] | null>(null);
const appJapanGeojson = ref<any>(null);
const appKawanishiGeojson = ref<any>(null);

const appMap = shallowRef<Map | null>(null);
const appMapLoading = ref<boolean>(true);
const appMapInitialized = ref<boolean>(false);

const appMarkers = ref<Record<string, MarkerWithHandlers>>({});
const appMarkersOnScreen = ref<Record<string, MarkerWithHandlers>>({});

let appMarkerUpdateFrame: number | null = null;
const appMarkerUpdaing = ref<boolean>(false);

const appArticle = ref<Location | null>(null);
const appArticleLast = ref<Location | null>(null);
const appCluster = ref<Location[] | null>(null);
const appDialogVisible = ref<boolean>(false);

const appSelectedCategory = ref<number>(0);
const appCategoryData = ref<Category[]>([
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
const appCategoryUpdating = ref<boolean>(false);

onMounted( async () => {

  // データ取得
  const [locationsRaw, japanGeojsonRaw, kawanishiGeojsonRaw] = await Promise.all([
    axios.get('/assets/data/locations.json'),
    axios.get('/assets/data/japan.geojson'),
    axios.get('/assets/data/kawanishi.geojson')
  ]);
  appLocationsOnScreen.value = appLocations.value = locationsRaw.data;
  appJapanGeojson.value = japanGeojsonRaw.data;
  appKawanishiGeojson.value = kawanishiGeojsonRaw.data;

  // マップ生成
  mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
  appMap.value = new mapboxgl.Map({
    container: 'canvas',
    style: 'mapbox://styles/keiteimaru/cmi5hrq7i00rz01su74zu28qs',
    center: [136.8118770963574, 37.068635228535285],
    //zoom: window.innerWidth <= 1024 ? 11 : 12,
    zoom: window.innerWidth <= 1024 ? 3.5 : 4.5,
    language: 'ja',
    attributionControl: false,
  });

  // マップ初回読み込み完了後
  appMap.value!.on('load', () => {

    // Standard styleのベースレイヤーを非表示
    appMap.value!.setConfigProperty('basemap', 'showPlaceLabels', false);
    appMap.value!.setConfigProperty('basemap', 'showRoadLabels', false);
    appMap.value!.setConfigProperty('basemap', 'showPointOfInterestLabels', false);
    appMap.value!.setConfigProperty('basemap', 'showTransitLabels', false);

    // 背景
    appMap.value!.addLayer({
      id: 'world-fill',
      type: 'background',
      paint: {
        'background-color': '#f0ecf4'
      }
    });

    // 日本
    appMap.value!.addSource('japan', {
      type: 'geojson',
      data: appJapanGeojson.value
    });
    appMap.value!.addLayer({
      id: 'japan-fill',
      type: 'fill',
      source: 'japan',
      paint: {
        'fill-color': '#fcf8ff',
        'fill-opacity': 1
      }
    });
    appMap.value!.addLayer({
      id: 'japan-outline',
      type: 'line',
      source: 'japan',
      paint: {
        'line-color': '#5b5891',
        'line-width': 1
      }
    });

    // 川西
    appMap.value!.addSource('kawanishi', {
      type: 'geojson',
      data: appKawanishiGeojson.value
    });
    appMap.value!.addLayer({
      id: 'kawanishi-fill',
      type: 'fill',
      source: 'kawanishi',
      paint: {
        'fill-color': '#5b5891',
        'fill-opacity': 0.8
      }
    });
    appMap.value!.addLayer({
      id: 'kawanishi-outline',
      type: 'line',
      source: 'kawanishi',
      paint: {
      'line-color': '#5b5891',
      'line-width': 1,
      'line-dasharray': [2, 2]
      }
    });

    if(appLocations.value) {
      // マーカー生成
      const geojson = convertGeojson(appLocations.value);
      appMap.value!.addSource('marker', {
        type: 'geojson',
        data: geojson,
        cluster: true,
        clusterRadius: 55
      });
      appMap.value!.addLayer({
        'id': 'marker',
        'type': 'circle',
        'source': 'marker',
        'paint': {
          'circle-opacity': 0,
          'circle-radius': 4
        }
      });
    }

    appMap.value!.once('idle', () => {

      /** 初回アニメーション処理 */
      appMapLoading.value = false;

      setTimeout(() => {
        appMap.value!.easeTo({
          center: [135.41086378066638, 34.87225650562146],
          zoom: window.innerWidth <= 1024 ? 10.5 : 11.5,
          duration: 3000,
          curve: 3
        });

        setTimeout(() => {
          const layerIds = ['world-fill', 'japan-fill', 'japan-outline', 'kawanishi-fill'];
          const duration = 800;
          const steps = 50;
          const interval = duration / steps;

          let currentStep = 0;
          const fadeInterval = setInterval(() => {
            currentStep++;
            const opacity = 1 - (currentStep / steps);
            
            layerIds.forEach(layerId => {
              const layer = appMap.value!.getLayer(layerId);
              if (layer) {
                const paintProperty = layer.type === 'background' || layer.type === 'fill' 
                  ? 'fill-opacity' 
                  : 'line-opacity';
                
                if (layer.type === 'background') {
                  appMap.value!.setPaintProperty(layerId, 'background-opacity', opacity);
                } else {
                  appMap.value!.setPaintProperty(layerId, paintProperty, opacity);
                }
              }
            });
            if (currentStep >= steps) {
              clearInterval(fadeInterval);
              layerIds.forEach(layerId => {
                appMap.value!.setLayoutProperty(layerId, 'visibility', 'none');
              });
            }
          }, interval);

          setTimeout(() => {
            appMap.value!.setConfigProperty('basemap', 'showPlaceLabels', true);
            appMap.value!.setConfigProperty('basemap', 'showRoadLabels', true);
            appMap.value!.setConfigProperty('basemap', 'showTransitLabels', true);
            updateMarker(true);
            setTimeout(() => {
              updateMarkerZindex();
              appMapInitialized.value = true;
            }, 100);
          }, 200);
        }, 4000);
      }, 1000);

    });
  });

  appMap.value!.on('render', ()=> {
    if (!appMapInitialized.value) return;
    updateMarker();
    updateMarkerZindex();
  });

});


/**
 * オブジェクト配列をGeoJSON形式に変換
 */
const convertGeojson = (data: Location[]): GeoJSON.FeatureCollection => {
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
 * マーカーの表示処理
 */
const updateMarker = async(animate = false) => {

  if (appMarkerUpdaing.value) return;
  if (appMarkerUpdateFrame) cancelAnimationFrame(appMarkerUpdateFrame);

  appMarkerUpdateFrame = requestAnimationFrame(async() => {
    appMarkerUpdaing.value = true;

    try {
      if (!appMap.value!.getLayer('marker')) return;

      const features = appMap.value!.querySourceFeatures('marker');
      const newMarkers = {};

      for (const { geometry, properties: props } of features) {
        const id = props.cluster ? `c${props.cluster_id}` : props.id;
        let marker = appMarkersOnScreen.value[id];

        // マーカー新規作成
        if (!marker) {
          const markerData = props.cluster ? await getClusterMarkerData(props.cluster_id) : [props];
          const clusterCount = props.cluster ? props.point_count : 0;

          // マップにマーカー追加
          marker = appMarkersOnScreen.value[id] = new mapboxgl.Marker({
            element: createMarkerElement(markerData[0], clusterCount, animate),
            anchor: 'bottom'
          }).setLngLat([markerData[0].longitude, markerData[0].latitude]);
          marker.addTo(appMap.value);

          // クリックイベント追加
          marker.clickHandler = () => {
            showArticle(markerData[0]);
            appCluster.value = props.cluster ? markerData : null;
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

        newMarkers[id] = marker;
      }

      // 画面外のマーカーを削除
      Object.keys(appMarkersOnScreen.value).forEach(id => {
        if (!newMarkers[id]) {
          const marker = appMarkersOnScreen.value[id];
          if (marker.clickHandler) {
            marker.getElement().removeEventListener('click', marker.clickHandler);
            delete marker.clickHandler;
          }
          if (marker.keyHandler) {
            marker.getElement().removeEventListener('keydown', marker.keyHandler);
            delete marker.keyHandler;
          }
          marker.remove();
        }
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
 * マーカーの表示処理（一度生成したマーカーを再利用する場合）
 * ※将来的に使う可能性もあるので保存
 */
const updateMarkerSave = async() => {

  if (appMarkerUpdaing.value) return;
  if (appMarkerUpdateFrame) cancelAnimationFrame(appMarkerUpdateFrame);

  appMarkerUpdateFrame = requestAnimationFrame(async() => {
    appMarkerUpdaing.value = true;

    try {
      if (!appMap.value!.getLayer('marker')) return;

      const features = appMap.value!.querySourceFeatures('marker');
      const newMarkers = {};

      for (const { geometry, properties: props } of features) {
        const id = props.cluster ? `c${props.cluster_id}` : props.id;
        let marker = appMarkers.value[id];

        // マーカー新規作成
        if (!marker) {
          const markerData = props.cluster ? await getClusterMarkerData(props.cluster_id) : [props];
          const clusterCount = props.cluster ? props.point_count : 0;

          marker = appMarkers.value[id] = new mapboxgl.Marker({
            element: createMarkerElement(markerData[0], clusterCount),
            anchor: 'bottom'
          }).setLngLat([markerData[0].longitude, markerData[0].latitude]);
        }

        newMarkers[id] = marker;

        // 画面内にマーカーを追加
        if (!appMarkersOnScreen.value[id]) {
          marker.addTo(appMap.value);

          // クリックイベントを追加
          if (!marker.clickHandler) {
            const markerData = props.cluster ? await getClusterMarkerData(props.cluster_id) : [props];
            marker.clickHandler = () => {
              showArticle(markerData[0]);
              appCluster.value = props.cluster ? markerData : null;
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

      // 画面外のマーカーを削除
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
 * マーカーのクリーンアップ処理
 */
const removeMarker = () => {

  if (appMarkerUpdateFrame) {
    cancelAnimationFrame(appMarkerUpdateFrame);
    appMarkerUpdateFrame = null;
  }

  for (const key in appMarkersOnScreen.value) {
    const marker = appMarkersOnScreen.value[key];
    if (marker.clickHandler) {
      marker.getElement().removeEventListener('click', marker.clickHandler);
      delete marker.clickHandler;
    }
    if (marker.keyHandler) {
      marker.getElement().removeEventListener('keydown', marker.keyHandler);
      delete marker.keyHandler;
    }
    marker.remove();
  }

  appMarkersOnScreen.value = {};

  appMarkerUpdaing.value = false;
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
const getClusterMarkerData = async (id: number): Promise<Location[]> => {
  return new Promise((resolve) => {
    appMap.value!.getSource('marker').getClusterLeaves(id, 99, 0, (err, d) => {
      let newArray = d ? d.map(item => item.properties) : [];

      // appArticleLast.valueのidと一致するアイテムを先頭に移動
      if (appArticleLast.value?.id) {
        const index = newArray.findIndex(item => item.id === appArticleLast.value.id);
        if (index > 0) {
          const [matchedItem] = newArray.splice(index, 1);
          newArray.unshift(matchedItem);
        }
      }
      

      resolve(newArray);
    });
  });
}


/**
 * マーカーのDOM要素を作成
 */
const createMarkerElement = ( data: Location, count: number = 0, animate: boolean = false): HTMLDivElement => {
  const element = document.createElement('div');
  let appendClass = '';
  let clusterElement = '';

  if(count > 0){
    clusterElement = `<span class="marker__cluster">${count}</span>`;
  }

  if(appArticleLast.value?.id === data.id){
    appendClass = ' is-selected';
  }

  if(animate){
    appendClass += ' is-animating';
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

  if(animate){
    setTimeout(() => {
      element.classList.remove('is-animating');
    }, 600);
  }

  return element;
}


/**
 * カテゴリーの更新処理
 */
const updateCategory = (id: number): void => {

  if(appCategoryUpdating.value) return;
  appCategoryUpdating.value = true;
  appSelectedCategory.value = id;

　// 既存マーカーを削除
  removeMarker();

  // 一覧データを更新
  appLocationsOnScreen.value = id === 0 ? appLocations.value! : appLocations.value!.filter(spot => {
    const categories = spot.category.toString().split(',').map(c => c.trim());
    return categories.includes(id.toString());
  });

  // マップのソースデータを更新
  const geojson = convertGeojson(appLocationsOnScreen.value!);
  const source = appMap.value!.getSource('marker') as GeoJSONSource;
  source.setData(geojson);

  appMap.value!.once('idle', () => {
    updateMarker(true);
    setTimeout(() => {
      updateMarkerZindex();
      appCategoryUpdating.value = false;
    }, 100);
  });

}


/**
 * 記事の表示処理
 */
const showArticle = (articleData: Location, updateZoom: boolean = false): void => {
  appArticleLast.value = appArticle.value = articleData;

  nextTick(() => {
    setTimeout(() => {

      appMap.value!.resize();

      // 中心座標をマーカー座標に更新
      const currentZoom = appMap.value!.getZoom();
      const zoom = updateZoom && currentZoom < 12 ? 12 : currentZoom;
      const center = appCluster.value?.length ? [appCluster.value[0].longitude, appCluster.value[0].latitude] : [appArticle.value!.longitude, appArticle.value!.latitude];
      appMap.value!.easeTo({
        center: center,
        zoom: zoom,
        duration: 500
      });

      // easeToのアニメーション完了後にマーカーの選択状態を更新
      setTimeout(() => {
        const targetId = appCluster.value ? appCluster.value[0].id : appArticle.value.id;
        document.querySelectorAll('.marker.is-selected').forEach(el => el.classList.remove('is-selected'));
        document.getElementById(`marker-${targetId}`)?.classList.add('is-selected');
      }, 500);

    }, 500);
  });
}


/**
 * 記事の非表示処理
 */
const closeArticle = (): void => {
  appCluster.value = null;
  appArticle.value = null;

  nextTick(() => {
    setTimeout(() => {
      const center = appMap.value!.getCenter();
      appMap.value!.resize();
      appMap.value!.setCenter(center);

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
  height: var(--size-header-height);
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
  background-color: var(--color-surface-container);
  &__body{
    width: 100%;
    height: 100%;
  }
  &__loading{
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    position: absolute;
    inset: 0;
    border-radius: 12px;
    background-color: var(--color-surface-container);
    font-size: 13px;
    color: var(--color-on-primary-container);
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
    width: var(--size-sidebar-width);
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
    transition: opacity .2s;
    &:hover{
      opacity: .8;
    }
  }
  @include mixin.mq(md){
    width: var(--size-sidebar-width);
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
    width: 12px;
    height: 5px;
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
    font-size: 11px;
    font-weight: 700;
    color: var(--color-on-surface);
    pointer-events: none;

    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-shadow:
      0 1px 0 rgba(255 255 255 / 50%),
      0 -1px 0 rgba(255 255 255 / 50%),
      1px 0 0 rgba(255 255 255 / 50%),
      1px 1px 0 rgba(255 255 255 / 50%),
      1px -1px 0 rgba(255 255 255 / 50%),
      -1px 0 0 rgba(255 255 255 / 50%),
      -1px 1px 0 rgba(255 255 255 / 50%),
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
    z-index: 999999!important;
    #{$this}__container{
      transform-origin: bottom center;
      animation: markerSelectedAnimation 2s ease-in-out infinite;
    }
    #{$this}__name{
      font-size: 13px;
      color: var(--color-primary);
    }
  }

  &.is-animating{
    #{$this}__container{
      transform-origin: bottom;
      animation: markerShowAnimation 0.2s ease-out;
    }
    #{$this}__shadow{
      animation: markerShowAnimation2 0.2s ease-out;
    }
    #{$this}__name{
      animation: markerShowAnimation2 0.2s ease-out;
    }
  }
}

@keyframes markerShowAnimation {
  0% {
    opacity: 0;
    transform: scale(0);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
@keyframes markerShowAnimation2 {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

@keyframes markerSelectedAnimation {
  0% { transform: scale(1.1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1.1); }
}

</style>