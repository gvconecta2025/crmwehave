import { firebaseConfig, appConfig } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    // Referências - Lote
    const btnBatch = document.getElementById('btnBatch');
    const statusBatch = document.getElementById('statusBatch');
    const messageBatch = document.getElementById('messageBatch');

    // Referências - Manual
    const btnManual = document.getElementById('btnManual');
    const statusManual = document.getElementById('statusManual');
    const manualName = document.getElementById('manualName');
    const manualPhone = document.getElementById('manualPhone');
    const messageManual = document.getElementById('messageManual');
    const saveToFirebase = document.getElementById('saveToFirebase');

    // Mudar texto do botão dinamicamente
    saveToFirebase.addEventListener('change', (e) => {
        btnManual.innerText = e.target.checked ? "Disparar e Salvar no Firebase" : "Apenas Disparar";
    });

    // ==========================================
    // LÓGICA DE DISPARO EM LOTE (FIREBASE)
    // ==========================================
    btnBatch.addEventListener('click', async () => {
        const baseMessage = messageBatch.value.trim();
        if (!baseMessage) return alert('Digite a mensagem da campanha.');

        btnBatch.disabled = true;
        statusBatch.innerText = "Lendo banco WeHave...";

        try {
            const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/${appConfig.COLLECTION_NAME}`;
            const response = await fetch(firestoreUrl);
            if (!response.ok) throw new Error('Falha de leitura. Verifique as regras do Firebase.');
            
            const data = await response.json();
            if (!data.documents || data.documents.length === 0) {
                statusBatch.innerText = "Nenhum cliente encontrado.";
                btnBatch.disabled = false;
                return;
            }

            const clientes = data.documents.map(doc => {
                const fields = doc.fields;
                return {
                    nome: fields.nome ? fields.nome.stringValue : 'Cliente',
                    telefone: fields.telefone ? fields.telefone.stringValue.replace(/\D/g, '') : null
                };
            }).filter(c => c.telefone);

            chrome.runtime.sendMessage({ action: 'START_CAMPAIGN', clientes: clientes, mensagem: baseMessage });
            statusBatch.innerText = `Lote enviado! Acompanhe a aba do WhatsApp.`;

        } catch (error) {
            statusBatch.innerText = "Erro: " + error.message;
            btnBatch.disabled = false;
        }
    });

    // ==========================================
    // LÓGICA DE DISPARO MANUAL
    // ==========================================
    btnManual.addEventListener('click', async () => {
        const nome = manualName.value.trim();
        const telefone = manualPhone.value.replace(/\D/g, '');
        const msg = messageManual.value.trim();

        if (!nome || !telefone || !msg) {
            return alert('Preencha Nome, WhatsApp e Mensagem.');
        }

        btnManual.disabled = true;
        statusManual.innerText = "Processando...";

        // Salvar no Firebase se selecionado
        if (saveToFirebase.checked) {
            statusManual.innerText = "Salvando no Firebase...";
            try {
                const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/${appConfig.COLLECTION_NAME}`;
                
                const payload = {
                    fields: {
                        nome: { stringValue: nome },
                        telefone: { stringValue: telefone },
                        origem: { stringValue: "disparo_manual" }
                    }
                };

                const res = await fetch(firestoreUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) throw new Error('Permissão negada para salvar. Verifique a regra "allow create" no Firebase.');
                statusManual.innerText = "Cliente salvo!";
            } catch (error) {
                statusManual.innerText = "Erro ao salvar: " + error.message;
                btnManual.disabled = false;
                return;
            }
        }

        // Enviar para o orquestrador (background)
        chrome.runtime.sendMessage({
            action: 'START_CAMPAIGN',
            clientes: [{ nome: nome, telefone: telefone }],
            mensagem: msg
        });

        statusManual.innerText = "Disparo acionado no WhatsApp!";
        setTimeout(() => { btnManual.disabled = false; }, 3000);
    });
});
