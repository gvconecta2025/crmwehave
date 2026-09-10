chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'CLICK_SEND') {
        clickSendButton(sendResponse);
        return true; // Mantém a porta de resposta aberta
    }
});

function clickSendButton(sendResponse) {
    // Tenta encontrar o botão de enviar do WhatsApp
    // O WhatsApp muda essas classes, mas o ícone 'send' é mais estável
    const tryClick = setInterval(() => {
        const sendIcon = document.querySelector('span[data-icon="send"]');
        
        if (sendIcon) {
            const sendButton = sendIcon.closest('button');
            if (sendButton) {
                sendButton.click();
                clearInterval(tryClick);
                sendResponse({ status: 'sent' });
            }
        }
    }, 1000);

    // Desiste após 10 tentativas para não travar o loop
    setTimeout(() => {
        clearInterval(tryClick);
        sendResponse({ status: 'timeout' });
    }, 10000);
}
