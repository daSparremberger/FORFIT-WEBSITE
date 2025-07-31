// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db/db'); // CORREÇÃO APLICADA AQUI
const { SECRET_KEY, authenticateToken } = require('../middleware/auth');

// Rota de Registro
router.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Nome de usuário e senha são obrigatórios.' });
    }
    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, row) => {
        if (err) return res.status(500).json({ message: err.message });
        if (row) return res.status(409).json({ message: 'Nome de usuário já existe.' });

        bcrypt.hash(password, 10, (hashErr, hashedPassword) => {
            if (hashErr) return res.status(500).json({ message: 'Erro ao hash da senha.' });

            db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, 
                [username, hashedPassword, 'user'],
                function(insertErr) {
                    if (insertErr) return res.status(500).json({ message: insertErr.message });
                    const user = { id: this.lastID, username: username, role: 'user' };
                    const accessToken = jwt.sign(user, SECRET_KEY, { expiresIn: '1h' });
                    res.status(201).json({ message: 'Usuário registrado com sucesso!', accessToken: accessToken, user: user });
                }
            );
        });
    });
});

// Rota de Login
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Nome de usuário e senha são obrigatórios.' });
    }
    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
        if (err) return res.status(500).json({ message: err.message });
        if (!user) return res.status(400).json({ message: 'Credenciais inválidas.' });

        bcrypt.compare(password, user.password, (compareErr, isMatch) => {
            if (compareErr) return res.status(500).json({ message: 'Erro ao comparar senhas.' });
            if (!isMatch) return res.status(400).json({ message: 'Credenciais inválidas.' });

            const userPayload = { id: user.id, username: user.username, role: user.role };
            const accessToken = jwt.sign(userPayload, SECRET_KEY, { expiresIn: '1h' });
            res.status(200).json({ message: 'Login bem-sucedido!', accessToken: accessToken, user: userPayload });
        });
    });
});

// Exemplo de Rota Protegida
router.get('/protected', authenticateToken, (req, res) => {
    res.json({ message: `Bem-vindo, ${req.user.username}! Você é um ${req.user.role}.` });
});

module.exports = router;