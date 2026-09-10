import { firebaseConfig, appConfig } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    const btnStart = document.getElementById('btnStart');
    const statusText = document.getElementById('statusText');
    const messageInput = document.getElementById('message');

    btnStart.addEventListener('click', async () => {
        const baseMessage = messageInput.value.trim();
        
        if (!baseMessage) {
            alert('Por favor, digite uma mensagem.');
            return;
        }

        btnStart.disabled = true;
        statusText.innerText = "Conectando ao banco WeHave...";

        try {
            // Consulta REST ao Firestore do projeto wehave-v2
            const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/${appConfig.COLLECTION_NAME}`;
            
            const response = await fetch(firestoreUrl);
            if (!response.ok) {
                throw new Error('Falha ao ler o banco. O banco pode estar vazio ou as permissões do Firestore precisam liberar leitura pública ou autenticada.');
            }
            
            const data = await response.json();
            
            if (!data.documents || data.documents.length === 0) {
                statusText.innerText = `Nenhum cliente encontrado na tabela '${appConfig.COLLECTION_NAME}'.`;
                btnStart.disabled = false;
                return;
            }

            // Tratamento da estrutura de retorno do Firestore REST API
            const clientes = data.documents.map(doc => {
                const fields = doc.fields;
                return {
                    // Substitua 'nome' e 'telefone' se as suas colunas no banco tiverem nomes diferentes
                    nome: fields.nome ? fields.nome.stringValue : 'Cliente',
                    telefone: fields.telefone ? fields.telefone.stringValue.replace(/\D/g, '') : null
                };
            }).filter(c => c.telefone);

            if (clientes.length === 0) {
                statusText.innerText = "Nenhum cliente possui um telefone válido.";
                btnStart.disabled = false;
                return;
            }

            statusText.innerText = `Disparo engatilhado para ${clientes.length} contatos...`;

            chrome.runtime.sendMessage({
                action: 'START_CAMPAIGN',
                clientes: clientes,
                mensagem: baseMessage
            });

            statusText.innerText = `Campanha em andamento no WhatsApp! Pode fechar esta aba.`;

        } catch (error) {
            console.error(error);
            statusText.innerText = "Erro: " + error.message;
            btnStart.disabled = false;
        }
    });
});
