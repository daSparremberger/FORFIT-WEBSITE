// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { db } = require('../db/db'); // Importa a instância do banco de dados
const { authenticateToken } = require('../middleware/auth'); // Importa o middleware de autenticação

// GET /api/user/profile - Obter informações do perfil do usuário logado (cliente ou admin)
router.get('/profile', authenticateToken, (req, res) => {
    db.get(`SELECT id, username, role FROM users WHERE id = ?`, [req.user.id], (err, user) => {
        if (err) {
            return res.status(500).json({ message: err.message });
        }
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        const userProfile = {
            id: user.id,
            username: user.username,
            email: user.username, // Assumindo username como email para a ForFit
            role: user.role
        };
        res.status(200).json(userProfile);
    });
});

// PUT /api/user/profile - Atualizar informações do perfil (qualquer usuário autenticado)
router.put('/profile', authenticateToken, (req, res) => {
    const { username, password } = req.body;
    const userId = req.user.id;

    if (!username && !password) {
        return res.status(400).json({ message: 'Nenhum dado para atualizar fornecido.' });
    }

    let updates = [];
    let params = [];
    let sql = `UPDATE users SET `;

    if (username) {
        updates.push(`username = ?`);
        params.push(username);
    }
    if (password) {
        // Importar bcrypt aqui para hash de senha
        const bcrypt = require('bcryptjs'); 
        bcrypt.hash(password, 10, (hashErr, hashedPassword) => {
            if (hashErr) {
                return res.status(500).json({ message: 'Erro ao hash da nova senha.' });
            }
            updates.push(`password = ?`);
            params.push(hashedPassword);
            
            sql += updates.join(', ') + ` WHERE id = ?`;
            params.push(userId);

            db.run(sql, params, function(err) {
                if (err) {
                    if (err.message.includes('SQLITE_CONSTRAINT_UNIQUE')) {
                        return res.status(409).json({ message: 'Nome de usuário já existe.' });
                    }
                    return res.status(500).json({ message: err.message });
                }
                if (this.changes === 0) {
                    return res.status(404).json({ message: 'Usuário não encontrado ou nenhum dado alterado.' });
                }
                res.status(200).json({ message: 'Perfil atualizado com sucesso!' });
            });
        });
    } else {
        sql += updates.join(', ') + ` WHERE id = ?`;
        params.push(userId);

        db.run(sql, params, function(err) {
            if (err) {
                if (err.message.includes('SQLITE_CONSTRAINT_UNIQUE')) {
                    return res.status(409).json({ message: 'Nome de usuário já existe.' });
                }
                return res.status(500).json({ message: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Usuário não encontrado ou nenhum dado alterado.' });
            }
            res.status(200).json({ message: 'Perfil atualizado com sucesso!' });
        });
    }
});


// GET /api/user/addresses - Listar endereços do usuário logado
router.get('/addresses', authenticateToken, (req, res) => {
    const userId = req.user.id;
    db.all(`SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC`, [userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: err.message });
        }
        res.status(200).json(rows);
    });
});

// POST /api/user/addresses - Adicionar novo endereço para o usuário logado
router.post('/addresses', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { street, number, complement, neighborhood, city, state, zip_code, is_default } = req.body;

    if (!street || !city || !state || !zip_code) {
        return res.status(400).json({ message: 'Rua, cidade, estado e CEP são obrigatórios para o endereço.' });
    }

    db.run(`INSERT INTO user_addresses (user_id, street, number, complement, neighborhood, city, state, zip_code, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, street, number, complement, neighborhood, city, state, zip_code, is_default ? 1 : 0],
        function(err) {
            if (err) {
                return res.status(500).json({ message: err.message });
            }
            res.status(201).json({ message: 'Endereço adicionado com sucesso!', addressId: this.lastID });
        }
    );
});

// PUT /api/user/addresses/:id - Atualizar endereço existente do usuário logado
router.put('/addresses/:id', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { street, number, complement, neighborhood, city, state, zip_code, is_default } = req.body;

    if (!street || !city || !state || !zip_code || is_default === undefined) {
        return res.status(400).json({ message: 'Todos os campos obrigatórios do endereço devem ser fornecidos para atualização.' });
    }

    db.run(`UPDATE user_addresses SET 
                street = ?, 
                number = ?, 
                complement = ?, 
                neighborhood = ?, 
                city = ?, 
                state = ?, 
                zip_code = ?, 
                is_default = ?
            WHERE id = ? AND user_id = ?`,
        [street, number, complement, neighborhood, city, state, zip_code, is_default ? 1 : 0, id, userId],
        function(err) {
            if (err) {
                return res.status(500).json({ message: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Endereço não encontrado ou não pertence a este usuário, ou nenhum dado alterado.' });
            }
            res.status(200).json({ message: 'Endereço atualizado com sucesso!' });
        }
    );
});

// DELETE /api/user/addresses/:id - Remover endereço do usuário logado
router.delete('/addresses/:id', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    db.run(`DELETE FROM user_addresses WHERE id = ? AND user_id = ?`, [id, userId], function(err) {
        if (err) {
            return res.status(500).json({ message: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Endereço não encontrado ou não pertence a este usuário.' });
        }
        res.status(200).json({ message: 'Endereço deletado com sucesso.' });
    });
});


// GET /api/user/payment-methods - Listar formas de pagamento do usuário logado
router.get('/payment-methods', authenticateToken, (req, res) => {
    const userId = req.user.id;
    db.all(`SELECT id, card_type, card_brand, last_four_digits, method_type, is_default FROM user_payment_methods WHERE user_id = ? ORDER BY is_default DESC, id DESC`, [userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: err.message });
        }
        res.status(200).json(rows);
    });
});

// POST /api/user/payment-methods - Adicionar nova forma de pagamento para o usuário logado
router.post('/payment-methods', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { card_type, card_brand, last_four_digits, tokenized_data, method_type, is_default } = req.body;

    if (!method_type) {
        return res.status(400).json({ message: 'O tipo de método de pagamento é obrigatório.' });
    }

    db.run(`INSERT INTO user_payment_methods (user_id, card_type, card_brand, last_four_digits, tokenized_data, method_type, is_default) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, card_type, card_brand, last_four_digits, tokenized_data, method_type, is_default ? 1 : 0],
        function(err) {
            if (err) {
                return res.status(500).json({ message: err.message });
            }
            res.status(201).json({ message: 'Forma de pagamento adicionada com sucesso!', paymentMethodId: this.lastID });
        }
    );
});

// DELETE /api/user/payment-methods/:id - Remover forma de pagamento do usuário logado
router.delete('/payment-methods/:id', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    db.run(`DELETE FROM user_payment_methods WHERE id = ? AND user_id = ?`, [id, userId], function(err) {
        if (err) {
            return res.status(500).json({ message: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Forma de pagamento não encontrada ou não pertence a este usuário.' });
        }
        res.status(200).json({ message: 'Forma de pagamento deletada com sucesso.' });
    });
});


// GET /api/user/orders - Listar pedidos do usuário logado
router.get('/orders', authenticateToken, (req, res) => {
    const userId = req.user.id;
    db.all(`SELECT * FROM orders WHERE user_id = ? ORDER BY order_date DESC`, [userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: err.message });
        }
        res.status(200).json(rows);
    });
});

// GET /api/user/orders/:id - Obter detalhes de um pedido específico do usuário logado
router.get('/orders/:id', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    db.get(`SELECT * FROM orders WHERE id = ? AND user_id = ?`, [id, userId], (err, order) => {
        if (err) {
            return res.status(500).json({ message: err.message });
        }
        if (!order) {
            return res.status(404).json({ message: 'Pedido não encontrado ou não pertence a este usuário.' });
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

// POST /api/user/orders - Criar um novo pedido (Cliente comum)
router.post('/orders', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { items, delivery_address_id, payment_method_id } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'É necessário fornecer os itens do pedido.' });
    }
    if (!delivery_address_id || !payment_method_id) {
        return res.status(400).json({ message: 'Endereço de entrega e forma de pagamento são obrigatórios.' });
    }

    let totalAmount = 0;
    const orderItems = [];

    try {
        for (const item of items) {
            const product = await new Promise((resolve, reject) => {
                db.get(`SELECT id, price, quantity FROM products WHERE id = ? AND is_active = 1`, [item.product_id], (err, row) => {
                    if (err) reject(err);
                    else if (!row) reject(new Error(`Produto com ID ${item.product_id} não encontrado ou inativo.`));
                    else if (row.quantity < item.quantity) reject(new Error(`Quantidade insuficiente para o produto ${row.title}.`));
                    else resolve(row);
                });
            });
            totalAmount += product.price * item.quantity;
            orderItems.push({
                product_id: item.product_id,
                quantity: item.quantity,
                price_at_order: product.price
            });
        }
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION;');

        db.run(`INSERT INTO orders (user_id, total_amount, delivery_address_id, payment_method_id, status) VALUES (?, ?, ?, ?, ?)`,
            [userId, totalAmount, delivery_address_id, payment_method_id, 'pending'],
            function(insertOrderErr) {
                if (insertOrderErr) {
                    db.run('ROLLBACK;');
                    return res.status(500).json({ message: insertOrderErr.message });
                }
                const orderId = this.lastID;

                const insertItemStmt = db.prepare(`INSERT INTO order_items (order_id, product_id, quantity, price_at_order) VALUES (?, ?, ?, ?)`);
                const updateProductStmt = db.prepare(`UPDATE products SET quantity = quantity - ? WHERE id = ?`);

                let allItemsInserted = true;
                orderItems.forEach(item => {
                    insertItemStmt.run(orderId, item.product_id, item.quantity, item.price_at_order);
                    updateProductStmt.run(item.quantity, item.product_id);
                });

                insertItemStmt.finalize((finalizeErr) => {
                    if (finalizeErr) {
                        allItemsInserted = false;
                        console.error('Erro ao inserir itens do pedido:', finalizeErr.message);
                    }
                });
                updateProductStmt.finalize((finalizeErr) => {
                    if (finalizeErr) {
                        allItemsInserted = false;
                        console.error('Erro ao atualizar estoque do produto:', finalizeErr.message);
                    }
                });

                if (allItemsInserted) {
                    db.run('COMMIT;', (commitErr) => {
                        if (commitErr) {
                            console.error('Erro ao commitar transação:', commitErr.message);
                            return res.status(500).json({ message: 'Erro ao finalizar o pedido.' });
                        }
                        res.status(201).json({ message: 'Pedido realizado com sucesso!', orderId: orderId, total: totalAmount });
                    });
                } else {
                    db.run('ROLLBACK;', (rollbackErr) => {
                        if (rollbackErr) console.error('Erro ao fazer rollback:', rollbackErr.message);
                        res.status(500).json({ message: 'Erro ao processar os itens do pedido. Transação revertida.' });
                    });
                }
            }
        );
    });
});

// GET /api/user/favorites - Listar produtos favoritos do usuário logado
router.get('/favorites', authenticateToken, (req, res) => {
    const userId = req.user.id;
    db.all(`SELECT uf.product_id, p.title, p.description, p.price, p.photo_url, p.category
            FROM user_favorites uf
            JOIN products p ON uf.product_id = p.id
            WHERE uf.user_id = ?`, [userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: err.message });
        }
        res.status(200).json(rows);
    });
});

// POST /api/user/favorites/:product_id - Adicionar produto aos favoritos do usuário logado
router.post('/favorites/:product_id', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { product_id } = req.params;

    db.get(`SELECT id FROM products WHERE id = ? AND is_active = 1`, [product_id], (err, product) => {
        if (err) {
            return res.status(500).json({ message: err.message });
        }
        if (!product) {
            return res.status(404).json({ message: 'Produto não encontrado ou inativo.' });
        }

        db.run(`INSERT OR IGNORE INTO user_favorites (user_id, product_id) VALUES (?, ?)`,
            [userId, product_id],
            function(err) {
                if (err) {
                    return res.status(500).json({ message: err.message });
                }
                if (this.changes === 0) {
                    return res.status(409).json({ message: 'Produto já está nos favoritos.' });
                }
                res.status(201).json({ message: 'Produto adicionado aos favoritos com sucesso!' });
            }
        );
    });
});

// DELETE /api/user/favorites/:product_id - Remover produto dos favoritos do usuário logado
router.delete('/favorites/:product_id', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { product_id } = req.params;

    db.run(`DELETE FROM user_favorites WHERE user_id = ? AND product_id = ?`, [userId, product_id], function(err) {
        if (err) {
            return res.status(500).json({ message: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Produto não encontrado nos favoritos ou não pertence a este usuário.' });
        }
        res.status(200).json({ message: 'Produto removido dos favoritos com sucesso.' });
    });
});

module.exports = router;