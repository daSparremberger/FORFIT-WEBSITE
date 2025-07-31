// routes/orderAdminRoutes.js
const express = require('express');
const router = express.Router();
const { db } = require('../db/db'); // Importa a instância do banco de dados
const { authenticateToken, authorizeAdmin } = require('../middleware/auth'); // Importa os middlewares

// GET /api/admin/orders - Listar todos os pedidos (para admin)
router.get('/', authenticateToken, authorizeAdmin, (req, res) => {
    db.all(`SELECT o.*, u.username 
            FROM orders o
            JOIN users u ON o.user_id = u.id
            ORDER BY o.order_date DESC`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: err.message });
        }
        res.status(200).json(rows);
    });
});

// GET /api/admin/orders/:id - Obter detalhes de um pedido específico (para admin)
router.get('/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const { id } = req.params;

    db.get(`SELECT o.*, u.username, 
                   ua.street, ua.number, ua.complement, ua.neighborhood, ua.city, ua.state, ua.zip_code,
                   upm.method_type, upm.card_brand, upm.last_four_digits
            FROM orders o
            JOIN users u ON o.user_id = u.id
            LEFT JOIN user_addresses ua ON o.delivery_address_id = ua.id
            LEFT JOIN user_payment_methods upm ON o.payment_method_id = upm.id
            WHERE o.id = ?`, [id], (err, order) => {
        if (err) {
            return res.status(500).json({ message: err.message });
        }
        if (!order) {
            return res.status(404).json({ message: 'Pedido não encontrado.' });
        }

        db.all(`SELECT oi.product_id, oi.quantity, oi.price_at_order, p.title, p.photo_url 
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = ?`, [id], (err, items) => {
            if (err) {
                return res.status(500).json({ message: err.message });
            }
            order.items = items;
            res.status(200).json(order);
        });
    });
});

// PATCH /api/admin/orders/:id/status - Atualizar status de um pedido (para admin)
router.patch('/:id/status', authenticateToken, authorizeAdmin, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['pending', 'processing', 'completed', 'cancelled'];
    if (!status || !allowedStatuses.includes(status)) {
        return res.status(400).json({ message: `Status inválido. Status permitidos: ${allowedStatuses.join(', ')}.` });
    }

    db.run(`UPDATE orders SET status = ? WHERE id = ?`,
        [status, id],
        function(err) {
            if (err) {
                return res.status(500).json({ message: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Pedido não encontrado ou status já era o mesmo.' });
            }
            res.status(200).json({ message: `Status do pedido ${id} atualizado para "${status}".` });
        }
    );
});


// GET /api/admin/billing/monthly - Relatório de faturamento mensal
router.get('/billing/monthly', authenticateToken, authorizeAdmin, (req, res) => {
    const sql = `
        SELECT
            strftime('%Y-%m', order_date) AS month,
            SUM(total_amount) AS total_revenue
        FROM orders
        WHERE status = 'completed'
        GROUP BY month
        ORDER BY month ASC;
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: err.message });
        }
        res.status(200).json(rows);
    });
});

module.exports = router;