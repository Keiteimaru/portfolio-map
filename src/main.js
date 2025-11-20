import { createApp } from 'vue';
import { createHead } from '@vueuse/head';
import App from './App.vue';
import router from '@/router';

import 'material-symbols/rounded.css';
import '@fontsource/noto-sans-jp/400.css';
import '@fontsource/noto-sans-jp/700.css';
import '@fontsource/poppins';
import '@/assets/sass/main.scss';

const app = createApp(App);
const head = createHead();

app.use(router);
app.use(head);
app.mount('#app');
