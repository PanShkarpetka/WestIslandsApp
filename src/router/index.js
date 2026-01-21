import { createRouter, createWebHistory } from 'vue-router';
import IslandsPage from '@/views/IslandsPage.vue';
import IslandInfoPage from '@/views/IslandInfoPage.vue';
import PopulationPage from '@/views/PopulationPage.vue'
import TreasuryPage from '@/views/TreasuryPage.vue'
import BuildingsPage from '@/views/BuildingsPage.vue'
import ManufacturesPage from '@/views/ManufacturesPage.vue'
import LoginView from '@/views/LoginView.vue';
import AdminView from '@/views/AdminView.vue';
import ShipsView from '@/views/ShipsView.vue';
import DonationGoalsPage from "@/views/DonationGoalsPage.vue";
import PoliticsPage from "@/views/PoliticsPage.vue";
import ReligionPage from "@/views/ReligionPage.vue";
import CourierPage from "@/views/CourierView.vue";
import { useUserStore } from '@/store/userStore';

const routes = [
    { path: '/', component: LoginView },
    {
        path: '/islands/:islandId',
        name: 'islands',
        component: IslandsPage,
        meta: { requiresAuth: false },
        children: [
            { path: '', name: 'island', component: IslandInfoPage },
            { path: 'buildings', name: 'buildings', component: BuildingsPage },
            { path: 'population', name: 'population', component: PopulationPage },
            { path: 'treasury', name: 'treasury', component: TreasuryPage },
            { path: 'manufactures', name: 'manufactures', component: ManufacturesPage },
        ]
    },
    { path: '/ships', component: ShipsView, meta: { requiresAuth: false } },
    { path: '/donations', component: DonationGoalsPage, meta: { requiresAuth: false } },
    { path: '/politics', component: PoliticsPage, meta: { requiresAuth: false } },
    { path: '/religion', component: ReligionPage, meta: { requiresAuth: false } },
    { path: '/courier', component: CourierPage, meta: { requiresAuth: false } },
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
