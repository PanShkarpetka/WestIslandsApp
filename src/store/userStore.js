import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useUserStore = defineStore('user', () => {
    const nickname = ref('');
    const isAdmin = ref(false);
    const leaderGuildAccessIds = ref([]);
    const heroId = ref('');

    const isLoggedIn = computed(() => nickname.value !== '');
    const isHeroUser = computed(() => !!heroId.value);

    function login(nick, admin = false, guildAccessIds = []) {
        nickname.value = nick;
        isAdmin.value = admin;
        leaderGuildAccessIds.value = Array.isArray(guildAccessIds) ? guildAccessIds : [];
        heroId.value = '';
    }

    function loginAsHero(name, id) {
        nickname.value = name;
        isAdmin.value = false;
        leaderGuildAccessIds.value = [];
        heroId.value = id;
    }

    function logout() {
        nickname.value = '';
        isAdmin.value = false;
        leaderGuildAccessIds.value = [];
        heroId.value = '';
    }

    function canAccessGuild(guildId) {
        if (!guildId) return false;
        return isAdmin.value || leaderGuildAccessIds.value.includes(guildId);
    }

    return {
        nickname,
        isAdmin,
        isLoggedIn,
        isHeroUser,
        heroId,
        leaderGuildAccessIds,
        login,
        loginAsHero,
        logout,
        canAccessGuild,
    };
});
