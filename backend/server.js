// backend/server.js (Arquivo Principal Modularizado)
const express = require('express');
const path = require('path');
const fs = require('fs');

const db = require('./db/db'); 

// Importa os middlewares de autenticação/autorização
const { authenticateToken, authorizeAdmin } = require('./middleware/auth');

// Importa as rotas modularizadas
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const promotionRoutes = require('./routes/promotionRoutes');
const imageRoutes = require('./routes/imageRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const ingredientRoutes = require('./routes/ingredientRoutes');
const dietaryRestrictionRoutes = require('./routes/dietaryRestrictionRoutes');
const orderAdminRoutes = require('./routes/orderAdminRoutes');


const app = express();
const port = 3000;

app.use(express.json());

// Configuração para servir arquivos estáticos (para as imagens uploaded)
// path.join(__dirname, 'uploads') está correto, pois 'uploads' está dentro de 'backend'
const uploadDir = path.join(__dirname, 'uploads'); 
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static(uploadDir)); // Serve arquivos da pasta 'uploads'


// Middleware para CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Conecta as rotas modularizadas
// IMPORTANTE: A ordem das rotas importa! Rotas mais específicas devem vir antes de rotas mais genéricas.
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes); 

app.use('/api/admin/products', productRoutes); 
// Mapeia /api/products/public para as rotas públicas de produto, que estão no productRoutes.js
app.use('/api/products', productRoutes); 

app.use('/api/admin/promotions', promotionRoutes);
// Mapeia /api/promotions/public para as rotas públicas de promoção, que estão no promotionRoutes.js
app.use('/api/promotions', promotionRoutes); 

app.use('/api/admin/images', imageRoutes);
app.use('/api/admin/categories', categoryRoutes);
app.use('/api/admin/ingredients', ingredientRoutes);
app.use('/api/admin/dietary-restrictions', dietaryRestrictionRoutes);
app.use('/api/admin/orders', orderAdminRoutes);


// Rota de teste simples para verificar se o backend está online
app.get('/', (req, res) => {
    res.send('Backend da ForFit está funcionando (modularizado)!');
});

// Iniciar o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});