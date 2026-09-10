import { appConfig } from './config.js';

let campaignState = 'IDLE'; // Estados possíveis: IDLE, RUNNING, PAUSED
let queue = [];
let baseMessage = "";
let whatsappTabId = null;

chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: chrome.runtime.getURL("crm.html") });
});

function broadcastStatus(message) {
    chrome.runtime.sendMessage({
        action: 'UPDATE_STATUS',
        state: campaignState,
        queueCount: queue.length,
        message: message
    }).catch(() => {}); // Ignora erro se o painel estiver fechado
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GET_STATUS') {
        sendResponse({ state: campaignState, queueCount: queue.length });
    }
    else if (request.action === 'START_CAMPAIGN') {
        queue = request.clientes;
        baseMessage = request.mensagem;
        campaignState = 'RUNNING';
        broadcastStatus("Iniciando disparos da WeHave...");
        startCampaign();
    }
    else if (request.action === 'PAUSE_CAMPAIGN') {
        campaignState = 'PAUSED';
        broadcastStatus(`⏸ Automação Pausada. Restam ${queue.length} contatos.`);
    }
    else if (request.action === 'RESUME_CAMPAIGN') {
        campaignState = 'RUNNING';
        broadcastStatus("▶ Retomando disparos...");
        processNextClient();
    }
    else if (request.action === 'CANCEL_CAMPAIGN') {
        campaignState = 'IDLE';
        queue = [];
        broadcastStatus("⏹ Campanha cancelada pelo usuário.");
    }
    return true;
});

async function startCampaign() {
    const tabs = await chrome.tabs.query({ url: "*://web.whatsapp.com/*" });
    
    if (tabs.length === 0) {
        const newTab = await chrome.tabs.create({ url: "https://web.whatsapp.com/" });
        whatsappTabId = newTab.id;
        campaignState = 'PAUSED';
        broadcastStatus("⚠️ WhatsApp Web não encontrado. Abrindo aba e pausando fila. Conecte-se e clique em Retomar.");
        return;
    } else {
        whatsappTabId = tabs[0].id;
    }

    processNextClient();
}

async function processNextClient() {
    if (campaignState !== 'RUNNING') return;

    if (queue.length === 0) {
        campaignState = 'IDLE';
        broadcastStatus("✅ Campanha finalizada com sucesso!");
        return;
    }

    const cliente = queue.shift();
    broadcastStatus(`Enviando para ${cliente.nome}... (Restam ${queue.length})`);

    const mensagemPersonalizada = baseMessage.replace('{{nome}}', cliente.nome);
    const encodedMessage = encodeURIComponent(mensagemPersonalizada);
    const targetUrl = `https://web.whatsapp.com/send?phone=${cliente.telefone}&text=${encodedMessage}`;
    
    await chrome.tabs.update(whatsappTabId, { url: targetUrl });

    setTimeout(() => {
        if (campaignState !== 'RUNNING') {
            // Se pausou durante o carregamento da aba, devolve o cliente pro início da fila
            queue.unshift(cliente);
            broadcastStatus(`⏸ Pausado antes de enviar para ${cliente.nome}.`);
            return;
        }

        chrome.tabs.sendMessage(whatsappTabId, { action: 'CLICK_SEND' }, (response) => {
            const delay = Math.floor(Math.random() * (appConfig.DELAY_MAX - appConfig.DELAY_MIN + 1)) + appConfig.DELAY_MIN;
            broadcastStatus(`✔️ Enviado para ${cliente.nome}. Pausa de segurança humana de ${(delay/1000).toFixed(1)}s.`);
            
            setTimeout(() => {
                if (campaignState === 'RUNNING') processNextClient();
            }, delay);
        });
    }, 7000); 
}
