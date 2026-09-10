import { appConfig } from './config.js';

let isRunning = false;
let queue = [];
let baseMessage = "";
let whatsappTabId = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'START_CAMPAIGN') {
        queue = request.clientes;
        baseMessage = request.mensagem;
        
        if (!isRunning) {
            startCampaign();
        }
    }
});

async function startCampaign() {
    isRunning = true;
    
    const tabs = await chrome.tabs.query({ url: "*://web.whatsapp.com/*" });
    
    if (tabs.length === 0) {
        const newTab = await chrome.tabs.create({ url: "https://web.whatsapp.com/" });
        whatsappTabId = newTab.id;
        console.log("Abra o WhatsApp Web e reinicie a campanha.");
        isRunning = false;
        return;
    } else {
        whatsappTabId = tabs[0].id;
    }

    processNextClient();
}

async function processNextClient() {
    if (queue.length === 0) {
        isRunning = false;
        console.log("✅ CRM WeHave: Campanha finalizada com sucesso!");
        return;
    }

    const cliente = queue.shift();
    const mensagemPersonalizada = baseMessage.replace('{{nome}}', cliente.nome);
    const encodedMessage = encodeURIComponent(mensagemPersonalizada);
    
    const targetUrl = `https://web.whatsapp.com/send?phone=${cliente.telefone}&text=${encodedMessage}`;
    
    await chrome.tabs.update(whatsappTabId, { url: targetUrl });

    setTimeout(() => {
        chrome.tabs.sendMessage(whatsappTabId, { action: 'CLICK_SEND' }, (response) => {
            const delay = Math.floor(Math.random() * (appConfig.DELAY_MAX - appConfig.DELAY_MIN + 1)) + appConfig.DELAY_MIN;
            console.log(`Mensagem enviada para ${cliente.nome}. Aguardando delay...`);
            setTimeout(processNextClient, delay);
        });
    }, 7000); 
}
