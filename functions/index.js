const { onDocumentWritten, onDocumentUpdated } = require('firebase-functions/v2/firestore');
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

// Cliente confirmou o pin em localizacao.html (?token=...): propaga para o cadastro dele.
// O cliente só tem permissão para escrever no próprio documento de locationRequests;
// esta função roda com privilégio de admin e é quem de fato atualiza clients/{clientId}.
exports.applyLocationConfirmation = onDocumentUpdated('locationRequests/{token}', async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (!after || before?.used === true || after.used !== true) return;

  const clientId = after.clientId;
  const lat = after.confirmedLatitude;
  const lng = after.confirmedLongitude;
  if (!clientId || typeof lat !== 'number' || typeof lng !== 'number') return;

  const now = new Date().toISOString();
  const accuracy = typeof after.confirmedAccuracy === 'number' ? after.confirmedAccuracy : null;
  const source = after.confirmedSource === 'gps' ? 'gps' : 'manual';

  try {
    await admin.firestore().doc(`clients/${clientId}`).update({
      latitude: lat,
      longitude: lng,
      locationAccuracy: accuracy,
      locationProvided: true,
      locationConfirmed: true,
      locationSource: source,
      locationConfirmedAt: now,
      location: { latitude: lat, longitude: lng, accuracy, provided: true, confirmed: true, source, confirmedAt: now },
      locationRequestToken: admin.firestore.FieldValue.delete(),
      updatedAt: now
    });
  } catch (err) {
    console.error('Erro ao aplicar localização confirmada pelo cliente:', err.message);
  }
});
