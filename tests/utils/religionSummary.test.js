import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateReligionActions, buildReligionSummaryText } from '../../src/utils/religionSummary.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function action(actionTypeId, fields) {
  return { actionType: { id: actionTypeId }, ...fields };
}

const HEROES = new Map([
  ['h1', 'Марселін'],
  ['h2', 'Валеріан'],
  ['h3', 'Джеремайя'],
]);

const RELIGIONS = new Map([
  ['r-devil', 'Девіл'],
  ['r-blib', 'Блібдулпулп'],
  ['r-istishia', 'Істишія'],
]);

const EMPTY_HEROES = new Map();
const EMPTY_RELIGIONS = new Map();

// ---------------------------------------------------------------------------
// aggregateReligionActions — generate (faith farming)
// ---------------------------------------------------------------------------

test('generate action adds faith to hero', () => {
  const actions = [action('generate', { heroId: 'h1', faithGained: 40 })];
  const { faithByHero } = aggregateReligionActions(actions, HEROES, RELIGIONS);

  assert.equal(faithByHero.get('h1').faith, 40);
  assert.equal(faithByHero.get('h1').celestial, 0);
  assert.equal(faithByHero.get('h1').name, 'Марселін');
});

test('generate action with farmTarget=celestial adds to celestial, not faith', () => {
  const actions = [action('generate', { heroId: 'h3', faithGained: 28, farmTarget: 'celestial' })];
  const { faithByHero } = aggregateReligionActions(actions, HEROES, RELIGIONS);

  assert.equal(faithByHero.get('h3').faith, 0);
  assert.equal(faithByHero.get('h3').celestial, 28);
});

test('multiple generate actions for the same hero accumulate', () => {
  const actions = [
    action('generate', { heroId: 'h1', faithGained: 20 }),
    action('generate', { heroId: 'h1', faithGained: 20, farmTarget: 'celestial' }),
    action('generate', { heroId: 'h1', faithGained: 15 }),
  ];
  const { faithByHero } = aggregateReligionActions(actions, HEROES, RELIGIONS);

  assert.equal(faithByHero.get('h1').faith, 35);
  assert.equal(faithByHero.get('h1').celestial, 20);
});

test('generate action with gained=0 is skipped', () => {
  const actions = [action('generate', { heroId: 'h1', faithGained: 0 })];
  const { faithByHero } = aggregateReligionActions(actions, HEROES, RELIGIONS);

  assert.equal(faithByHero.size, 0);
});

test('generate action without heroId is skipped', () => {
  const actions = [action('generate', { faithGained: 10 })];
  const { faithByHero } = aggregateReligionActions(actions, HEROES, RELIGIONS);

  assert.equal(faithByHero.size, 0);
});

test('generate action falls back to heroId as name when not in map', () => {
  const actions = [action('generate', { heroId: 'unknown-hero', faithGained: 5 })];
  const { faithByHero } = aggregateReligionActions(actions, EMPTY_HEROES, EMPTY_RELIGIONS);

  assert.equal(faithByHero.get('unknown-hero').name, 'unknown-hero');
});

// ---------------------------------------------------------------------------
// aggregateReligionActions — influence (spread religion)
// ---------------------------------------------------------------------------

test('influence action with converted followers adds to source religion', () => {
  const actions = [action('influence', {
    religion: { id: 'r-blib' },
    targetReligion: { id: 'r-devil' },
    convertedFollowers: 12,
    shieldBroken: false,
  })];
  const { followersByReligion } = aggregateReligionActions(actions, HEROES, RELIGIONS);

  const entry = followersByReligion.get('r-blib');
  assert.equal(entry.gained, 12);
  assert.equal(entry.name, 'Блібдулпулп');
  assert.equal(entry.attackerName, 'Девіл');
});

test('influence action with converted=0 is skipped', () => {
  const actions = [action('influence', {
    religion: { id: 'r-blib' },
    targetReligion: { id: 'r-devil' },
    convertedFollowers: 0,
  })];
  const { followersByReligion } = aggregateReligionActions(actions, HEROES, RELIGIONS);

  assert.equal(followersByReligion.size, 0);
});

test('multiple influence actions from the same religion accumulate followers', () => {
  const actions = [
    action('influence', { religion: { id: 'r-devil' }, targetReligion: { id: 'r-blib' }, convertedFollowers: 10, shieldBroken: false }),
    action('influence', { religion: { id: 'r-devil' }, targetReligion: { id: 'r-blib' }, convertedFollowers: 7, shieldBroken: false }),
  ];
  const { followersByReligion } = aggregateReligionActions(actions, HEROES, RELIGIONS);

  assert.equal(followersByReligion.get('r-devil').gained, 17);
});

test('influence action with shieldBroken=true adds target religion to broken list', () => {
  const actions = [action('influence', {
    religion: { id: 'r-blib' },
    targetReligion: { id: 'r-devil' },
    convertedFollowers: 5,
    shieldBroken: true,
  })];
  const { shieldsBrokenNames } = aggregateReligionActions(actions, HEROES, RELIGIONS);

  assert.deepEqual(shieldsBrokenNames, ['Девіл']);
});

test('influence action with shieldBroken=false does not add to broken list', () => {
  const actions = [action('influence', {
    religion: { id: 'r-blib' },
    targetReligion: { id: 'r-devil' },
    convertedFollowers: 5,
    shieldBroken: false,
  })];
  const { shieldsBrokenNames } = aggregateReligionActions(actions, HEROES, RELIGIONS);

  assert.equal(shieldsBrokenNames.length, 0);
});

test('influence broken shield is deduplicated if same religion appears twice', () => {
  const actions = [
    action('influence', { religion: { id: 'r-blib' }, targetReligion: { id: 'r-devil' }, convertedFollowers: 5, shieldBroken: true }),
    action('influence', { religion: { id: 'r-istishia' }, targetReligion: { id: 'r-devil' }, convertedFollowers: 3, shieldBroken: true }),
  ];
  const { shieldsBrokenNames } = aggregateReligionActions(actions, HEROES, RELIGIONS);

  assert.deepEqual(shieldsBrokenNames, ['Девіл']);
});

test('influence falls back to religionId as name when not in map', () => {
  const actions = [action('influence', {
    religion: { id: 'r-unknown' },
    targetReligion: { id: 'r-also-unknown' },
    convertedFollowers: 5,
    shieldBroken: false,
  })];
  const { followersByReligion } = aggregateReligionActions(actions, EMPTY_HEROES, EMPTY_RELIGIONS);

  const entry = followersByReligion.get('r-unknown');
  assert.equal(entry.name, 'r-unknown');
  assert.equal(entry.attackerName, 'r-also-unknown');
});

test('influence with no targetReligion uses fallback attacker name', () => {
  const actions = [action('influence', {
    religion: { id: 'r-blib' },
    convertedFollowers: 5,
    shieldBroken: false,
  })];
  const { followersByReligion } = aggregateReligionActions(actions, HEROES, RELIGIONS);

  assert.equal(followersByReligion.get('r-blib').attackerName, '?');
});

// ---------------------------------------------------------------------------
// aggregateReligionActions — shield (defence)
// ---------------------------------------------------------------------------

test('shield action with bonus > 0 adds to shieldDefenses', () => {
  const actions = [action('shield', { religion: { id: 'r-devil' }, bonus: 4, shieldApplied: true })];
  const { shieldDefenses } = aggregateReligionActions(actions, HEROES, RELIGIONS);

  assert.equal(shieldDefenses.length, 1);
  assert.equal(shieldDefenses[0].name, 'Девіл');
  assert.equal(shieldDefenses[0].bonus, 4);
});

test('shield action with bonus=0 is skipped', () => {
  const actions = [action('shield', { religion: { id: 'r-devil' }, bonus: 0, shieldApplied: false })];
  const { shieldDefenses } = aggregateReligionActions(actions, HEROES, RELIGIONS);

  assert.equal(shieldDefenses.length, 0);
});

test('shield action without religionId is skipped', () => {
  const actions = [action('shield', { bonus: 4 })];
  const { shieldDefenses } = aggregateReligionActions(actions, HEROES, RELIGIONS);

  assert.equal(shieldDefenses.length, 0);
});

// ---------------------------------------------------------------------------
// aggregateReligionActions — unrelated action types
// ---------------------------------------------------------------------------

test('cycleStart and unknown action types are ignored', () => {
  const actions = [
    action('cycleStart', { notes: 'some notes', convertedFollowers: 0, result: 0 }),
    action('unknownType', { heroId: 'h1', value: 99 }),
  ];
  const { faithByHero, followersByReligion, shieldDefenses, shieldsBrokenNames } =
    aggregateReligionActions(actions, HEROES, RELIGIONS);

  assert.equal(faithByHero.size, 0);
  assert.equal(followersByReligion.size, 0);
  assert.equal(shieldDefenses.length, 0);
  assert.equal(shieldsBrokenNames.length, 0);
});

// ---------------------------------------------------------------------------
// buildReligionSummaryText — faith lines
// ---------------------------------------------------------------------------

test('faith-only hero renders correct line', () => {
  const faithByHero = new Map([['h1', { faith: 10, celestial: 0, name: 'Валеріан' }]]);
  const text = buildReligionSummaryText({
    faithByHero,
    followersByReligion: new Map(),
    shieldDefenses: [],
    shieldsBrokenNames: [],
    newCycleDate: '4 Eleasis 817',
  });

  assert.ok(text.includes('Валеріан +10 🙏'));
});

test('hero with both faith and celestial renders combined line', () => {
  const faithByHero = new Map([['h1', { faith: 40, celestial: 20, name: 'Марселін' }]]);
  const text = buildReligionSummaryText({
    faithByHero,
    followersByReligion: new Map(),
    shieldDefenses: [],
    shieldsBrokenNames: [],
    newCycleDate: '4 Eleasis 817',
  });

  assert.ok(text.includes('Марселін +40 🙏 та +20 віри в небожителя'));
});

test('celestial-only hero renders separate line without 🙏', () => {
  const faithByHero = new Map([['h3', { faith: 0, celestial: 28, name: 'Джеремайя' }]]);
  const text = buildReligionSummaryText({
    faithByHero,
    followersByReligion: new Map(),
    shieldDefenses: [],
    shieldsBrokenNames: [],
    newCycleDate: '4 Eleasis 817',
  });

  assert.ok(text.includes('Джеремайя +28 віри в небожителя'));
  assert.ok(!text.includes('🙏'));
});

test('faith heroes and celestial-only heroes are separated by blank line', () => {
  const faithByHero = new Map([
    ['h1', { faith: 40, celestial: 0, name: 'Марселін' }],
    ['h3', { faith: 0, celestial: 28, name: 'Джеремайя' }],
  ]);
  const text = buildReligionSummaryText({
    faithByHero,
    followersByReligion: new Map(),
    shieldDefenses: [],
    shieldsBrokenNames: [],
    newCycleDate: '4 Eleasis 817',
  });

  const lines = text.split('\n');
  const marcIdx = lines.findIndex((l) => l.includes('Марселін'));
  const jeremIdx = lines.findIndex((l) => l.includes('Джеремайя'));
  assert.equal(lines[marcIdx + 1], '', 'expected blank line between faith and celestial-only sections');
  assert.equal(jeremIdx, marcIdx + 2);
});

// ---------------------------------------------------------------------------
// buildReligionSummaryText — follower lines
// ---------------------------------------------------------------------------

test('follower line renders correctly', () => {
  const followersByReligion = new Map([
    ['r-blib', { gained: 12, name: 'Блібдулпулп', attackerName: 'Девіл' }],
  ]);
  const text = buildReligionSummaryText({
    faithByHero: new Map(),
    followersByReligion,
    shieldDefenses: [],
    shieldsBrokenNames: [],
    newCycleDate: '4 Eleasis 817',
  });

  assert.ok(text.includes('Конфесія Блібдулпулп +12 послідовників1⃣ (від Девіл)'));
});

test('faith section and follower section are separated by blank line', () => {
  const faithByHero = new Map([['h1', { faith: 10, celestial: 0, name: 'Валеріан' }]]);
  const followersByReligion = new Map([['r-blib', { gained: 12, name: 'Блібдулпулп', attackerName: 'Девіл' }]]);
  const text = buildReligionSummaryText({
    faithByHero,
    followersByReligion,
    shieldDefenses: [],
    shieldsBrokenNames: [],
    newCycleDate: '4 Eleasis 817',
  });

  const lines = text.split('\n');
  const faithIdx = lines.findIndex((l) => l.includes('Валеріан'));
  const followerIdx = lines.findIndex((l) => l.includes('Блібдулпулп'));
  assert.equal(lines[faithIdx + 1], '', 'expected blank line between faith and follower sections');
  assert.equal(followerIdx, faithIdx + 2);
});

// ---------------------------------------------------------------------------
// buildReligionSummaryText — shield defence and broken shields
// ---------------------------------------------------------------------------

test('shield defence line renders correctly', () => {
  const text = buildReligionSummaryText({
    faithByHero: new Map(),
    followersByReligion: new Map(),
    shieldDefenses: [{ name: 'Девіл', bonus: 4 }],
    shieldsBrokenNames: [],
    newCycleDate: '4 Eleasis 817',
  });

  assert.ok(text.includes('Захист віри конфесія Девіл +4 до стійкості 🧘'));
});

test('broken shields line renders correctly for one religion', () => {
  const text = buildReligionSummaryText({
    faithByHero: new Map(),
    followersByReligion: new Map(),
    shieldDefenses: [],
    shieldsBrokenNames: ['Девіл'],
    newCycleDate: '4 Eleasis 817',
  });

  assert.ok(text.includes('Захисти спали у: Девіл.'));
});

test('broken shields line joins multiple religions with та', () => {
  const text = buildReligionSummaryText({
    faithByHero: new Map(),
    followersByReligion: new Map(),
    shieldDefenses: [],
    shieldsBrokenNames: ['Блібдулпулп', 'Девіл'],
    newCycleDate: '4 Eleasis 817',
  });

  assert.ok(text.includes('Захисти спали у: Блібдулпулп та Девіл.'));
});

// ---------------------------------------------------------------------------
// buildReligionSummaryText — cycle announcement
// ---------------------------------------------------------------------------

test('cycle announcement appears as last line', () => {
  const text = buildReligionSummaryText({
    faithByHero: new Map(),
    followersByReligion: new Map(),
    shieldDefenses: [],
    shieldsBrokenNames: [],
    newCycleDate: '4 Eleasis 817 рік після Потопу',
  });

  const lines = text.split('\n');
  assert.equal(lines[lines.length - 1], 'Розпочався новий цикл 4 Eleasis 817 рік після Потопу — триває');
});

test('when no actions present, only cycle announcement line is produced', () => {
  const text = buildReligionSummaryText({
    faithByHero: new Map(),
    followersByReligion: new Map(),
    shieldDefenses: [],
    shieldsBrokenNames: [],
    newCycleDate: '1 Mirtul 817',
  });

  assert.equal(text, 'Розпочався новий цикл 1 Mirtul 817 — триває');
});

test('cycle announcement is preceded by blank line when there are other sections', () => {
  const faithByHero = new Map([['h1', { faith: 10, celestial: 0, name: 'Валеріан' }]]);
  const text = buildReligionSummaryText({
    faithByHero,
    followersByReligion: new Map(),
    shieldDefenses: [],
    shieldsBrokenNames: [],
    newCycleDate: '4 Eleasis 817',
  });

  const lines = text.split('\n');
  const lastLine = lines[lines.length - 1];
  const secondLastLine = lines[lines.length - 2];
  assert.equal(lastLine, 'Розпочався новий цикл 4 Eleasis 817 — триває');
  assert.equal(secondLastLine, '');
});

// ---------------------------------------------------------------------------
// Full integration: example message from spec
// ---------------------------------------------------------------------------

test('produces the expected Telegram message for a full cycle', () => {
  const actions = [
    action('generate', { heroId: 'h-martselin', faithGained: 40 }),
    action('generate', { heroId: 'h-martselin', faithGained: 20, farmTarget: 'celestial' }),
    action('generate', { heroId: 'h-valerian', faithGained: 10 }),
    action('generate', { heroId: 'h-kaeloris', faithGained: 10 }),
    action('generate', { heroId: 'h-dik', faithGained: 10 }),
    action('generate', { heroId: 'h-jeremiah', faithGained: 28, farmTarget: 'celestial' }),
    action('influence', { religion: { id: 'r-blib' }, targetReligion: { id: 'r-devil' }, convertedFollowers: 12, shieldBroken: true }),
    action('influence', { religion: { id: 'r-devil' }, targetReligion: { id: 'r-blib' }, convertedFollowers: 17, shieldBroken: true }),
    action('shield', { religion: { id: 'r-devil' }, bonus: 4 }),
  ];

  const heroes = new Map([
    ['h-martselin', 'Марселін'],
    ['h-valerian', 'Валеріан'],
    ['h-kaeloris', 'Каеларіс'],
    ['h-dik', 'Дік'],
    ['h-jeremiah', 'Джеремайя'],
  ]);
  const religions = new Map([
    ['r-devil', 'Девіл'],
    ['r-blib', 'Блібдулпулп'],
  ]);

  const { faithByHero, followersByReligion, shieldDefenses, shieldsBrokenNames } =
    aggregateReligionActions(actions, heroes, religions);
  const text = buildReligionSummaryText({
    faithByHero,
    followersByReligion,
    shieldDefenses,
    shieldsBrokenNames,
    newCycleDate: '4 Eleasis 817 рік після Потопу',
  });

  assert.ok(text.includes('Марселін +40 🙏 та +20 віри в небожителя'));
  assert.ok(text.includes('Валеріан +10 🙏'));
  assert.ok(text.includes('Каеларіс +10 🙏'));
  assert.ok(text.includes('Дік +10 🙏'));
  assert.ok(text.includes('Джеремайя +28 віри в небожителя'));
  assert.ok(text.includes('Конфесія Блібдулпулп +12 послідовників1⃣ (від Девіл)'));
  assert.ok(text.includes('Конфесія Девіл +17 послідовників1⃣ (від Блібдулпулп)'));
  assert.ok(text.includes('Захист віри конфесія Девіл +4 до стійкості 🧘'));
  assert.ok(text.includes('Захисти спали у:') && text.includes('Блібдулпулп') && text.includes('Девіл'));
  assert.ok(text.endsWith('Розпочався новий цикл 4 Eleasis 817 рік після Потопу — триває'));
});
