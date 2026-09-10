// Configuração Oficial do Firebase para a Extensão
const firebaseConfig = {
    apiKey: "AIzaSyAx1iYDzWrgT3qU7D5uZHtcfihaNS0hA3M",
    authDomain: "wehave-v2.firebaseapp.com",
    projectId: "wehave-v2",
    storageBucket: "wehave-v2.firebasestorage.app",
    messagingSenderId: "22842171046",
    appId: "1:22842171046:web:ed1229d457e015e9061e67",
    measurementId: "G-Y3Q8QBPF1F"
};

const appConfig = {
    // Nome da tabela onde estão os contatos no Firestore (Ajuste se necessário)
    COLLECTION_NAME: "clientes", 
    // Configurações de segurança Anti-Ban (em milissegundos)
    DELAY_MIN: 3000,
    DELAY_MAX: 7000
};

export { firebaseConfig, appConfig };
