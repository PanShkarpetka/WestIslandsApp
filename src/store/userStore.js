import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useUserStore = defineStore('user', () => {
    const nickname = ref('');
    const isAdmin = ref(false);

    const isLoggedIn = computed(() => nickname.value !== '');

    function login(nick, admin = false) {
        nickname.value = nick;
        isAdmin.value = admin;
    }

    function logout() {
        nickname.value = '';
        isAdmin.value = false;
    }

    return {
        nickname,
        isAdmin,
        isLoggedIn,
        login,
        logout
    };
});