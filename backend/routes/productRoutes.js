// routes/productRoutes.js
const express = require('express');
const router = express.Router();
// --- CORREÇÃO AQUI ---
// Agora desempacota 'db' e 'getOrCreateTagIds' do objeto exportado pelo db.js
const { db, getOrCreateTagIds } = require('../db/db'); 
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');

// Rota auxiliar para processar e retornar detalhes do produto
async function getProductDetails(productId, dbInstance) {
    const product = await new Promise((resolve, reject) => {
        dbInstance.get(`SELECT * FROM products WHERE id = ?`, [productId], (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });

    if (!product) return null;

    try {
        product.nutritional_info = typeof product.nutritional_info === 'string' ? JSON.parse(product.nutritional_info) : product.nutritional_info;
        product.dietary_restrictions = typeof product.dietary_restrictions === 'string' ? JSON.parse(product.dietary_restrictions) : product.dietary_restrictions;

        const ingredients = await new Promise((resolve, reject) => {
            dbInstance.all(`SELECT i.id, i.name FROM product_ingredients pi JOIN ingredients i ON pi.ingredient_id = i.id WHERE pi.product_id = ?`, [product.id], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        product.ingredients = ingredients;

        const associatedRestrictions = await new Promise((resolve, reject) => {
            dbInstance.all(`SELECT dro.id, dro.name FROM product_dietary_restrictions pdr JOIN dietary_restrictions_options dro ON pdr.restriction_id = dro.id WHERE pdr.product_id = ?`, [product.id], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        product.dietary_restrictions_details = associatedRestrictions;

    } catch (parseError) {
        console.error('Erro ao parsear dados JSON ou buscar detalhes do produto:', parseError);
        product.nutritional_info = null;
        product.dietary_restrictions = null;
        product.ingredients = [];
        product.dietary_restrictions_details = [];
    }
    return product;
}

// POST /api/admin/products - Criar novo produto
router.post('/', authenticateToken, authorizeAdmin, async (req, res) => {
    const { product_code, title, description, price, cost_price, photo_url, quantity, category, nutritional_info, dietary_restrictions, ingredients, is_active } = req.body;

    if (!title || price === undefined || cost_price === undefined || quantity === undefined || !category) {
        return res.status(400).json({ message: 'Campos principais (título, preços, estoque, categoria) são obrigatórios.' });
    }

    const nutritionalInfoJson = JSON.stringify(nutritional_info || {});
    const dietaryRestrictionsNamesJson = JSON.stringify(dietary_restrictions || []);

    try {
        let dietaryRestrictionIds = await getOrCreateTagIds(dietary_restrictions || [], 'dietary_restrictions_options', db);
        let ingredientIds = await getOrCreateTagIds(ingredients || [], 'ingredients', db);

        db.run(`INSERT INTO products (product_code, title, description, price, cost_price, photo_url, quantity, category, nutritional_info, dietary_restrictions, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
            [product_code || null, title, description, price, cost_price, photo_url, quantity, category, nutritionalInfoJson, dietaryRestrictionsNamesJson, is_active ? 1 : 0], 
            function(err) {
                if (err) {
                    if (err.message.includes('SQLITE_CONSTRAINT_UNIQUE')) return res.status(409).json({ message: 'Código do produto já existe.' });
                    console.error("DB Error on Create:", err.message);
                    return res.status(500).json({ message: 'Erro de banco de dados ao criar produto.', error: err.message });
                }
                const productId = this.lastID;

                db.serialize(() => {
                    if (ingredientIds.length > 0) {
                        const stmt = db.prepare(`INSERT INTO product_ingredients (product_id, ingredient_id) VALUES (?, ?)`);
                        ingredientIds.forEach(id => stmt.run(productId, id));
                        stmt.finalize();
                    }
                    if (dietaryRestrictionIds.length > 0) {
                        const stmt = db.prepare(`INSERT INTO product_dietary_restrictions (product_id, restriction_id) VALUES (?, ?)`);
                        dietaryRestrictionIds.forEach(id => stmt.run(productId, id));
                        stmt.finalize();
                    }
                });

                res.status(201).json({ message: 'Produto criado com sucesso!', productId: productId });
            }
        );
    } catch(err) {
        console.error("Async Error on Create:", err.message);
        res.status(500).json({ message: "Erro ao processar tags.", error: err.message });
    }
});


// GET /api/admin/products - Listar todos os produtos
router.get('/', authenticateToken, authorizeAdmin, async (req, res) => {
    db.all(`SELECT * FROM products ORDER BY id DESC`, [], async (err, products) => {
        if (err) return res.status(500).json({ message: err.message });
        const productsWithDetails = await Promise.all(products.map(p => getProductDetails(p.id, db)));
        res.status(200).json(productsWithDetails);
    });
});

// GET /api/admin/products/:id - Obter detalhes de um produto
router.get('/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    const product = await getProductDetails(req.params.id, db);
    if (!product) return res.status(404).json({ message: 'Produto não encontrado.' });
    res.status(200).json(product);
});

// PUT /api/admin/products/:id - Atualizar um produto
router.put('/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    const { id } = req.params;
    const { product_code, title, description, price, cost_price, photo_url, quantity, category, nutritional_info, dietary_restrictions, ingredients, is_active } = req.body;

    if (!title || price === undefined || cost_price === undefined || quantity === undefined || !category || is_active === undefined) {
        return res.status(400).json({ message: 'Todos os campos principais são obrigatórios para atualização.' });
    }

    const nutritionalInfoJson = JSON.stringify(nutritional_info || {});
    const dietaryRestrictionsNamesJson = JSON.stringify(dietary_restrictions || []);
    
    try {
        let dietaryRestrictionIds = await getOrCreateTagIds(dietary_restrictions || [], 'dietary_restrictions_options', db);
        let ingredientIds = await getOrCreateTagIds(ingredients || [], 'ingredients', db);

        db.run(`UPDATE products SET 
                    product_code = ?, title = ?, description = ?, price = ?, cost_price = ?, photo_url = ?, 
                    quantity = ?, category = ?, nutritional_info = ?, dietary_restrictions = ?, is_active = ?
                WHERE id = ?`,
            [product_code || null, title, description, price, cost_price, photo_url, quantity, category, nutritionalInfoJson, dietaryRestrictionsNamesJson, is_active ? 1 : 0, id], 
            function(err) {
                if (err) {
                    if (err.message.includes('SQLITE_CONSTRAINT_UNIQUE')) return res.status(409).json({ message: 'Código do produto já existe.' });
                    console.error("DB Error on Update:", err.message);
                    return res.status(500).json({ message: 'Erro de banco de dados ao atualizar produto.', error: err.message });
                }
                if (this.changes === 0) return res.status(404).json({ message: 'Produto não encontrado ou nenhum dado alterado.' });

                db.serialize(() => {
                    db.run(`DELETE FROM product_ingredients WHERE product_id = ?`, id);
                    db.run(`DELETE FROM product_dietary_restrictions WHERE product_id = ?`, id, () => {
                        if (ingredientIds.length > 0) {
                            const stmt = db.prepare(`INSERT INTO product_ingredients (product_id, ingredient_id) VALUES (?, ?)`);
                            ingredientIds.forEach(ingId => stmt.run(id, ingId));
                            stmt.finalize();
                        }
                        if (dietaryRestrictionIds.length > 0) {
                            const stmt = db.prepare(`INSERT INTO product_dietary_restrictions (product_id, restriction_id) VALUES (?, ?)`);
                            dietaryRestrictionIds.forEach(resId => stmt.run(id, resId));
                            stmt.finalize();
                        }
                        res.status(200).json({ message: 'Produto e associações atualizados com sucesso!' });
                    });
                });
            }
        );
    } catch (err) {
        console.error("Async Error on Update:", err.message);
        res.status(500).json({ message: "Erro ao processar tags para atualização.", error: err.message });
    }
});


// PATCH /api/admin/products/:id/toggle-active 
router.patch('/:id/toggle-active', authenticateToken, authorizeAdmin, (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;
    if (is_active === undefined) return res.status(400).json({ message: 'O valor de is_active é obrigatório.' });
    db.run(`UPDATE products SET is_active = ? WHERE id = ?`, [is_active, id], function(err) {
        if (err) return res.status(500).json({ message: err.message });
        if (this.changes === 0) return res.status(404).json({ message: 'Produto não encontrado.' });
        res.status(200).json({ message: `Produto ${is_active ? 'ativado' : 'desativado'} com sucesso!` });
    });
});

// DELETE /api/admin/products/:id
router.delete('/:id', authenticateToken, authorizeAdmin, (req, res) => {
    db.run(`DELETE FROM products WHERE id = ?`, req.params.id, function(err) {
        if (err) return res.status(500).json({ message: err.message });
        if (this.changes === 0) return res.status(404).json({ message: 'Produto não encontrado.' });
        res.status(200).json({ message: 'Produto deletado com sucesso.' });
    });
});

// --- ROTAS PÚBLICAS ---
router.get('/public', (req, res) => {
    let sql = `SELECT * FROM products WHERE is_active = 1`;
    const params = [];
    if (req.query.category) {
        sql += ` AND category = ?`;
        params.push(req.query.category);
    }
    db.all(sql, params, async (err, rows) => {
        if (err) return res.status(500).json({ message: err.message });
        const productsWithDetails = await Promise.all(rows.map(p => getProductDetails(p.id, db)));
        res.status(200).json(productsWithDetails);
    });
});

router.get('/public/:id', async (req, res) => {
    const product = await getProductDetails(req.params.id, db);
    if (!product || !product.is_active) return res.status(404).json({ message: 'Produto não encontrado ou inativo.' });
    res.status(200).json(product);
});

module.exports = router;