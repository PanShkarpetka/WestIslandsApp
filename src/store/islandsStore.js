import { defineStore } from 'pinia';

export const useIslandStore = defineStore('island', {
    state: () => ({ islands: [] }),
    actions: {
        async fetchIslands() {
            // logic to fetch from Firebase or mock data
        },
    },
});