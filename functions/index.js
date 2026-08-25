const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');

admin.initializeApp();
setGlobalOptions({ region: 'southamerica-east1', maxInstances: 5 });

// Tenta "reservar" essa notificação de forma atômica.
// create() falha se o documento já existir -- só quem ganhar a corrida manda de verdade.
async function claim(key) {
  const ref = admin.firestore().collection('_notified').doc(key);
  try {
    await ref.create({
      at: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
    return ref;
  } catch (err) {
    return null; // já reservado por outra execução -- não notifica de novo
  }
}

function keyPart(value) {
  return String(value || 'evento').replace(/[^a-zA-Z0-9_-]/g, '').slice(-48) || 'evento';
}

exports.notifyTecnico = onDocumentWritten('clients/{clientId}', async (event) => {
  const clientId = event.params.clientId;
  const before = event.data.before.exists ? event.data.before.data() : null;
  const after = event.data.after.exists ? event.data.after.data() : null;
  if (!after || after.deleted) return;

  const beforeLayers = before?.layers || [];
  const afterLayers = after.layers || [];
  const candidates = [];

  // Nova visita: layer novo, aguardando avaliação
  if (afterLayers.length > beforeLayers.length) {
    const newIndex = afterLayers.length - 1;
    const newLayer = afterLayers[newIndex];
    if (newLayer && (newLayer.status === 'waiting' || newLayer.status === 'workshop_pending')) {
      candidates.push({
        key: `${clientId}_newvisit_${newIndex}_${keyPart(event.id)}`,
        title: '🆕 Nova visita',
        body: `${after.name || 'Cliente'} — ${newLayer.status === 'workshop_pending' ? 'equipamento na loja' : 'aguardando visita'}`
      });
    }
  }

  // Aprovação: algum relatório virou "approved" agora (antes não era)
  afterLayers.forEach((l, i) => {
    const prev = beforeLayers[i];
    if (l?.status === 'approved' && prev?.status !== 'approved') {
      candidates.push({
        key: `${clientId}_approved_${i}_${keyPart(event.id)}`,
        title: '✅ Orçamento aprovado',
        body: `${after.name || 'Cliente'} aprovou o orçamento — pode seguir com o serviço.`
      });
    }
  });

  if (!candidates.length) return;

  const settingsDoc = await admin.firestore().doc('settings/tecnico').get();
  const token = settingsDoc.exists ? settingsDoc.data().fcmToken : null;
  if (!token) {
    console.log('Sem token FCM salvo pro técnico ainda — nada pra notificar.');
    return;
  }

  for (const m of candidates) {
    const claimRef = await claim(m.key);
    if (!claimRef) continue;
    try {
      await admin.messaging().send({
        token,
        notification: { title: m.title, body: m.body },
        webpush: {
          fcmOptions: { link: 'https://mfcpecasservicos.github.io/mfc/' },
          notification: { icon: 'https://mfcpecasservicos.github.io/mfc/icon-192.png' }
        }
      });
    } catch (err) {
      console.error('Erro ao enviar notificação FCM:', err.message);
      await claimRef.delete().catch(deleteErr => console.error('Erro ao liberar tentativa de notificação:', deleteErr.message));
    }
  }
});
