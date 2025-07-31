// middleware/auth.js
const jwt = require('jsonwebtoken'); // Importa jwt
const SECRET_KEY = 'sua_chave_secreta_aqui'; // Use a mesma chave do seu server.js

// Middleware de autenticação JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) {
        return res.sendStatus(401); // Sem token
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return res.sendStatus(403); // Token inválido ou expirado
        }
        req.user = user; // Anexa as informações do usuário ao objeto request
        next(); // Prossegue para a próxima função da rota
    });
};

// Middleware de autorização para ADMIN
const authorizeAdmin = (req, res, next) => {
    // req.user é populado pelo authenticateToken
    if (req.user && req.user.role === 'admin') {
        next(); // Usuário é admin, pode prosseguir
    } else {
        res.status(403).json({ message: 'Acesso negado. Requer privilégios de administrador.' }); // Não autorizado
    }
};

module.exports = {
    authenticateToken,
    authorizeAdmin,
    SECRET_KEY // Exporta a chave também se outros módulos precisarem (por exemplo, authRoutes)
};