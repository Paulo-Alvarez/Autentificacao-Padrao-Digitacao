const bcrypt = require('bcrypt');
const { compareKeystrokeDetailed, calculateDistance, THRESHOLD } = require('./keystroke');
const fs = require('fs');
const path = require('path');

const USERS_PATH = path.join(__dirname, 'users.json');

function loadUsers() {
  try {
    if (!fs.existsSync(USERS_PATH)) return [];
    const data = fs.readFileSync(USERS_PATH);
    return JSON.parse(data);
  } catch (err) {
    console.error('Erro ao carregar usuários:', err);
    return [];
  }
}

function saveUsers(users) {
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
}

function averageTimings(samples) {
  if (samples.length === 0) return [];
  const len = samples[0].length;
  const avg = Array(len).fill(0);
  samples.forEach(sample => {
    for (let i = 0; i < len; i++) {
      avg[i] += sample[i];
    }
  });
  return avg.map(v => v / samples.length);
}

async function authenticateUser(username, password, timingData, hadCorrection, user) {
  console.log("Autenticando usuário:", username);

  const passwordMatch = await bcrypt.compare(password, user.password);
  console.log("Senha correta?", passwordMatch);

  if (!passwordMatch) {
    return { success: false, message: "Senha incorreta." };
  }

  const users = loadUsers();
  const index = users.findIndex(u => u.username === username);

  user.keystrokeSamples = user.keystrokeSamples || [];

  // Se ainda estiver coletando as 10 amostras iniciais
  if (user.keystrokeSamples.length < 10) {
    if (hadCorrection) {
      console.log("Correção detectada, amostra NÃO salva.");
      users[index] = user;
      saveUsers(users);
      return {
        success: true,
        message: `Correção detectada, amostra não contabilizada. Amostras atuais: ${user.keystrokeSamples.length}/10`
      };
    }

    user.keystrokeSamples.push(timingData);
    users[index] = user;
    saveUsers(users);

    return {
      success: true,
      message: `Amostra de digitação ${user.keystrokeSamples.length}/10 registrada com sucesso.`
    };
  }

  // Após coletar 10 amostras, vamos comparar com detalhes
  console.log("Comparando timing data:");
  console.log("Digitado agora:", timingData);

  const expectedLength = user.keystrokeSamples[0].length;
  if (timingData.length !== expectedLength) {
    const msg = `Tamanho dos dados diferente do esperado. Esperado: ${expectedLength}, recebido: ${timingData.length}`;
    console.log(msg);
    return { success: false, message: msg };
  }

  const avgTimings = averageTimings(user.keystrokeSamples);
  console.log("Média das amostras salvas:", avgTimings);

  const dist = calculateDistance(timingData, avgTimings);
  console.log(`Distância da amostra atual para a média: ${dist.toFixed(3)}`);
  console.log(`Limite permitido (threshold): ${THRESHOLD}`);

  if (dist > THRESHOLD * 2) {
    return {
      success: false,
      message: `Diferença de digitação muito grande. Acesso negado. (Distância: ${dist.toFixed(3)})`
    };
  }

  const result = compareKeystrokeDetailed(timingData, user.keystrokeSamples);
  console.log("Comportamento aceito?", result.accepted);
  console.log("Motivo:", result.reason);

  if (!result.accepted) {
    return { success: false, message: result.reason };
  }

  // Se aceito, atualiza as amostras: mantém as últimas 10
  user.keystrokeSamples.push(timingData);
  if (user.keystrokeSamples.length > 10) {
    user.keystrokeSamples.shift();
  }

  users[index] = user;
  saveUsers(users);

  return { success: true, message: "Login bem-sucedido!" };
}

module.exports = {
  authenticateUser
};