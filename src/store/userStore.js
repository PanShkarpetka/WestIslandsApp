import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useUserStore = defineStore('user', () => {
    const nickname = ref('');
    const isAdmin = ref(false);
    const leaderGuildAccessIds = ref([]);

    const isLoggedIn = computed(() => nickname.value !== '');

    function login(nick, admin = false, guildAccessIds = []) {
        nickname.value = nick;
        isAdmin.value = admin;
        leaderGuildAccessIds.value = Array.isArray(guildAccessIds) ? guildAccessIds : [];
    }

    function logout() {
        nickname.value = '';
        isAdmin.value = false;
        leaderGuildAccessIds.value = [];
    }

    function canAccessGuild(guildId) {
        if (!guildId) return false;
        return isAdmin.value || leaderGuildAccessIds.value.includes(guildId);
    }

    return {
        nickname,
        isAdmin,
        isLoggedIn,
        leaderGuildAccessIds,
        login,
        logout,
        canAccessGuild,
    };
});
