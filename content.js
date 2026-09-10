chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'CLICK_SEND') {
        clickSendButton(sendResponse);
        return true; 
    }
});

function clickSendButton(sendResponse) {
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

    setTimeout(() => {
        clearInterval(tryClick);
        sendResponse({ status: 'timeout' });
    }, 10000);
}
