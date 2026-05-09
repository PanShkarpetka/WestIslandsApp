import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';

import '@mdi/font/css/materialdesignicons.css';
import '@/styles/theme.css';

// Vuetify
import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { aliases, mdi } from 'vuetify/iconsets/mdi';

const vuetify = createVuetify({
    components,
    directives,
    icons: {
        defaultSet: 'mdi',
        aliases,
        sets: { mdi },
    },
    theme: {
        defaultTheme: 'pirateTheme',
        themes: {
            pirateTheme: {
                dark: true,
                colors: {
                    background:  '#1a1209',
                    surface:     '#2c1e0f',
                    'surface-variant': '#3d2a14',
                    primary:     '#c8962a',
                    secondary:   '#7b4f2e',
                    error:       '#8b2a2a',
                    success:     '#5a8a3c',
                    info:        '#3a6080',
                    warning:     '#c8962a',
                    'on-background': '#f0ddb0',
                    'on-surface':    '#f0ddb0',
                    'on-primary':    '#1a1209',
                    'on-secondary':  '#f0ddb0',
                },
            },
        },
    },
    defaults: {
        VCard: { color: 'surface' },
        VBtn: { variant: 'elevated' },
        VDialog: { scrollable: true },
    },
});

const app = createApp(App);

app.use(router);
app.use(createPinia());
app.use(vuetify);
app.mount('#app');
