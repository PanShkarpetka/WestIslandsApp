import { createRouter, createWebHistory } from 'vue-router';
import IslandsView from '../views/IslandsView.vue';
import LoginView from '../views/LoginView.vue';
import AdminView from '../views/AdminView.vue';
import ShipsView from '../views/ShipsView.vue';
import { useUserStore } from '../store/userStore';
import DonationsView from "../views/DonationsView.vue";

const routes = [
    { path: '/', component: LoginView },
    { path: '/islands', component: IslandsView, meta: { requiresAuth: false } },
    { path: '/ships', component: ShipsView, meta: { requiresAuth: false } },
    { path: '/donations', component: DonationsView, meta: { requiresAuth: false } },
    { path: '/admin', component: AdminView, meta: { adminOnly: true } },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

router.beforeEach((to, from, next) => {
    const userStore = useUserStore();

    if (to.meta.adminOnly && !userStore.isAdmin) {
        return next('/');
    }

    if (to.meta.requiresAuth && !userStore.nickname) {
        return next('/');
    }

    next();
});

export default router;