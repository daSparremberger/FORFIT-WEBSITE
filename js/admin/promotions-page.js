// js/admin/promotions-page.js

const urlBase = 'http://localhost:3000/api/';
const backendBaseUrl = 'http://localhost:3000';

let selectedItems = new Set();
let currentPromotions = [];
let promoProducts = []; 
let allProductsCache = []; 
let currentSelectedImage = null;
let currentSelectedProductForPromo = null;

// --- FUNÇÕES DE FORMATAÇÃO E UTILITÁRIAS ---
function formatCurrency(value) {
    if (isNaN(value) || value === null) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}
function parseCurrency(value) {
    if (typeof value !== 'string') return 0;
    const number = parseFloat(value.replace('R$', '').replace(/\./g, '').replace(',', '.').trim());
    return isNaN(number) ? 0 : number;
}
function setupCurrencyInput(inputElement) {
    const format = (val) => {
        if(!val) return '';
        let num = val.replace(/\D/g, '');
        if (num.length === 0) return '';
        num = (parseInt(num, 10) / 100).toFixed(2) + '';
        num = num.replace('.', ',');
        num = num.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
        return `R$ ${num}`;
    };
    inputElement.addEventListener('input', (e) => {
        let formatted = format(e.target.value);
        if(formatted) e.target.value = formatted.replace('R$ ', '');
    });
    inputElement.addEventListener('blur', (e) => { if(e.target.value) e.target.value = format(e.target.value); });
}

async function fetchPromotions() { /* ...código da função inalterado... */ }
function renderPromotions(promotions) { /* ...código da função inalterado... */ }
function updateDeleteSelectedButtonVisibility() { /* ...código da função inalterado... */ }

async function renderImagesForSelectionInModal(gridContainer, searchTerm = '') {
    const accessToken = localStorage.getItem('accessToken');
    try {
        const response = await fetch(`${urlBase}admin/images`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (!response.ok) throw new Error('Erro ao carregar imagens.');
        const images = await response.json();
        gridContainer.innerHTML = '';
        const filteredImages = images.filter(img => !searchTerm || (img.alt_text || '').toLowerCase().includes(searchTerm.toLowerCase()));
        
        if (filteredImages.length === 0) {
            gridContainer.innerHTML = '<p class="placeholder-text">Nenhuma imagem encontrada.</p>';
            return;
        }

        filteredImages.forEach(image => {
            const card = document.createElement('div');
            card.classList.add('admin-item-card', 'image-item-card', 'selectable-image-card');
            card.dataset.imageUrl = image.url;
            card.dataset.imageId = image.id;
            card.innerHTML = `<img src="${backendBaseUrl}${image.url}" alt="${image.alt_text || ''}">`;
            card.addEventListener('click', () => {
                gridContainer.querySelectorAll('.selectable-image-card').forEach(c => c.classList.remove('selected-for-product'));
                card.classList.add('selected-for-product');
                currentSelectedImage = image;
                document.getElementById('select-chosen-image-button').disabled = false;
            });
            gridContainer.appendChild(card);
        });
    } catch (error) { console.error('Erro ao renderizar imagens:', error); }
}

// --- LÓGICA DO MODAL DE PROMOÇÃO ---
function updateFinancialPreview() { /* ...código da função inalterado... */ }
function syncDiscountFields(changedField) { /* ...código da função inalterado... */ }
function renderPromoProductsList() { /* ...código da função inalterado... */ }

async function setupPromotionForm(promotionData = null) {
    const form = document.getElementById('promotion-form');
    form.reset();
    const isEditing = promotionData !== null;
    promoProducts = [];
    currentSelectedImage = null;

    document.getElementById('promotion-form-title').textContent = isEditing ? 'Editar Promoção' : 'Criar Nova Promoção';
    setupCurrencyInput(document.getElementById('promotion-discount-amount'));
    
    document.getElementById('promotion-image-preview').style.display = 'none';
    document.getElementById('promotion-photo-url-display').value = '';
    document.getElementById('promotion-photo-url-hidden').value = '';

    if (isEditing) {
        form.elements['id'].value = promotionData.id;
        form.elements['title'].value = promotionData.title;
        form.elements['description'].value = promotionData.description || '';
        form.elements['discount_percentage'].value = promotionData.discount_percentage || '';
        form.elements['start_date'].value = promotionData.start_date ? promotionData.start_date.split('T')[0] : '';
        form.elements['end_date'].value = promotionData.end_date ? promotionData.end_date.split('T')[0] : '';
        form.elements['photo_url'].value = promotionData.photo_url || '';
        form.elements['photo_url_display'].value = promotionData.photo_url || '';
        form.elements['is_active'].checked = promotionData.is_active;

        if (promotionData.photo_url) {
            const preview = document.getElementById('promotion-image-preview');
            preview.src = backendBaseUrl + promotionData.photo_url;
            preview.style.display = 'block';
        }
        if (promotionData.products) {
            promoProducts = JSON.parse(JSON.stringify(promotionData.products));
        }
    }
    
    renderPromoProductsList();
    
    form.onsubmit = async (e) => {
        e.preventDefault();
        const promoPayload = {
            title: form.elements['title'].value, description: form.elements['description'].value,
            discount_percentage: parseFloat(form.elements['discount_percentage'].value) || null,
            discount_amount: parseCurrency(form.elements['discount_amount'].value) || null,
            start_date: form.elements['start_date'].value, end_date: form.elements['end_date'].value,
            photo_url: form.elements['photo_url'].value, is_active: form.elements['is_active'].checked,
            product_ids_with_quantities: promoProducts.map(p => ({ product_id: p.product_id, quantity_in_promotion: p.quantity_in_promotion }))
        };
        const url = isEditing ? `${urlBase}admin/promotions/${promotionData.id}` : `${urlBase}admin/promotions`;
        const method = isEditing ? 'PUT' : 'POST';
        const accessToken = localStorage.getItem('accessToken');
        try {
            const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` }, body: JSON.stringify(promoPayload) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            alert(`Promoção ${isEditing ? 'atualizada' : 'criada'} com sucesso!`);
            closeModal('promotion-form-modal');
            loadPromotionsPage();
        } catch (error) { alert(`Erro: ${error.message}`); }
    };
}

function renderProductsForSelectionInModal(searchTerm = '') {
    const gridContainer = document.querySelector('.product-selection-grid');
    gridContainer.innerHTML = '';
    const availableProducts = allProductsCache.filter(p => 
        !promoProducts.some(pp => pp.product_id === p.id) &&
        (!searchTerm || p.title.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    if (availableProducts.length === 0) {
        gridContainer.innerHTML = '<p class="placeholder-text">Nenhum produto disponível.</p>';
        return;
    }
    availableProducts.forEach(product => {
        const card = document.createElement('div');
        card.classList.add('admin-item-card');
        card.dataset.productId = product.id;
        card.innerHTML = `<div class="meal-card-image-container"><img src="${backendBaseUrl}${product.photo_url || '/img/placeholder.png'}" class="meal-card-image"></div><div class="selectable-product-content"><h4 class="selectable-product-title">${product.title}</h4><p class="selectable-product-price">${formatCurrency(product.price)}</p></div>`;
        card.addEventListener('click', () => {
            gridContainer.querySelectorAll('.admin-item-card').forEach(c => c.classList.remove('selected-for-promo'));
            card.classList.add('selected-for-promo');
            currentSelectedProductForPromo = product;
            document.getElementById('add-selected-product-button').disabled = false;
        });
        gridContainer.appendChild(card);
    });
}

async function showProductSelectorForPromo() {
    if (allProductsCache.length === 0) {
        const accessToken = localStorage.getItem('accessToken');
        try {
            const response = await fetch(`${urlBase}admin/products`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
            allProductsCache = await response.json();
        } catch (error) { alert('Não foi possível carregar a lista de produtos.'); return; }
    }
    currentSelectedProductForPromo = null;
    document.getElementById('add-selected-product-button').disabled = true;
    document.getElementById('product-selector-search-input').value = '';
    renderProductsForSelectionInModal();
    openModal('product-selector-modal');
}

async function loadPromotionsPage() {
    const promotions = await fetchPromotions();
    renderPromotions(promotions);
}

function initPromotionsPage() {
    if (localStorage.getItem('userRole') !== 'admin') {
        alert('Acesso negado.'); window.location.href = '../index.html'; return;
    }
    loadPromotionsPage();

    // -- Listeners da página principal --
    document.querySelector('.add-new-item-button').addEventListener('click', () => {
        openModal('promotion-form-modal');
        setupPromotionForm();
    });
    document.querySelector('.admin-items-grid').addEventListener('click', async (e) => {
        const card = e.target.closest('.admin-item-card');
        if (!card) return;
        const itemId = card.dataset.itemId;
        if (e.target.closest('.edit-item-button')) {
             openModal('promotion-form-modal');
             const accessToken = localStorage.getItem('accessToken');
             try {
                const response = await fetch(`${urlBase}admin/promotions/${itemId}`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
                if (!response.ok) throw new Error('Falha ao carregar dados da promoção.');
                const promoData = await response.json();
                await setupPromotionForm(promoData);
             } catch(error) {
                alert(`Erro: ${error.message}`);
                closeModal('promotion-form-modal');
             }
        }
    });
    
    // -- Listeners dos Modais (usando delegação de eventos no body) --
    document.body.addEventListener('click', (e) => {
        // Botão para abrir o seletor de produtos
        if (e.target.id === 'add-product-to-promotion-button') showProductSelectorForPromo();
        // Botão para abrir o seletor de imagens da promoção
        if (e.target.id === 'select-promo-image-button') {
            openModal('image-bank-selector-modal');
            document.getElementById('select-chosen-image-button').dataset.target = 'promotion';
            renderImagesForSelectionInModal(document.querySelector('#image-bank-selector-modal .image-selection-grid'));
        }
        // Botão para confirmar a imagem selecionada
        if (e.target.id === 'select-chosen-image-button') {
            if (currentSelectedImage) {
                const target = e.target.dataset.target;
                if (target === 'promotion') {
                    document.getElementById('promotion-photo-url-display').value = currentSelectedImage.url;
                    document.getElementById('promotion-photo-url-hidden').value = currentSelectedImage.url;
                    const preview = document.getElementById('promotion-image-preview');
                    preview.src = backendBaseUrl + currentSelectedImage.url;
                    preview.style.display = 'block';
                }
            }
            closeModal('image-bank-selector-modal');
        }
        // Botão para adicionar o produto selecionado
        if (e.target.id === 'add-selected-product-button') {
            if (currentSelectedProductForPromo) {
                promoProducts.push({ product_id: currentSelectedProductForPromo.id, ...currentSelectedProductForPromo, quantity_in_promotion: 1 });
                renderPromoProductsList();
            }
            closeModal('product-selector-modal');
        }
        // Botão para cancelar a seleção de produto
        if (e.target.id === 'cancel-product-selection-button') closeModal('product-selector-modal');
    });

    document.body.addEventListener('input', (e) => {
        // Busca de produtos no modal de seleção
        if (e.target.id === 'product-selector-search-input') renderProductsForSelectionInModal(e.target.value);
    });
}