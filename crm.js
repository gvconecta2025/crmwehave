import { firebaseConfig, appConfig } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    let filaDeContatos = [];

    const manualName = document.getElementById('manualName');
    const manualPhone = document.getElementById('manualPhone');
    const btnAddManual = document.getElementById('btnAddManual');
    const manualBulk = document.getElementById('manualBulk');
    const btnAddBulk = document.getElementById('btnAddBulk');
    const corpoTabela = document.getElementById('corpoTabela');
    const contadorFila = document.getElementById('contadorFila');
    const mensagemBase = document.getElementById('mensagemBase');
    const chkSalvarBD = document.getElementById('chkSalvarBD');
    const containerSalvarBD = document.getElementById('containerSalvarBD');
    
    // Botões de Controle
    const btnDisparar = document.getElementById('btnDisparar');
    const btnPausar = document.getElementById('btnPausar');
    const btnRetomar = document.getElementById('btnRetomar');
    const btnCancelar = document.getElementById('btnCancelar');
    const statusPainel = document.getElementById('statusPainel');

    // Ao abrir, pergunta ao background se já existe uma campanha rodando
    chrome.runtime.sendMessage({ action: 'GET_STATUS' }, (response) => {
        if (response && response.state !== 'IDLE') {
            atualizarInterfacePorEstado(response.state, response.queueCount);
        }
    });

    // Escuta mensagens do background (atualizações de fila)
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'UPDATE_STATUS') {
            atualizarInterfacePorEstado(request.state, request.queueCount, request.message);
        }
    });

    function atualizarInterfacePorEstado(state, queueCount, msg = "") {
        if (msg) statusPainel.innerText = msg;
        contadorFila.innerText = queueCount;

        // Resetar botões
        btnDisparar.classList.add('escondido');
        btnPausar.classList.add('escondido');
        btnRetomar.classList.add('escondido');
        btnCancelar.classList.add('escondido');
        containerSalvarBD.classList.add('escondido');

        if (state === 'RUNNING') {
            btnPausar.classList.remove('escondido');
            btnCancelar.classList.remove('escondido');
            statusPainel.style.backgroundColor = "#d4edda";
            statusPainel.style.color = "#155724";
        } else if (state === 'PAUSED') {
            btnRetomar.classList.remove('escondido');
            btnCancelar.classList.remove('escondido');
            statusPainel.style.backgroundColor = "#fff3cd";
            statusPainel.style.color = "#856404";
        } else if (state === 'IDLE') {
            btnDisparar.classList.remove('escondido');
            containerSalvarBD.classList.remove('escondido');
            statusPainel.style.backgroundColor = "#e9ecef";
            statusPainel.style.color = "#383d41";
            renderizarTabela(); // Volta a mostrar a fila local se houver
        }
    }

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
            btnRemover.onclick = () => {
                filaDeContatos.splice(index, 1);
                renderizarTabela();
            };
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
        if (nome && telLimpo) filaDeContatos.push({ nome: nome.trim(), telefone: telLimpo });
    }

    btnAddManual.addEventListener('click', () => {
        if (!manualName.value || !manualPhone.value) return alert("Preencha Nome e WhatsApp.");
        adicionarContato(manualName.value, manualPhone.value);
        renderizarTabela();
        manualName.value = ''; manualPhone.value = ''; manualName.focus();
    });

    btnAddBulk.addEventListener('click', () => {
        const texto = manualBulk.value.trim();
        if (!texto) return alert("Cole a lista no campo.");
        const linhas = texto.split('\n');
        linhas.forEach(linha => {
            const partes = linha.split(',');
            if (partes.length >= 2) adicionarContato(partes[0], partes[1]);
        });
        renderizarTabela();
        manualBulk.value = '';
    });

    // Controles da Automação
    btnDisparar.addEventListener('click', async () => {
        if (filaDeContatos.length === 0) return alert('A fila está vazia.');
        const baseMsg = mensagemBase.value.trim();
        if (!baseMsg) return alert('Digite a Mensagem Base.');

        if (chkSalvarBD.checked) {
            statusPainel.innerText = "Salvando leads da WeHave no Firebase...";
            const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/${appConfig.COLLECTION_NAME}`;
            for (const cliente of filaDeContatos) {
                try {
                    const payload = { fields: { nome: { stringValue: cliente.nome }, telefone: { stringValue: cliente.telefone }, origem: { stringValue: "crm_wehave" } } };
                    await fetch(firestoreUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                } catch (e) { console.error("Erro Firebase", e); }
            }
        }

        chrome.runtime.sendMessage({ action: 'START_CAMPAIGN', clientes: [...filaDeContatos], mensagem: baseMsg });
        filaDeContatos = []; 
        renderizarTabela();
    });

    btnPausar.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'PAUSE_CAMPAIGN' });
    });

    btnRetomar.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'RESUME_CAMPAIGN' });
    });

    btnCancelar.addEventListener('click', () => {
        if (confirm("Tem certeza que deseja cancelar os disparos restantes?")) {
            chrome.runtime.sendMessage({ action: 'CANCEL_CAMPAIGN' });
        }
    });
});
