const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 3000;

const { authenticateUser } = require('./auth');

const USERS_FILE = path.join(__dirname, 'users.json');
const BLOCK_TIME_MINUTES = 5;

// Configurações do servidor
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// Configuração de envio de e-mail (substitua pelas suas credenciais)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'seuemail@gmail.com',
    pass: 'suasenha', // Recomendado usar variáveis de ambiente
  },
});

function sendAlertEmail(to, username) {
  const mailOptions = {
    from: 'seuemail@gmail.com',
    to,
    subject: 'Alerta de comportamento suspeito no login',
    text: `Olá ${username},\n\nDetectamos duas tentativas de login com um comportamento de digitação incomum. Seu acesso foi temporariamente bloqueado por segurança.\n\nEquipe de Segurança Digital.`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Erro ao enviar e-mail:', error);
    } else {
      console.log('E-mail de alerta enviado:', info.response);
    }
  });
}

// Rota de cadastro
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Dados incompletos para cadastro.' });
  }

  let users = [];
  if (fs.existsSync(USERS_FILE)) {
    users = JSON.parse(fs.readFileSync(USERS_FILE));
    if (users.find(u => u.username === username)) {
      return res.status(409).json({ message: 'Usuário já existe.' });
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    username,
    email,
    password: hashedPassword,
    keystrokeSamples: [],
    attemptCount: 0,
    loginAttempts: 0,
    blockedUntil: null,
  };

  users.push(newUser);
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

  res.status(201).json({ message: 'Usuário cadastrado com sucesso!' });
});

// Rota de login com análise de comportamento
app.post('/login', async (req, res) => {
  const { username, password, timingData } = req.body;

  if (!username || !password || !timingData) {
    return res.status(400).json({ message: 'Dados incompletos para login.' });
  }

  let users = JSON.parse(fs.readFileSync(USERS_FILE));
  const user = users.find(u => u.username === username);

  if (!user) {
    return res.status(401).json({ message: 'Usuário não encontrado.' });
  }

  if (user.blockedUntil && Date.now() < user.blockedUntil) {
    return res.status(403).json({ message: 'Usuário bloqueado. Tente novamente mais tarde.' });
  }

  const result = await authenticateUser(username, password, timingData, user);

  if (!result.success) {
    user.loginAttempts = (user.loginAttempts || 0) + 1;

    if (user.loginAttempts >= 2) {
      user.blockedUntil = Date.now() + BLOCK_TIME_MINUTES * 60 * 1000;
      sendAlertEmail(user.email, user.username);
    }

    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    return res.status(403).json({ message: result.message });
  }

  // Login bem-sucedido: resetar tentativas
  user.loginAttempts = 0;
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

  res.json({ message: result.message });
});

// Inicialização do servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});