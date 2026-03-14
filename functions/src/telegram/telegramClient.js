export async function sendTelegramMessage({ token, chatId, text, messageThreadId }) {
  const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;
  const body = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML'
  };

  if (Number.isInteger(messageThreadId)) {
    body.message_thread_id = messageThreadId;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram API error ${response.status}: ${body}`);
  }
}

export async function setTelegramWebhook({ token, webhookUrl }) {
  const endpoint = `https://api.telegram.org/bot${token}/setWebhook`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl })
  });

  if (!response.ok) {
    throw new Error(`Failed to set webhook: ${await response.text()}`);
  }

  return response.json();
}
