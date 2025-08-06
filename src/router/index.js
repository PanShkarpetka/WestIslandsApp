import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import IslandsView from '../views/IslandsView.vue';

const routes = [
    { path: '/', component: HomeView },
    { path: '/islands', component: IslandsView },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;