import { firebaseConfig, appConfig } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    // Array local que armazena a fila de disparo
    let filaDeContatos = [];

    // Referências HTML
    const manualName = document.getElementById('manualName');
    const manualPhone = document.getElementById('manualPhone');
    const btnAddManual = document.getElementById('btnAddManual');
    
    const manualBulk = document.getElementById('manualBulk');
    const btnAddBulk = document.getElementById('btnAddBulk');
    
    const corpoTabela = document.getElementById('corpoTabela');
    const contadorFila = document.getElementById('contadorFila');
    
    const mensagemBase = document.getElementById('mensagemBase');
    const chkSalvarBD = document.getElementById('chkSalvarBD');
    const btnDisparar = document.getElementById('btnDisparar');
    const statusPainel = document.getElementById('statusPainel');

    // Função para atualizar a visualização da Tabela
    function renderizarTabela() {
        corpoTabela.innerHTML = '';
        filaDeContatos.forEach((contato, index) => {
            const tr = document.createElement('tr');
            
            const tdNome = document.createElement('td');
            tdNome.innerText = contato.nome;
            
            const tdTel = document.createElement('td');
            tdTel.innerText = contato.telefone;
            
            const tdAcao = document.createElement('td');
            const btnRemover = document.createElement('button');
            btnRemover.innerText = "X";
            btnRemover.className = "btn-remover";
            btnRemover.onclick = () => removerContato(index);
            tdAcao.appendChild(btnRemover);
            
            tr.appendChild(tdNome);
            tr.appendChild(tdTel);
            tr.appendChild(tdAcao);
            
            corpoTabela.appendChild(tr);
        });
        
        contadorFila.innerText = filaDeContatos.length;
    }

    function adicionarContato(nome, telefone) {
        const telLimpo = telefone.replace(/\D/g, '');
        if (nome && telLimpo) {
            filaDeContatos.push({ nome: nome.trim(), telefone: telLimpo });
        }
    }

    function removerContato(index) {
        filaDeContatos.splice(index, 1);
        renderizarTabela();
    }

    // ==========================================
    // EVENTOS DE INSERÇÃO
    // ==========================================
    
    btnAddManual.addEventListener('click', () => {
        if (!manualName.value || !manualPhone.value) {
            return alert("Preencha o Nome e o WhatsApp do contato.");
        }
        adicionarContato(manualName.value, manualPhone.value);
        renderizarTabela();
        
        manualName.value = '';
        manualPhone.value = '';
        manualName.focus();
    });

    btnAddBulk.addEventListener('click', () => {
        const texto = manualBulk.value.trim();
        if (!texto) return alert("Cole a lista no campo de texto.");
        
        const linhas = texto.split('\n');
        let adicionados = 0;
        
        linhas.forEach(linha => {
            const partes = linha.split(',');
            if (partes.length >= 2) {
                adicionarContato(partes[0], partes[1]);
                adicionados++;
            }
        });
        
        if (adicionados > 0) {
            renderizarTabela();
            manualBulk.value = '';
            alert(`${adicionados} contatos importados com sucesso!`);
        } else {
            alert("Nenhum contato válido encontrado. Use o formato: Nome, Telefone");
        }
    });

    // ==========================================
    // LÓGICA DE DISPARO E SALVAMENTO NO FIREBASE
    // ==========================================
    
    btnDisparar.addEventListener('click', async () => {
        if (filaDeContatos.length === 0) return alert('A fila de disparo está vazia.');
        
        const baseMsg = mensagemBase.value.trim();
        if (!baseMsg) return alert('Digite a Mensagem Base para a campanha.');

        btnDisparar.disabled = true;
        
        // Se a opção de backup estiver marcada, salva no Firebase
        if (chkSalvarBD.checked) {
            statusPainel.innerText = "Salvando novos contatos no banco de dados Firebase...";
            const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/${appConfig.COLLECTION_NAME}`;
            
            for (const cliente of filaDeContatos) {
                try {
                    const payload = {
                        fields: {
                            nome: { stringValue: cliente.nome },
                            telefone: { stringValue: cliente.telefone },
                            origem: { stringValue: "importacao_crm" }
                        }
                    };
                    await fetch(firestoreUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                } catch (error) {
                    console.error("Erro ao salvar cliente no banco: ", error);
                }
            }
        }

        // Envia a fila para o motor (background) disparar
        statusPainel.innerText = "Preparando a automação no WhatsApp...";
        
        chrome.runtime.sendMessage({
            action: 'START_CAMPAIGN',
            clientes: [...filaDeContatos], // Passa uma cópia do array
            mensagem: baseMsg
        });

        statusPainel.style.color = "#25D366";
        statusPainel.innerText = "Campanha INICIADA! Deixe a aba do WhatsApp aberta processando.";
        
        // Limpa a fila após engatilhar com sucesso
        filaDeContatos = [];
        renderizarTabela();
        setTimeout(() => { btnDisparar.disabled = false; }, 3000);
    });
});
