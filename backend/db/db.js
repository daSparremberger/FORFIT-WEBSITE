// db/db.js
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs'); // Para inserir senha admin hash
const path = require('path'); // Para resolver caminho da pasta uploads
const fs = require('fs'); // Para criar pasta uploads

const DB_PATH = './database.sqlite'; // Caminho do arquivo do banco de dados

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Erro ao abrir o banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
        
        db.serialize(() => { 
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'user' -- 'user' ou 'admin'
            )`, (createTableErr) => {
                if (createTableErr) {
                    console.error('Erro ao criar tabela de usuários:', createTableErr.message);
                } else {
                    console.log('Tabela "users" verificada/criada.');

                    // Inserir um usuário admin padrão apenas se a tabela estiver vazia
                    db.get("SELECT COUNT(*) AS count FROM users", (countErr, row) => {
                        if (countErr) {
                            console.error('Erro ao contar usuários:', countErr.message);
                        } else if (row.count === 0) {
                            bcrypt.hash('522001Ilumina', 10, (hashErr, hashedPassword) => {
                                if (hashErr) {
                                    console.error('Erro ao hash da senha admin:', hashErr.message);
                                    return;
                                }
                                db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, 
                                    ['Samueladmin', hashedPassword, 'admin'], 
                                    (insertErr) => {
                                        if (insertErr) {
                                            console.error('Erro ao inserir admin padrão:', insertErr.message);
                                        } else {
                                            console.log('Usuário admin padrão inserido.');
                                        }
                                    }
                                );
                            });
                        }
                    });
                }
            });

            // Criação das demais tabelas
            db.run(`CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_code TEXT UNIQUE, 
                title TEXT NOT NULL,
                description TEXT,
                price REAL NOT NULL,
                cost_price REAL, -- CAMPO ADICIONADO
                photo_url TEXT,
                quantity INTEGER NOT NULL,
                category TEXT NOT NULL,
                nutritional_info TEXT,        -- Tabela Nutricional (como JSON string)
                dietary_restrictions TEXT,    -- Restrições Alimentares (como JSON string de nomes)
                is_active INTEGER DEFAULT 1
            )`, (err) => {
                if (err) console.error('Erro ao criar tabela de produtos:', err.message);
                else console.log('Tabela "products" verificada/criada.');
            });

            db.run(`CREATE TABLE IF NOT EXISTS promotions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                discount_percentage REAL,
                discount_amount REAL,
                start_date TEXT,
                end_date TEXT,
                photo_url TEXT, -- CAMPO ADICIONADO
                is_active INTEGER DEFAULT 1
            )`, (err) => {
                if (err) console.error('Erro ao criar tabela de promoções:', err.message);
                else console.log('Tabela "promotions" verificada/criada.');
            });


            db.run(`CREATE TABLE IF NOT EXISTS promotion_products (
                promotion_id INTEGER,
                product_id INTEGER,
                quantity_in_promotion INTEGER,
                PRIMARY KEY (promotion_id, product_id),
                FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            )`, (err) => {
                if (err) console.error('Erro ao criar tabela de promoção_produtos:', err.message);
                else console.log('Tabela "promotion_products" verificada/creada.');
            });

            db.run(`CREATE TABLE IF NOT EXISTS images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT UNIQUE NOT NULL,
                alt_text TEXT,
                uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) console.error('Erro ao criar tabela de imagens:', err.message);
                else console.log('Tabela "images" verificada/criada.');
            });

            db.run(`CREATE TABLE IF NOT EXISTS user_addresses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                street TEXT NOT NULL,
                number TEXT,
                complement TEXT,
                neighborhood TEXT,
                city TEXT NOT NULL,
                state TEXT NOT NULL,
                zip_code TEXT NOT NULL,
                is_default INTEGER DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`, (err) => {
                if (err) console.error('Erro ao criar tabela de endereços de usuário:', err.message);
                else console.log('Tabela "user_addresses" verificada/criada.');
            });

            db.run(`CREATE TABLE IF NOT EXISTS user_payment_methods (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                card_type TEXT,
                card_brand TEXT,
                last_four_digits TEXT,
                tokenized_data TEXT,
                method_type TEXT NOT NULL,
                is_default INTEGER DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`, (err) => {
                if (err) console.error('Erro ao criar tabela de formas de pagamento:', err.message);
                else console.log('Tabela "user_payment_methods" verificada/criada.');
            });

            db.run(`CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                order_date TEXT DEFAULT CURRENT_TIMESTAMP,
                total_amount REAL NOT NULL,
                status TEXT DEFAULT 'pending',
                delivery_address_id INTEGER,
                payment_method_id INTEGER,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (delivery_address_id) REFERENCES user_addresses(id),
                FOREIGN KEY (payment_method_id) REFERENCES user_payment_methods(id)
            )`, (err) => {
                if (err) console.error('Erro ao criar tabela de pedidos:', err.message);
                else console.log('Tabela "orders" verificada/criada.');
            });

            db.run(`CREATE TABLE IF NOT EXISTS order_items (
                order_id INTEGER,
                product_id INTEGER,
                quantity INTEGER NOT NULL,
                price_at_order REAL NOT NULL,
                PRIMARY KEY (order_id, product_id),
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            )`, (err) => {
                if (err) console.error('Erro ao criar tabela de itens de pedido:', err.message);
                else console.log('Tabela "order_items" verificada/criada.');
            });

            db.run(`CREATE TABLE IF NOT EXISTS user_favorites (
                user_id INTEGER,
                product_id INTEGER,
                PRIMARY KEY (user_id, product_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            )`, (err) => {
                if (err) console.error('Erro ao criar tabela de favoritos:', err.message);
                else console.log('Tabela "user_favorites" verificada/criada.');
            });

            db.run(`CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                order_index INTEGER DEFAULT 0 
            )`, (err) => {
                if (err) console.error('Erro ao criar tabela de categorias:', err.message);
                else {
                    console.log('Tabela "categories" verificada/criada.');
                    db.get("SELECT COUNT(*) AS count FROM categories", (countErr, row) => {
                        if (countErr) {
                            console.error('Erro ao contar categorias:', countErr.message);
                        } else if (row.count === 0) {
                            db.run(`INSERT INTO categories (name, order_index) VALUES (?, ?), (?, ?)`,
                                ['Refeições', 1, 'Cafeteria', 2],
                                (insertErr) => {
                                    if (insertErr) {
                                        console.error('Erro ao inserir categorias padrão:', insertErr.message);
                                    } else {
                                        console.log('Categorias padrão inseridas (Refeições, Cafeteria).');
                                    }
                                }
                            );
                        }
                    });
                }
            });

            db.run(`CREATE TABLE IF NOT EXISTS subcategories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                order_index INTEGER DEFAULT 0,
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
                UNIQUE(category_id, name)
            )`, (err) => {
                if (err) console.error('Erro ao criar tabela de subcategorias:', err.message);
                else {
                    console.log('Tabela "subcategories" verificada/criada.');
                    db.get("SELECT COUNT(*) AS count FROM subcategories", (countErr, row) => {
                        if (countErr) {
                            console.error('Erro ao contar subcategorias:', countErr.message);
                        } else if (row.count === 0) {
                            db.all(`SELECT id, name FROM categories`, (selectErr, categories) => {
                                if (selectErr) {
                                    console.error('Erro ao buscar IDs de categorias:', selectErr.message);
                                    return;
                                }
                                const refeicoesId = categories.find(c => c.name === 'Refeições')?.id;
                                const cafeteriaId = categories.find(c => c.name === 'Cafeteria')?.id;

                                if (refeicoesId && cafeteriaId) {
                                    const insertStmt = db.prepare(`INSERT INTO subcategories (category_id, name, order_index) VALUES (?, ?, ?)`);
                                    insertStmt.run(refeicoesId, 'Tradicional', 1);
                                    insertStmt.run(refeicoesId, 'Low Carb', 2);
                                    insertStmt.run(refeicoesId, 'Caldos & Sopas', 3);
                                    insertStmt.run(cafeteriaId, 'Café Expresso', 1);
                                    insertStmt.run(cafeteriaId, 'Lanches', 2);
                                    insertStmt.run(cafeteriaId, 'Doces', 3);
                                    insertStmt.finalize((finalizeErr) => {
                                        if (finalizeErr) {
                                            console.error('Erro ao inserir subcategorias padrão:', finalizeErr.message);
                                        } else {
                                            console.log('Subcategorias padrão inseridas.');
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
            
            db.run(`CREATE TABLE IF NOT EXISTS ingredients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL
            )`, (err) => {
                if (err) console.error('Erro ao criar tabela de ingredientes:', err.message);
                else {
                    console.log('Tabela "ingredients" verificada/criada.');
                    db.get("SELECT COUNT(*) AS count FROM ingredients", (countErr, row) => {
                        if (countErr) console.error('Erro ao contar ingredientes:', countErr.message);
                        else if (row.count === 0) {
                            db.run(`INSERT INTO ingredients (name) VALUES (?), (?), (?), (?), (?), (?)`,
                                ['Arroz', 'Feijão', 'Frango', 'Brócolis', 'Cenoura', 'Batata'],
                                (insertErr) => { if (insertErr) console.error('Erro ao inserir ingredientes padrão:', insertErr.message); }
                            );
                        }
                    });
                }
            });

            db.run(`CREATE TABLE IF NOT EXISTS dietary_restrictions_options (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL
            )`, (err) => {
                if (err) console.error('Erro ao criar tabela de restrições alimentares:', err.message);
                else {
                    console.log('Tabela "dietary_restrictions_options" verificada/criada.');
                    db.get("SELECT COUNT(*) AS count FROM dietary_restrictions_options", (countErr, row) => {
                        if (countErr) console.error('Erro ao contar restrições:', countErr.message);
                        else if (row.count === 0) {
                            db.run(`INSERT INTO dietary_restrictions_options (name) VALUES (?), (?), (?), (?), (?)`,
                                ['Vegano', 'Vegetariano', 'Sem Glúten', 'Sem Lactose', 'Low Carb'],
                                (insertErr) => { if (insertErr) console.error('Erro ao inserir restrições padrão:', insertErr.message); }
                            );
                        }
                    });
                }
            });

            db.run(`CREATE TABLE IF NOT EXISTS product_ingredients (
                product_id INTEGER NOT NULL,
                ingredient_id INTEGER NOT NULL,
                PRIMARY KEY (product_id, ingredient_id),
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
            )`, (err) => {
                if (err) console.error('Erro ao criar tabela de junção product_ingredients:', err.message);
                else console.log('Tabela "product_ingredients" verificada/criada.');
            });

            db.run(`CREATE TABLE IF NOT EXISTS product_dietary_restrictions (
                product_id INTEGER NOT NULL,
                restriction_id INTEGER NOT NULL,
                PRIMARY KEY (product_id, restriction_id),
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                FOREIGN KEY (restriction_id) REFERENCES dietary_restrictions_options(id) ON DELETE CASCADE
            )`, (err) => {
                if (err) console.error('Erro ao criar tabela de junção product_dietary_restrictions:', err.message);
                else console.log('Tabela "product_dietary_restrictions" verificada/criada.');
            });

        }); // Fecha db.serialize
    } // Fecha else do db.open
}); // Fecha db.Database


async function getOrCreateTagIds(tagsArray, tableName, dbInstance) {
    if (!tagsArray || !Array.isArray(tagsArray) || tagsArray.length === 0) {
        return [];
    }

    const promises = tagsArray.map(name => {
        return new Promise((resolve, reject) => {
            dbInstance.get(`SELECT id FROM ${tableName} WHERE name = ?`, [name], (err, row) => {
                if (err) return reject(err);
                if (row) {
                    return resolve(row.id);
                } else {
                    dbInstance.run(`INSERT INTO ${tableName} (name) VALUES (?)`, [name], function (insertErr) {
                        if (insertErr) return reject(insertErr);
                        resolve(this.lastID);
                    });
                }
            });
        });
    });

    return Promise.all(promises);
}

module.exports = {
    db,
    getOrCreateTagIds
};