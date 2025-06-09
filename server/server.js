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
const MAX_ATTEMPTS = 2;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'seuemail@gmail.com',
    pass: 'suasenha',
  },
});

function sendAlertEmail(to, username) {
  const mailOptions = {
    from: 'seuemail@gmail.com',
    to,
    subject: 'Alerta de comportamento suspeito no login',
    text: `Olá ${username},\n\nDetectamos tentativas de login com comportamento de digitação incomum. Seu acesso foi temporariamente bloqueado por segurança.\n\nEquipe de Segurança.`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Erro ao enviar e-mail:', error);
    } else {
      console.log('E-mail de alerta enviado:', info.response);
    }
  });
}

function loadUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) return [];
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Erro ao ler arquivo de usuários:', error);
    return [];
  }
}

function saveUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Erro ao salvar arquivo de usuários:', error);
  }
}

// Cadastro
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Dados incompletos para cadastro.' });
  }

  const users = loadUsers();

  if (users.find(u => u.username === username)) {
    return res.status(409).json({ message: 'Usuário já existe.' });
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
  saveUsers(users);

  res.status(201).json({ message: 'Usuário cadastrado com sucesso!' });
});

// Login
app.post('/login', async (req, res) => {
  const { username, password, timingData = [], hadCorrection = false } = req.body;

  const users = loadUsers();
  const userIndex = users.findIndex(u => u.username === username);

  if (userIndex === -1) {
    return res.status(401).json({ message: 'Usuário não encontrado.' });
  }

  const user = users[userIndex];

  if (user.blockedUntil && Date.now() < user.blockedUntil) {
    return res.status(403).json({ message: 'Usuário bloqueado. Tente novamente mais tarde.' });
  }

  if (!Array.isArray(timingData)) {
    return res.status(400).json({ message: 'Dados de digitação inválidos.' });
  }

  const result = await authenticateUser(username, password, timingData, hadCorrection, user);

  // Atualiza usuário no array após autenticação (pois authenticateUser pode alterar user)
  users[userIndex] = user;
  saveUsers(users);

  if (!result.success) {
    user.loginAttempts = (user.loginAttempts || 0) + 1;

    if (user.loginAttempts >= MAX_ATTEMPTS) {
      user.blockedUntil = Date.now() + BLOCK_TIME_MINUTES * 60 * 1000;
      sendAlertEmail(user.email, user.username);
      saveUsers(users);
      return res.status(403).json({ message: 'Comportamento suspeito. Usuário bloqueado por 5 minutos.' });
    }

    saveUsers(users);
    return res.status(403).json({ message: result.message });
  }

  // Login bem-sucedido
  user.loginAttempts = 0;
  user.attemptCount = (user.attemptCount || 0) + 1;
  saveUsers(users);

  return res.json({ message: result.message });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});