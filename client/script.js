const form = document.getElementById('loginForm');
const statusEl = document.getElementById('status');
const passwordInput = document.getElementById('password');

let keyTimings = [];
let lastKeyTime = null;
let hadCorrection = false; // flag para detectar correção

// Captura o tempo entre as teclas digitadas no campo de senha
passwordInput.addEventListener('keydown', (e) => {
  const now = Date.now();

  if (e.key === 'Backspace') {
    hadCorrection = true; // usuário corrigiu a senha
    if (keyTimings.length > 0) {
      keyTimings.pop(); // remove o último intervalo
    }
    lastKeyTime = now;
    return;
  }

  if (lastKeyTime !== null) {
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
        timingData: keyTimings,
        hadCorrection
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

  // Limpa os dados de digitação e flag após o envio
  keyTimings = [];
  lastKeyTime = null;
  hadCorrection = false;
});