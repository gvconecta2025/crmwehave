import CONFIG from './config.js';

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
    
    // Procura uma aba do WhatsApp Web aberta
    const tabs = await chrome.tabs.query({ url: "*://web.whatsapp.com/*" });
    
    if (tabs.length === 0) {
        // Se não tiver, abre uma nova
        const newTab = await chrome.tabs.create({ url: "https://web.whatsapp.com/" });
        whatsappTabId = newTab.id;
        console.log("Abra o WhatsApp Web, leia o QR Code e reinicie a campanha.");
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
        console.log("✅ Campanha finalizada com sucesso!");
        return;
    }

    const cliente = queue.shift();
    const mensagemPersonalizada = baseMessage.replace('{{nome}}', cliente.nome);
    const encodedMessage = encodeURIComponent(mensagemPersonalizada);
    
    // Atualiza a URL da aba do WhatsApp para abrir a conversa já com o texto
    const targetUrl = `https://web.whatsapp.com/send?phone=${cliente.telefone}&text=${encodedMessage}`;
    
    await chrome.tabs.update(whatsappTabId, { url: targetUrl });

    // Aguarda o WhatsApp Web carregar a interface de chat
    setTimeout(() => {
        // Envia o comando para o content.js clicar no botão de enviar
        chrome.tabs.sendMessage(whatsappTabId, { action: 'CLICK_SEND' }, (response) => {
            // Calcula o delay aleatório anti-ban e passa para o próximo
            const delay = Math.floor(Math.random() * (CONFIG.DELAY_MAX - CONFIG.DELAY_MIN + 1)) + CONFIG.DELAY_MIN;
            console.log(`Mensagem injetada para ${cliente.nome}. Aguardando ${delay/1000}s...`);
            setTimeout(processNextClient, delay);
        });
    }, 7000); // 7 segundos é o tempo seguro para o WhatsApp Web carregar os scripts na troca de URL
}
