import CONFIG from './config.js';

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
        statusText.innerText = "Conectando ao Firebase...";

        try {
            // Consulta REST ao Firestore do Catálogo Online
            const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${CONFIG.FIREBASE_PROJECT_ID}/databases/(default)/documents/${CONFIG.COLLECTION_NAME}`;
            
            const response = await fetch(firestoreUrl);
            if (!response.ok) throw new Error('Falha ao acessar o banco de dados. Verifique o FIREBASE_PROJECT_ID.');
            
            const data = await response.json();
            
            if (!data.documents) {
                statusText.innerText = "Nenhum cliente encontrado.";
                btnStart.disabled = false;
                return;
            }

            // Mapeia e limpa os dados recebidos do Firestore
            const clientes = data.documents.map(doc => {
                const fields = doc.fields;
                return {
                    nome: fields.nome ? fields.nome.stringValue : 'Cliente',
                    telefone: fields.telefone ? fields.telefone.stringValue.replace(/\D/g, '') : null
                };
            }).filter(c => c.telefone); // Remove quem não tem telefone

            if (clientes.length === 0) {
                statusText.innerText = "Nenhum cliente com telefone válido.";
                btnStart.disabled = false;
                return;
            }

            statusText.innerText = `Preparando disparo para ${clientes.length} contatos...`;

            // Envia a lista para o background processar, permitindo fechar o popup
            chrome.runtime.sendMessage({
                action: 'START_CAMPAIGN',
                clientes: clientes,
                mensagem: baseMessage
            });

            statusText.innerText = `Campanha enviada para execução! Pode fechar esta janela.`;

        } catch (error) {
            console.error(error);
            statusText.innerText = "Erro: " + error.message;
            btnStart.disabled = false;
        }
    });
});
