const bcrypt = require('bcrypt');
const { compareKeystroke } = require('./keystroke');
const fs = require('fs');
const path = require('path');

const USERS_PATH = path.join(__dirname, 'users.json');

function loadUsers() {
  return JSON.parse(fs.readFileSync(USERS_PATH));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
}

async function authenticateUser(username, password, timingData, user) {
  console.log("Autenticando usuário:", username);

  const passwordMatch = await bcrypt.compare(password, user.password);
  console.log("Senha correta?", passwordMatch);

  if (!passwordMatch) {
    return { success: false, message: "Senha incorreta." };
  }

  if (!user.keystrokeSamples || user.keystrokeSamples.length === 0) {
    // Nenhuma amostra ainda: salvar primeira
    user.keystrokeSamples = [timingData];
    const users = loadUsers();
    const index = users.findIndex(u => u.username === username);
    users[index] = user;
    saveUsers(users);

    return { success: true, message: "Primeira amostra salva com sucesso!" };
  }

  console.log("Comparando timing data:");
  console.log("Digitado agora:", timingData);
  console.log("Samples salvos:", user.keystrokeSamples[0].length, "itens cada");

  const behaviorMatch = compareKeystroke(timingData, user.keystrokeSamples);
  console.log("Comportamento aceito?", behaviorMatch);

  if (!behaviorMatch) {
    return { success: false, message: "Padrão de digitação não reconhecido." };
  }

  // Se aceito, salva nova amostra (máx. 5)
  if (user.keystrokeSamples.length < 5) {
    user.keystrokeSamples.push(timingData);
    const users = loadUsers();
    const index = users.findIndex(u => u.username === username);
    users[index] = user;
    saveUsers(users);
  }

  return { success: true, message: "Login bem-sucedido!" };
}

module.exports = {
  authenticateUser
};