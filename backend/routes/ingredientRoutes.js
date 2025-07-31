// routes/ingredientRoutes.js
const express = require('express');
const router = express.Router();
const { db } = require('../db/db'); // Importa a instância do banco de dados
const { authenticateToken, authorizeAdmin } = require('../middleware/auth'); // Importa os middlewares

// GET /api/admin/ingredients - Listar todos os ingredientes (com busca opcional)
router.get('/', authenticateToken, authorizeAdmin, (req, res) => {
    const { search } = req.query;
    let sql = `SELECT id, name FROM ingredients`; // Retorna id e name
    const params = [];
    if (search) {
        sql += ` WHERE name LIKE ?`;
        params.push(`%${search}%`);
    }
    sql += ` ORDER BY name ASC`;

    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ message: err.message });
        }
        res.status(200).json(rows);
    });
});

// POST /api/admin/ingredients - Adicionar um novo ingrediente (se não existir)
router.post('/', authenticateToken, authorizeAdmin, (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'Nome do ingrediente é obrigatório.' });
    }
    db.run(`INSERT OR IGNORE INTO ingredients (name) VALUES (?)`, [name], function(err) {
        if (err) {
            return res.status(500).json({ message: err.message });
        }
        if (this.changes === 0) { // Significa que já existia e não inseriu
            db.get(`SELECT id, name FROM ingredients WHERE name = ?`, [name], (err, row) => {
                if (err) return res.status(500).json({ message: err.message });
                res.status(200).json({ message: 'Ingrediente já existe e foi retornado.', ingredient: row }); 
            });
        } else {
            res.status(201).json({ message: 'Ingrediente adicionado com sucesso!', ingredient: { id: this.lastID, name: name } }); 
        }
    });
});

module.exports = router;