// routes/promotionRoutes.js
const express = require('express');
const router = express.Router();
const { db } = require('../db/db'); // Garante que a importação está correta
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');

// --- ROTAS DE GERENCIAMENTO DE PROMOÇÕES (APENAS ADMIN) ---

// POST /api/admin/promotions - Criar nova promoção
router.post('/', authenticateToken, authorizeAdmin, (req, res) => {
    // Adicionado 'photo_url'
    const { title, description, discount_percentage, discount_amount, start_date, end_date, photo_url, product_ids_with_quantities } = req.body;

    if (!title || (!discount_percentage && !discount_amount)) {
        return res.status(400).json({ message: 'Título e um tipo de desconto (porcentagem ou valor) são obrigatórios.' });
    }

    // Adicionado 'photo_url' no INSERT
    db.run(`INSERT INTO promotions (title, description, discount_percentage, discount_amount, start_date, end_date, photo_url) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [title, description, discount_percentage, discount_amount, start_date, end_date, photo_url],
        function(err) {
            if (err) {
                return res.status(500).json({ message: err.message });
            }
            const promotionId = this.lastID;

            if (product_ids_with_quantities && Array.isArray(product_ids_with_quantities) && product_ids_with_quantities.length > 0) {
                const insertStmt = db.prepare(`INSERT INTO promotion_products (promotion_id, product_id, quantity_in_promotion) VALUES (?, ?, ?)`);
                product_ids_with_quantities.forEach(item => {
                    insertStmt.run(promotionId, item.product_id, item.quantity_in_promotion || 1);
                });
                insertStmt.finalize((finalizeErr) => {
                    if (finalizeErr) {
                        console.error('Erro ao inserir produtos na promoção:', finalizeErr.message);
                        return res.status(500).json({ message: 'Promoção criada, mas erro ao associar produtos.' });
                    }
                    res.status(201).json({ message: 'Promoção e produtos associados com sucesso!', promotionId: promotionId });
                });
            } else {
                res.status(201).json({ message: 'Promoção criada com sucesso!', promotionId: promotionId });
            }
        }
    );
});

// GET /api/admin/promotions - Listar todas as promoções
router.get('/', authenticateToken, authorizeAdmin, (req, res) => {
    db.all(`SELECT * FROM promotions`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: err.message });
        }
        res.status(200).json(rows);
    });
});

// GET /api/admin/promotions/:id - Obter detalhes de uma promoção (com produtos)
router.get('/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const { id } = req.params;
    db.get(`SELECT * FROM promotions WHERE id = ?`, [id], (err, promotion) => {
        if (err) return res.status(500).json({ message: err.message });
        if (!promotion) return res.status(404).json({ message: 'Promoção não encontrada.' });

        db.all(`SELECT pp.product_id, pp.quantity_in_promotion, p.title, p.price, p.photo_url, p.cost_price 
                FROM promotion_products pp
                JOIN products p ON pp.product_id = p.id
                WHERE pp.promotion_id = ?`, [id], (err, products) => {
            if (err) return res.status(500).json({ message: err.message });
            promotion.products = products;
            res.status(200).json(promotion);
        });
    });
});

// PUT /api/admin/promotions/:id - Atualizar uma promoção
router.put('/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const { id } = req.params;
    // Adicionado 'photo_url'
    const { title, description, discount_percentage, discount_amount, start_date, end_date, photo_url, is_active, product_ids_with_quantities } = req.body;

    if (!title || (!discount_percentage && !discount_amount) || is_active === undefined) {
        return res.status(400).json({ message: 'Título, tipo de desconto e status ativo são obrigatórios.' });
    }

    // Adicionado 'photo_url' no UPDATE
    db.run(`UPDATE promotions SET 
                title = ?, description = ?, discount_percentage = ?, discount_amount = ?, 
                start_date = ?, end_date = ?, photo_url = ?, is_active = ?
            WHERE id = ?`,
        [title, description, discount_percentage, discount_amount, start_date, end_date, photo_url, is_active, id],
        function(err) {
            if (err) return res.status(500).json({ message: err.message });
            if (this.changes === 0) return res.status(404).json({ message: 'Promoção não encontrada ou nenhum dado alterado.' });

            db.run(`DELETE FROM promotion_products WHERE promotion_id = ?`, [id], (deleteErr) => {
                if (deleteErr) {
                    console.error('Erro ao deletar produtos antigos:', deleteErr.message);
                    return res.status(500).json({ message: 'Promoção atualizada, mas erro ao atualizar produtos.' });
                }

                if (product_ids_with_quantities && Array.isArray(product_ids_with_quantities) && product_ids_with_quantities.length > 0) {
                    const insertStmt = db.prepare(`INSERT INTO promotion_products (promotion_id, product_id, quantity_in_promotion) VALUES (?, ?, ?)`);
                    product_ids_with_quantities.forEach(item => {
                        insertStmt.run(id, item.product_id, item.quantity_in_promotion || 1);
                    });
                    insertStmt.finalize((finalizeErr) => {
                        if (finalizeErr) {
                            console.error('Erro ao inserir novos produtos:', finalizeErr.message);
                            return res.status(500).json({ message: 'Promoção atualizada, mas erro ao associar novos produtos.' });
                        }
                        res.status(200).json({ message: 'Promoção e produtos associados atualizados com sucesso!' });
                    });
                } else {
                    res.status(200).json({ message: 'Promoção atualizada com sucesso (sem produtos associados).' });
                }
            });
        }
    );
});

// PATCH /api/admin/promotions/:id/toggle-active - Ativar/desativar
router.patch('/:id/toggle-active', authenticateToken, authorizeAdmin, (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;
    if (is_active === undefined || ![0, 1].includes(is_active)) {
        return res.status(400).json({ message: 'O valor de is_active deve ser 0 (inativo) ou 1 (ativo).' });
    }
    db.run(`UPDATE promotions SET is_active = ? WHERE id = ?`, [is_active, id], function(err) {
        if (err) return res.status(500).json({ message: err.message });
        if (this.changes === 0) return res.status(404).json({ message: 'Promoção não encontrada ou status já era o mesmo.' });
        res.status(200).json({ message: `Promoção ${is_active ? 'ativada' : 'desativada'} com sucesso!` });
    });
});


// DELETE /api/admin/promotions/:id - Deletar uma promoção
router.delete('/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM promotions WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ message: err.message });
        if (this.changes === 0) return res.status(404).json({ message: 'Promoção não encontrada.' });
        res.status(200).json({ message: 'Promoção deletada com sucesso.' });
    });
});

// --- ROTAS PÚBLICAS DE PROMOÇÕES (para o carrossel) ---

// GET /api/promotions/public - Listar promoções ATIVAS
router.get('/public', (req, res) => {
    db.all(`SELECT * FROM promotions WHERE is_active = 1`, [], (err, rows) => {
        if (err) return res.status(500).json({ message: err.message });
        res.status(200).json(rows);
    });
});

// GET /api/promotions/public/:id - Obter detalhes de uma promoção ATIVA
router.get('/public/:id', (req, res) => {
    const { id } = req.params;
    db.get(`SELECT * FROM promotions WHERE id = ? AND is_active = 1`, [id], (err, promotion) => {
        if (err) return res.status(500).json({ message: err.message });
        if (!promotion) return res.status(404).json({ message: 'Promoção não encontrada ou inativa.' });

        db.all(`SELECT pp.product_id, pp.quantity_in_promotion, p.title, p.price, p.photo_url 
                FROM promotion_products pp
                JOIN products p ON pp.product_id = p.id
                WHERE pp.promotion_id = ?`, [id], (err, products) => {
            if (err) return res.status(500).json({ message: err.message });
            promotion.products = products;
            res.status(200).json(promotion);
        });
    });
});

module.exports = router;