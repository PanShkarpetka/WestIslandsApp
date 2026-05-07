import { defineStore } from "pinia";
import {
    getFirestore, doc, collection, query, orderBy, limit, startAfter,
    getDocs, onSnapshot, runTransaction, serverTimestamp
} from "firebase/firestore";

// Exported for testing. Accepts injectable firebase deps so the transaction
// logic can be verified without a real Firestore connection.
export async function applyTreasuryTransaction(
    { delta, type, comment, user },
    {
        runTransactionFn = runTransaction,
        docFn = doc,
        collectionFn = collection,
        serverTimestampFn = serverTimestamp,
        db: firestoreDb,
    } = {},
) {
    const db = firestoreDb ?? getFirestore();
    const metaRef = docFn(db, "treasury/meta");
    const txCol = collectionFn(db, "treasuryTransactions");

    await runTransactionFn(db, async (t) => {
        const metaSnap = await t.get(metaRef);
        const metaData = metaSnap.exists() ? metaSnap.data() : {};
        const current = metaData.balance || 0;
        const newBalance = current + delta;

        if (newBalance < 0) throw new Error("Недостатньо золота у скарбниці.");

        const txRef = docFn(txCol);
        t.set(txRef, {
            amount: delta,
            type,
            comment: (comment || "").slice(0, 500),
            userId: user?.uid || "anon",
            nickname: (user?.nickname || "Гравець").slice(0, 80),
            createdAt: serverTimestampFn(),
            balanceAfter: newBalance,
        });
        t.set(metaRef, { balance: newBalance, updatedAt: serverTimestampFn() }, { merge: true });
    });
}

export const useTreasuryStore = defineStore("treasury", {
    state: () => ({
        balance: 0,
        totalIncome: 0,
        totalOutcome: 0,
        tx: [],
        _lastDoc: null,
        _pageSize: 20,
        loading: false,
        error: null,
        _unsubMeta: null,
    }),
    actions: {
        // Живий баланс із meta
        subscribeBalance() {
            if (this._unsubMeta) return;
            const db = getFirestore();
            const metaRef = doc(db, "treasury/meta");
            this._unsubMeta = onSnapshot(metaRef, (snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    this.balance = data.balance || 0;
                    this.totalIncome = data.totalIncome || 0;
                    this.totalOutcome = data.totalOutcome || 0;
                } else {
                    this.balance = 0;
                    this.totalIncome = 0;
                    this.totalOutcome = 0;
                }
            });
        },
        unsubscribeBalance() {
            this._unsubMeta?.();
            this._unsubMeta = null;
        },

        async loadFirstPage() {
            this.loading = true; this.error = null;
            try {
                const db = getFirestore();
                const q = query(
                    collection(db, "treasuryTransactions"),
                    orderBy("createdAt", "desc"),
                    limit(this._pageSize)
                );
                const snap = await getDocs(q);
                this.tx = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                this._lastDoc = snap.docs[snap.docs.length - 1] || null;
            } catch (e) {
                this.error = e?.message || String(e);
            } finally { this.loading = false; }
        },

        async loadNextPage() {
            if (!this._lastDoc) return;
            this.loading = true; this.error = null;
            try {
                const db = getFirestore();
                const q = query(
                    collection(db, "treasuryTransactions"),
                    orderBy("createdAt", "desc"),
                    startAfter(this._lastDoc),
                    limit(this._pageSize)
                );
                const snap = await getDocs(q);
                this.tx.push(...snap.docs.map(d => ({ id: d.id, ...d.data() })));
                this._lastDoc = snap.docs[snap.docs.length - 1] || null;
            } catch (e) {
                this.error = e?.message || String(e);
            } finally { this.loading = false; }
        },

        async _applyTx({ delta, type, comment, user }) {
            await applyTreasuryTransaction({ delta, type, comment, user });
        },

        // Публічні методи
        async deposit({ amount, comment, user }) {
            const delta = roundAmount(amount);
            if (!delta || delta <= 0) throw new Error("Сума має бути більшою за 0.");
            await this._applyTx({ delta, type: "deposit", comment, user });
        },

        async withdraw({ amount, comment, user }) {
            const deltaAbs = roundAmount(amount);
            if (!deltaAbs || deltaAbs <= 0) throw new Error("Сума має бути більшою за 0.");
            const delta = -deltaAbs; // зняття — від’ємне
            await this._applyTx({ delta, type: "withdraw", comment, user });
        },
    }
});

function roundAmount(value) {
    const parsed = Number(value || 0);
    if (!Number.isFinite(parsed)) return 0;
    return Math.round(parsed * 100) / 100;
}
