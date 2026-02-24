import { defineStore } from 'pinia';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

const DEFAULT_GUILDS = [
  {
    id: 'AdventureGuild',
    assets: {
      name: 'Adventure Guild',
      shortName: 'AG',
      leader: 'Valerian',
      treasure: 0,
      visibleToAll: true,
      withdrawUsername: 'adventureGuild',
      withdrawPassword: 'easyMoney',
    },
  },
  {
    id: 'MerchantsGuild',
    assets: {
      name: 'Merchants Guild',
      shortName: 'MG',
      leader: 'Mirabel',
      treasure: 0,
      visibleToAll: true,
      withdrawUsername: 'merchantGuild',
      withdrawPassword: 'tradeCoin',
    },
  },
];

export const useGuildStore = defineStore('guilds', {
  state: () => ({
    guilds: [],
    loading: false,
    error: null,
    _unsub: null,
  }),
  actions: {
    async ensureDefaults() {
      const db = getFirestore();
      await Promise.all(
        DEFAULT_GUILDS.map(async (guild) => {
          const guildRef = doc(db, 'guilds', guild.id);
          const snap = await getDoc(guildRef);
          if (snap.exists()) return;

          await setDoc(guildRef, {
            assets: guild.assets,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }),
      );
    },

    subscribeGuilds() {
      if (this._unsub) return;
      const db = getFirestore();
      this.loading = true;
      this.error = null;

      const guildsQuery = query(collection(db, 'guilds'), orderBy('assets.name'));
      this._unsub = onSnapshot(
        guildsQuery,
        (snap) => {
          this.guilds = snap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() || {}),
          }));
          this.loading = false;
        },
        (error) => {
          this.error = error?.message || String(error);
          this.loading = false;
        },
      );
    },

    unsubscribeGuilds() {
      this._unsub?.();
      this._unsub = null;
    },

    async addGuild(payload) {
      const db = getFirestore();
      const guildId = buildGuildId(payload.name);
      const guildRef = doc(db, 'guilds', guildId);

      await setDoc(guildRef, {
        assets: sanitizeGuildAssets(payload),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    },

    async updateGuild(id, payload) {
      const db = getFirestore();
      const guildRef = doc(db, 'guilds', id);

      await setDoc(
        guildRef,
        {
          assets: sanitizeGuildAssets(payload),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    },

    async deposit({ guildId, amount, comment, actor }) {
      await this._applyTransaction({ guildId, amount: Math.abs(amount), comment, actor, type: 'deposit' });
    },

    async withdraw({ guildId, amount, comment, actor }) {
      await this._applyTransaction({ guildId, amount: -Math.abs(amount), comment, actor, type: 'withdraw' });
    },

    async _applyTransaction({ guildId, amount, comment, actor, type }) {
      const db = getFirestore();
      const guildRef = doc(db, 'guilds', guildId);
      const logsRef = collection(db, 'guilds', guildId, 'logs');

      await runTransaction(db, async (t) => {
        const guildSnap = await t.get(guildRef);
        if (!guildSnap.exists()) {
          throw new Error('Guild not found.');
        }

        const guildData = guildSnap.data() || {};
        const assets = guildData.assets || {};
        const currentTreasure = Number(assets.treasure || 0);
        const nextTreasure = roundAmount(currentTreasure + amount);

        if (nextTreasure < 0) {
          throw new Error('Not enough guild treasure for this withdrawal.');
        }

        t.set(
          guildRef,
          {
            assets: {
              ...assets,
              treasure: nextTreasure,
            },
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );

        const logRef = doc(logsRef);
        t.set(logRef, {
          amount,
          type,
          comment: (comment || '').slice(0, 500),
          userNickname: (actor?.nickname || 'Unknown').slice(0, 80),
          createdAt: serverTimestamp(),
          treasureAfter: nextTreasure,
        });
      });
    },
  },
});

function sanitizeGuildAssets(payload) {
  return {
    name: (payload?.name || '').trim(),
    shortName: (payload?.shortName || '').trim(),
    leader: (payload?.leader || '').trim(),
    treasure: roundAmount(payload?.treasure || 0),
    visibleToAll: payload?.visibleToAll !== false,
    withdrawUsername: (payload?.withdrawUsername || '').trim(),
    withdrawPassword: (payload?.withdrawPassword || '').trim(),
  };
}

function buildGuildId(name) {
  const cleaned = (name || '')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('');

  if (cleaned) return cleaned;
  return `Guild${Date.now()}`;
}

function roundAmount(value) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100) / 100;
}
