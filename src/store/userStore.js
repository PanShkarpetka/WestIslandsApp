import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', {
    state: () => ({
        nickname: '',
        isAdmin: false,
    }),
    actions: {
        login(nickname, isAdmin = false) {
            this.nickname = nickname;
            this.isAdmin = isAdmin;
        },
        logout() {
            this.nickname = '';
            this.isAdmin = false;
        }
    },
});