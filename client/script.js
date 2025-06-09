const form = document.getElementById('loginForm');
const statusEl = document.getElementById('status');
const passwordInput = document.getElementById('password');

let keyTimings = [];
let lastKeyTime = null;

// Captura o tempo entre as teclas digitadas no campo de senha
passwordInput.addEventListener('keydown', (e) => {
  const now = Date.now();

  if (lastKeyTime === null) {
    // Começo da digitação — salva 0 como primeiro tempo
    keyTimings.push(0);
  } else {
    const timeDiff = now - lastKeyTime;
    keyTimings.push(timeDiff);
  }

  lastKeyTime = now;
});

// Envio do formulário
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = passwordInput.value;

  try {
    const res = await fetch('http://localhost:3000/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password,
        timingData: keyTimings // envia o array com os tempos
      }),
    });

    const result = await res.json();

    if (res.ok) {
      statusEl.style.color = '#00ff88';
      statusEl.textContent = result.message;
      setTimeout(() => {
        window.location.href = 'welcome.html';
      }, 1000);
    } else {
      statusEl.style.color = '#ff5f5f';
      statusEl.textContent = result.message;
    }
  } catch (err) {
    statusEl.style.color = '#ff5f5f';
    statusEl.textContent = 'Erro ao conectar com o servidor.';
  }

  // Limpa os dados de digitação após o envio
  keyTimings = [];
  lastKeyTime = null;
});