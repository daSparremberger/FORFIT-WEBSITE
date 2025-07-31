// routes/imageRoutes.js
const express = require('express');
const router = express.Router();
const { db } = require('../db/db');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// --- CORREÇÃO DE CAMINHO ---
// O destino agora sobe um nível ('..') a partir de /routes para chegar na raiz /backend e depois entrar em /uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // __dirname aqui é (raiz)/backend/routes. '..' sobe para (raiz)/backend.
        const uploadDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_')); // Substitui espaços no nome do arquivo
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos de imagem são permitidos!'), false);
        }
    }
});

// POST /api/admin/images/upload
router.post('/upload', authenticateToken, authorizeAdmin, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Nenhum arquivo de imagem foi enviado.' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    const altText = req.body.alt_text || `Imagem ForFit - ${req.file.filename}`;

    db.run(`INSERT INTO images (url, alt_text) VALUES (?, ?)`,
        [fileUrl, altText],
        function(err) {
            if (err) {
                fs.unlink(req.file.path, (unlinkErr) => {
                    if (unlinkErr) console.error('Erro ao remover arquivo após falha no DB:', unlinkErr.message);
                });
                if (err.message.includes('SQLITE_CONSTRAINT_UNIQUE')) {
                    return res.status(409).json({ message: 'Esta imagem (URL) já existe no banco.' });
                }
                return res.status(500).json({ message: err.message });
            }
            res.status(201).json({ message: 'Imagem enviada e registrada com sucesso!', imageId: this.lastID, url: fileUrl });
        }
    );
});

// GET /api/admin/images
router.get('/', authenticateToken, authorizeAdmin, (req, res) => {
    db.all(`SELECT * FROM images ORDER BY uploaded_at DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ message: err.message });
        res.status(200).json(rows);
    });
});

// DELETE /api/admin/images/:id
router.delete('/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const { id } = req.params;

    db.get(`SELECT url FROM images WHERE id = ?`, [id], (err, row) => {
        if (err || !row) {
            return res.status(404).json({ message: 'Imagem não encontrada no banco.' });
        }

        const imageUrl = row.url; // Ex: /uploads/123-nome.jpg
        // --- CORREÇÃO DE CAMINHO ---
        // Mesmo raciocínio do multer.diskStorage
        const filePath = path.join(__dirname, '..', imageUrl);

        db.run(`DELETE FROM images WHERE id = ?`, [id], function(deleteErr) {
            if (deleteErr) return res.status(500).json({ message: deleteErr.message });
            if (this.changes === 0) return res.status(404).json({ message: 'Imagem não encontrada para deleção.' });

            fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr && unlinkErr.code !== 'ENOENT') { // Não reporta erro se o arquivo já não existia
                    console.error(`Erro ao deletar arquivo físico ${filePath}:`, unlinkErr.message);
                } else {
                    console.log(`Arquivo físico ${filePath} deletado (ou não existia mais).`);
                }
            });
            res.status(200).json({ message: 'Imagem e registro deletados com sucesso.' });
        });
    });
});

module.exports = router;