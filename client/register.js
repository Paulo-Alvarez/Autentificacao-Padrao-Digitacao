const form = document.getElementById('registerForm');
const status = document.getElementById('registerStatus');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

  if (!strongPasswordRegex.test(password)) {
    status.style.color = '#ff5f5f';
    status.textContent = 'A senha deve conter letras maiúsculas, minúsculas, número e símbolo.';
    return;
  }

  if (password !== confirmPassword) {
    status.style.color = '#ff5f5f';
    status.textContent = 'As senhas não coincidem.';
    return;
  }

  try {
    const res = await fetch('https://autentificador-api.onrender.com/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        email,
        password,
        keystrokeProfile: [] // como o backend espera isso, mandamos como array vazio
      }),
    });

    const result = await res.json();

    if (res.ok) {
      status.style.color = '#00ff88';
      status.textContent = result.message;
      setTimeout(() => window.location.href = 'index.html', 1500);
    } else {
      status.style.color = '#ff5f5f';
      status.textContent = result.message;
    }
  } catch (err) {
    status.style.color = '#ff5f5f';
    status.textContent = 'Erro ao conectar com o servidor.';
  }
});

// Função para alternar exibição da senha
function togglePassword(fieldId, button) {
  const input = document.getElementById(fieldId);
  if (input.type === 'password') {
    input.type = 'text';
    button.textContent = '🙈';
  } else {
    input.type = 'password';
    button.textContent = '👁';
  }
}