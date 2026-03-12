# WestIslandsApp

## Frontend app
- `npm run dev` - run local web app

## Telegram Fishing Bot (Firebase Cloud Functions)
Production-lean MVP webhook bot implementation is in `functions/`.

### 1) Install and deploy
```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

### 2) Environment variables
Copy `functions/.env.example` and set values:
```bash
cp functions/.env.example functions/.env
```
Required:
- `TELEGRAM_BOT_TOKEN`

### 3) Webhook setup
After deploy, set Telegram webhook to the function URL:
```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://<region>-<project-id>.cloudfunctions.net/telegramWebhook"}'
```

### 4) Firestore collections

#### `bot-configs/fishing` example
```json
{
  "modifierLimits": { "min": -20, "max": 20 },
  "dc": { "mainCatch": 45, "additionalCheckDc": 10 },
  "quantityRules": [
    { "minSum": 65, "quantity": 3 },
    { "minSum": 55, "quantity": 2 },
    { "minSum": 45, "quantity": 1 }
  ],
  "guidance": { "enabled": true, "diceSides": 4, "applyTo": "lowest_roll" },
  "bait": {
    "basic": { "enabled": true, "bonusDieSides": 0 },
    "simple": { "enabled": true, "bonusDieSides": 4 },
    "advanced": { "enabled": true, "bonusDieSides": 6 }
  },
  "fishSelection": {
    "strategy": "random",
    "maxDistinctFishPerRun": 3,
    "skipUnavailable": true,
    "allowDuplicates": false
  }
}
```

#### `fishes` example documents
```json
{
  "fishName": "Silver Perch",
  "fishDescription": "Fast river fish.",
  "fishCodeNumber": 101,
  "fishValueSilver": 7,
  "fishAdditionalRollsRequiredForSuccessfulCatch": 0,
  "fishAmountDaily": 20,
  "fishAmountAvailableNow": 20
}
```

```json
{
  "fishName": "Storm Pike",
  "fishDescription": "Rare deep-water predator.",
  "fishCodeNumber": 208,
  "fishValueSilver": 30,
  "fishAdditionalRollsRequiredForSuccessfulCatch": 2,
  "fishAmountDaily": 3,
  "fishAmountAvailableNow": 3
}
```

#### `fishing-logs` fields captured
- `telegramUserId`
- `command`
- `rawEnteredParams`
- `normalizedParams`
- `d20RawRolls`
- `modifiers`
- `finalRollValues`
- `guidanceData`
- `baitUsed`
- `baitBonusRoll`
- `finalComputedSum`
- `dcChecksPerformed`
- `successFailureResult`
- `fishSelected`
- `fishQuantityCaught`
- `fishAvailabilityChanges`
- `extraCheckResults`
- `timestamp`

### 5) Sample conversation
```
User: /fish
Bot: Fishing started... Enter modifier for roll 1 (integer).
User: 2
Bot: Enter modifier for roll 2 (integer).
User: -1
Bot: Enter modifier for roll 3 (integer).
User: 4
Bot: Optional: add `guidance` token to enable guidance.
User: guidance
Bot: Choose bait: basic, simple, advanced.
User: advanced
Bot: 🎣 Fishing result
     Modifiers: 2, -1, 4
     Raw rolls: 11, 3, 18
     Final rolls: 13, 7, 22
     Guidance: +4 (lowest_roll)
     Bait: advanced
     Bait bonus: +6
     Final sum: 48
     Main DC 45: PASS
     Catch count: 1
     1. Silver Perch (#101) - Fast river fish.
```

### 6) Command shortcuts
Inline one-message format is supported:
```
/fish <mod1> <mod2> <mod3> [guidance] [basic|simple|advanced] [ship]
```
Example:
```
/fish 2 -1 4 guidance simple
```

### 7) Daily reset readiness
Fish schema includes both:
- `fishAmountDaily`
- `fishAmountAvailableNow`

This supports a future scheduled refill job to reset `fishAmountAvailableNow = fishAmountDaily`.
