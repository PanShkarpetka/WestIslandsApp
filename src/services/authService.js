import { db } from './firebase.js';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { DEFAULT_HERO_PASSWORD } from '../config/constants.js';

export async function verifyAdminPassword(
    inputPassword,
    { dbRef = db, docFn = doc, getDocFn = getDoc } = {},
) {
    const docRef = docFn(dbRef, 'credentials', 'admin');
    const docSnap = await getDocFn(docRef);

    if (!docSnap.exists()) return false;

    const { password } = docSnap.data();
    return password === inputPassword;
}

async function queryLeaderGuilds(
    nickname,
    { dbRef = db, collectionFn = collection, queryFn = query, whereFn = where, getDocsFn = getDocs } = {},
) {
    const leaderName = (nickname || '').trim();
    if (!leaderName || leaderName.toLowerCase() === 'admin') {
        return null;
    }

    const guildsQuery = queryFn(
        collectionFn(dbRef, 'guilds'),
        whereFn('leader', '==', leaderName),
    );

    return getDocsFn(guildsQuery);
}

export async function isLeaderNickname(nickname, deps = {}) {
    const guildsSnap = await queryLeaderGuilds(nickname, deps);
    if (!guildsSnap) return false;
    return !guildsSnap.empty;
}

export async function getLeaderGuildAccess(
    nickname,
    inputPassword,
    deps = {},
) {
    const guildsSnap = await queryLeaderGuilds(nickname, deps);
    if (!guildsSnap || guildsSnap.empty) {
        return { requiresPassword: false, accessibleGuildIds: [] };
    }

    const password = (inputPassword || '').trim();
    if (!password) {
        return { requiresPassword: true, accessibleGuildIds: [] };
    }

    const accessibleGuildIds = guildsSnap.docs
        .filter((docSnap) => {
            const data = docSnap.data() || {};
            const leaderPassword = (data.leaderPassword || data.withdrawPassword || '').trim();
            return leaderPassword && leaderPassword === password;
        })
        .map((docSnap) => docSnap.id);

    return {
        requiresPassword: true,
        accessibleGuildIds,
    };
}

export async function isPasswordHeroName(
    name,
    { dbRef = db, collectionFn = collection, queryFn = query, whereFn = where, getDocsFn = getDocs } = {},
) {
    const heroName = (name || '').trim();
    if (!heroName || heroName.toLowerCase() === 'admin') return false;

    const snap = await getDocsFn(queryFn(
        collectionFn(dbRef, 'heroes'),
        whereFn('name', '==', heroName),
    ));
    return !snap.empty;
}

export async function authenticateHero(
    name,
    inputPassword,
    { dbRef = db, collectionFn = collection, queryFn = query, whereFn = where, getDocsFn = getDocs } = {},
) {
    const heroName = (name || '').trim();
    const password = (inputPassword || '').trim();
    if (!heroName || !password) throw new Error('Введіть ім\'я та пароль');

    const heroesQuery = queryFn(
        collectionFn(dbRef, 'heroes'),
        whereFn('name', '==', heroName),
    );
    const snap = await getDocsFn(heroesQuery);
    if (snap.empty) throw new Error('Героя не знайдено');

    const heroDoc = snap.docs.find((d) => {
        const pw = (d.data()?.password || DEFAULT_HERO_PASSWORD).trim();
        return pw === password;
    });
    if (!heroDoc) throw new Error('Невірний пароль');

    return { heroId: heroDoc.id, name: heroDoc.data().name };
}
