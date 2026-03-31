import admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { handleTelegramMessage } from './src/telegram/handlers.js';
import { pinTelegramMessage, sendTelegramMessage } from './src/telegram/telegramClient.js';
import { markUpdateProcessed } from './src/services/firestoreService.js';
import { validateTelegramUpdate } from './src/utils/validation.js';

admin.initializeApp();
const db = admin.firestore();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export const telegramWebhook = onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  if (!TELEGRAM_BOT_TOKEN) {
    console.error('Missing TELEGRAM_BOT_TOKEN env var');
    res.status(500).send('Server misconfigured');
    return;
  }
  let payload;
  try {
    payload = validateTelegramUpdate(req.body);

    const firstProcess = await markUpdateProcessed(db, payload.updateId, {
      messageId: payload.messageId,
      telegramUserId: payload.telegramUserId
    });

    if (!firstProcess) {
      res.status(200).send('Duplicate ignored');
      return;
    }

    const dcChangedMessages = [];
    const reply = await handleTelegramMessage({
      db,
      payload,
      onDcChanged: (message) => {
        if (message) {
          dcChangedMessages.push(message);
        }
      }
    });

    if (reply) {
      await sendTelegramMessage({
        token: TELEGRAM_BOT_TOKEN,
        chatId: payload.chatId,
        messageThreadId: payload.messageThreadId,
        text: reply
      });
    }

    for (const dcMessage of dcChangedMessages) {
      try {
        const sent = await sendTelegramMessage({
          token: TELEGRAM_BOT_TOKEN,
          chatId: payload.chatId,
          messageThreadId: payload.messageThreadId,
          text: dcMessage
        });

        if (sent?.message_id) {
          await pinTelegramMessage({
            token: TELEGRAM_BOT_TOKEN,
            chatId: payload.chatId,
            messageId: sent.message_id
          });
        }
      } catch (pinError) {
        console.warn('Failed to post/pin DC change message', pinError);
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook processing failed', error);

    if (payload?.chatId) {
      await sendTelegramMessage({
        token: TELEGRAM_BOT_TOKEN,
        chatId: payload.chatId,
        messageThreadId: payload.messageThreadId,
        text: 'Упс. Помилка. Щось пішло не так'
      });
    }

    res.status(200).send('Ignored');
  }
});
