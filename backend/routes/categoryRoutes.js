// routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const { db } = require('../db/db'); // Importa a instância do banco de dados
const { authenticateToken, authorizeAdmin } = require('../middleware/auth'); // Importa os middlewares

// GET /api/admin/categories - Listar todas as categorias principais com suas subcategorias
router.get('/', authenticateToken, authorizeAdmin, (req, res) => {
    db.all(`SELECT * FROM categories ORDER BY order_index ASC`, [], (err, categories) => {
        if (err) {
            return res.status(500).json({ message: err.message });
        }

        const categoryPromises = categories.map(category => {
            return new Promise((resolve, reject) => {
                db.all(`SELECT * FROM subcategories WHERE category_id = ? ORDER BY order_index ASC`, [category.id], (err, subcategories) => {
                    if (err) {
                        return reject(err);
                    }
                    category.subcategories = subcategories;
                    resolve(category);
                });
            });
        });

        Promise.all(categoryPromises)
            .then(results => res.status(200).json(results))
            .catch(error => res.status(500).json({ message: error.message }));
    });
});

// POST /api/admin/categories - Criar nova categoria principal
router.post('/', authenticateToken, authorizeAdmin, (req, res) => {
    const { name, order_index } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'Nome da categoria é obrigatório.' });
    }
    db.run(`INSERT INTO categories (name, order_index) VALUES (?, ?)`, [name, order_index || 0], function(err) {
        if (err) {
            if (err.message.includes('SQLITE_CONSTRAINT_UNIQUE')) {
                return res.status(409).json({ message: 'Categoria já existe.' });
            }
            return res.status(500).json({ message: err.message });
        }
        res.status(201).json({ message: 'Categoria criada com sucesso!', categoryId: this.lastID });
    });
});

// PUT /api/admin/categories/:id - Atualizar categoria principal
router.put('/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const { id } = req.params;
    const { name, order_index } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'Nome da categoria é obrigatório.' });
    }
    db.run(`UPDATE categories SET name = ?, order_index = ? WHERE id = ?`, [name, order_index || 0, id], function(err) {
        if (err) {
            if (err.message.includes('SQLITE_CONSTRAINT_UNIQUE')) {
                return res.status(409).json({ message: 'Categoria já existe.' });
            }
            return res.status(500).json({ message: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Categoria não encontrada ou nenhum dado alterado.' });
        }
        res.status(200).json({ message: 'Categoria atualizada com sucesso!' });
    });
});

// DELETE /api/admin/categories/:id - Deletar categoria principal
router.delete('/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM categories WHERE id = ?`, [id], function(err) {
        if (err) {
            return res.status(500).json({ message: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Categoria não encontrada.' });
        }
        res.status(200).json({ message: 'Categoria deletada com sucesso (e subcategorias associadas).' });
    });
});


// POST /api/admin/subcategories - Criar nova subcategoria
router.post('/subcategories', authenticateToken, authorizeAdmin, (req, res) => {
    const { category_id, name, order_index } = req.body;
    if (!category_id || !name) {
        return res.status(400).json({ message: 'ID da categoria e nome da subcategoria são obrigatórios.' });
    }
    db.run(`INSERT INTO subcategories (category_id, name, order_index) VALUES (?, ?, ?)`, [category_id, name, order_index || 0], function(err) {
        if (err) {
            if (err.message.includes('SQLITE_CONSTRAINT_UNIQUE')) {
                return res.status(409).json({ message: 'Subcategoria já existe nesta categoria.' });
            }
            return res.status(500).json({ message: err.message });
        }
        res.status(201).json({ message: 'Subcategoria criada com sucesso!', subcategoryId: this.lastID });
    });
});

// PUT /api/admin/subcategories/:id - Atualizar subcategoria
router.put('/subcategories/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const { id } = req.params;
    const { category_id, name, order_index } = req.body;
    if (!category_id || !name) {
        return res.status(400).json({ message: 'ID da categoria e nome da subcategoria são obrigatórios.' });
    }
    db.run(`UPDATE subcategories SET category_id = ?, name = ?, order_index = ? WHERE id = ?`, [category_id, name, order_index || 0, id], function(err) {
        if (err) {
            if (err.message.includes('SQLITE_CONSTRAINT_UNIQUE')) {
                return res.status(409).json({ message: 'Subcategoria já existe nesta categoria.' });
            }
            return res.status(500).json({ message: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Subcategoria não encontrada ou nenhum dado alterado.' });
        }
        res.status(200).json({ message: 'Subcategoria atualizada com sucesso!' });
    });
});

// DELETE /api/admin/subcategories/:id - Deletar subcategoria
router.delete('/subcategories/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM subcategories WHERE id = ?`, [id], function(err) {
        if (err) {
            return res.status(500).json({ message: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Subcategoria não encontrada.' });
        }
        res.status(200).json({ message: 'Subcategoria deletada com sucesso.' });
    });
});

module.exports = router;