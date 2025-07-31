// js/admin/products-page.js

const urlBase = 'http://localhost:3000/api/';
const backendBaseUrl = 'http://localhost:3000';

let selectedItems = new Set();
let currentProducts = [];
let currentSelectedImage = null;

// --- FUNÇÕES DE FORMATAÇÃO ---
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
        if(formatted) {
            e.target.value = formatted.replace('R$ ', '');
        }
    });

    inputElement.addEventListener('blur', (e) => {
        if(e.target.value) {
            e.target.value = format(e.target.value);
        }
    });
}

// --- Funções de UI e API ---
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('show');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('show');
}

async function fetchProducts() {
    const accessToken = localStorage.getItem('accessToken');
    try {
        const response = await fetch(`${urlBase}admin/products`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (response.status === 401 || response.status === 403) {
             alert('Sessão expirada ou não autorizada. Faça login novamente.');
             window.location.href = '../login.html';
             return [];
        }
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        const data = await response.json();
        currentProducts = data;
        return data;
    } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        alert(`Erro ao carregar produtos: ${error.message}`);
        return [];
    }
}

async function renderProducts(products) {
    const gridContainer = document.querySelector('.admin-items-grid');
    if (!gridContainer) return;
    gridContainer.innerHTML = products.length === 0 ? '<p class="placeholder-text">Nenhum produto cadastrado.</p>' : '';

    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.classList.add('meal-card', 'admin-item-card');
        productCard.dataset.itemId = product.id;
        const isSelected = selectedItems.has(product.id.toString());

        productCard.innerHTML = `
            <div class="selection-circle ${isSelected ? 'selected' : ''}" data-item-id="${product.id}">
                ${isSelected ? '<i class="fas fa-check"></i>' : ''}
            </div>
            <div class="meal-card-image-container">
                <img src="${backendBaseUrl}${product.photo_url || '/img/placeholder.png'}" alt="${product.title}" class="meal-card-image">
            </div>
            <div class="meal-card-content">
                <h3 class="meal-card-title">${product.title}</h3>
                <span class="meal-card-code">${product.product_code || `#${product.id}`}</span> 
                <span class="meal-card-price">${formatCurrency(product.price)}</span>
                <p class="product-quantity-display">Custo: ${formatCurrency(product.cost_price || 0)}</p>
                <p class="product-quantity-display">Estoque: ${product.quantity}</p>
                <p class="product-status-display">Status: ${product.is_active ? 'Ativo' : 'Inativo'}</p>
            </div>
            <div class="admin-card-actions">
                <button class="admin-action-button edit-item-button edit" data-item-id="${product.id}"><i class="fas fa-edit"></i> Editar</button>
                <button class="admin-action-button delete-item-button delete" data-item-id="${product.id}"><i class="fas fa-trash-alt"></i> Excluir</button>
                <button class="admin-action-button toggle-status-button toggle-status" data-item-id="${product.id}" data-active="${product.is_active}">
                    <i class="fas ${product.is_active ? 'fa-toggle-on' : 'fa-toggle-off'}"></i> ${product.is_active ? 'Desativar' : 'Ativar'}
                </button>
            </div>
        `;
        gridContainer.appendChild(productCard);
    });
    updateDeleteSelectedButtonVisibility();
}

function updateDeleteSelectedButtonVisibility() {
    const button = document.querySelector('.delete-selected-items-button');
    if (button) button.style.display = selectedItems.size > 0 ? 'flex' : 'none';
}

const NUTRIENT_NAMES = [
    { key: "valor_energetico", name: "Valor Energético" }, { key: "carboidratos", name: "Carboidratos" },
    { key: "acucares_totais", name: "Açúcares Totais" }, { key: "proteinas", name: "Proteínas" },
    { key: "gorduras_totais", name: "Gorduras Totais" }, { key: "gorduras_saturadas", name: "Gorduras Saturadas" },
    { key: "gorduras_trans", name: "Gorduras Trans" }, { key: "fibra_alimentar", name: "Fibra Alimentar" },
    { key: "sodio", name: "Sódio" }
];

function renderNutritionalTable(tableContainer, currentInfo = {}) {
    tableContainer.innerHTML = '';
    NUTRIENT_NAMES.forEach(nutrient => {
        const data = currentInfo[nutrient.key] || {};
        const value = data.value !== undefined ? data.value.toString().replace('.', ',') : '';
        const unit = data.unit || (nutrient.key === 'valor_energetico' ? 'kcal' : 'g');
        const row = document.createElement('div');
        row.classList.add('table-row');
        row.innerHTML = `
            <div class="table-cell nutrient-name">${nutrient.name}</div>
            <div class="table-cell nutrient-input-container">
                <input type="text" inputmode="decimal" class="nutrient-value-input" data-nutrient-key="${nutrient.key}" value="${value}" placeholder="0">
                <select class="nutrient-unit-select" data-nutrient-key="${nutrient.key}">
                    <option value="g" ${unit === 'g' ? 'selected' : ''}>g</option>
                    <option value="mg" ${unit === 'mg' ? 'selected' : ''}>mg</option>
                    <option value="kcal" ${unit === 'kcal' ? 'selected' : ''}>kcal</option>
                </select>
            </div>`;
        tableContainer.appendChild(row);
    });
    tableContainer.querySelectorAll('.nutrient-value-input').forEach(input => {
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9,]/g, '').replace(/(,.*),/g, '$1');
        });
    });
}

function getNutritionalInfoFromForm() {
    const info = {};
    document.querySelectorAll('.nutritional-info-table .table-row').forEach(row => {
        const valueInput = row.querySelector('.nutrient-value-input');
        const unitSelect = row.querySelector('.nutrient-unit-select');
        const key = valueInput.dataset.nutrientKey;
        const value = parseFloat(valueInput.value.replace(',', '.'));
        if (!isNaN(value)) {
            info[key] = { value, unit: unitSelect.value };
        }
    });
    return info;
}

async function fetchTags(type, searchTerm = '') { 
    const accessToken = localStorage.getItem('accessToken');
    try {
        const response = await fetch(`${urlBase}admin/${type}?search=${searchTerm}`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (!response.ok) throw new Error(`Erro ao carregar ${type}.`);
        return await response.json();
    } catch (error) { console.error(`Erro ao buscar ${type}:`, error); return []; }
}
async function addTagToDatabase(type, name) { 
    const accessToken = localStorage.getItem('accessToken');
    try {
        const response = await fetch(`${urlBase}admin/${type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
            body: JSON.stringify({ name })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        return data.ingredient || data.restriction;
    } catch (error) { alert(`Erro ao adicionar: ${error.message}`); return null; }
}
let selectedIngredientsInForm = [];
let selectedRestrictionsInForm = [];
function renderTags(tagsArray, containerElement, type) { 
    containerElement.innerHTML = '';
    tagsArray.forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.classList.add('selected-tag');
        tagElement.dataset.tagId = tag.id;
        tagElement.innerHTML = `${tag.name} <button type="button" class="remove-tag" data-tag-id="${tag.id}">&times;</button>`;
        containerElement.appendChild(tagElement);
        tagElement.querySelector('.remove-tag').addEventListener('click', () => {
            let targetArray, setTargetArray;
            if (type === 'ingredients') [targetArray, setTargetArray] = [selectedIngredientsInForm, (arr) => selectedIngredientsInForm = arr];
            else [targetArray, setTargetArray] = [selectedRestrictionsInForm, (arr) => selectedRestrictionsInForm = arr];
            const updatedArray = targetArray.filter(t => t.id.toString() !== tag.id.toString());
            setTargetArray(updatedArray);
            renderTags(updatedArray, containerElement, type);
        });
    });
    const hiddenInputId = type === 'ingredients' ? 'product-ingredients-hidden' : 'product-dietary-restrictions-hidden';
    document.getElementById(hiddenInputId).value = JSON.stringify(tagsArray.map(t => t.name));
}
function setupTagInput(inputElement, suggestionsContainer, tagsContainer, hiddenInput, type, initialTags = []) {
    let allAvailableTags = [];
    if (type === 'ingredients') selectedIngredientsInForm = [...initialTags]; else selectedRestrictionsInForm = [...initialTags];
    const loadAllTags = async () => { allAvailableTags = await fetchTags(type); };
    const showSuggestions = (query) => {
        suggestionsContainer.innerHTML = '';
        const currentSelected = type === 'ingredients' ? selectedIngredientsInForm : selectedRestrictionsInForm;
        const filtered = allAvailableTags.filter(tag => tag.name.toLowerCase().includes(query.toLowerCase()) && !currentSelected.some(s => s.id === tag.id));
        if (filtered.length > 0 && query) {
            filtered.forEach(tag => {
                const item = document.createElement('div');
                item.classList.add('suggestion-item');
                item.textContent = tag.name;
                item.addEventListener('click', () => {
                    currentSelected.push(tag); renderTags(currentSelected, tagsContainer, type);
                    inputElement.value = ''; suggestionsContainer.classList.remove('show');
                });
                suggestionsContainer.appendChild(item);
            });
            suggestionsContainer.classList.add('show');
        } else { suggestionsContainer.classList.remove('show'); }
    };
    inputElement.addEventListener('input', () => showSuggestions(inputElement.value.trim()));
    inputElement.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const name = inputElement.value.trim();
            if (name) {
                const currentSelected = type === 'ingredients' ? selectedIngredientsInForm : selectedRestrictionsInForm;
                let tag = allAvailableTags.find(t => t.name.toLowerCase() === name.toLowerCase());
                if (!tag) tag = await addTagToDatabase(type, name);
                if (tag && !currentSelected.some(s => s.id === tag.id)) {
                    if(!allAvailableTags.some(t => t.id === tag.id)) allAvailableTags.push(tag);
                    currentSelected.push(tag);
                    renderTags(currentSelected, tagsContainer, type);
                }
                inputElement.value = ''; suggestionsContainer.classList.remove('show');
            }
        }
    });
    document.addEventListener('click', (e) => { if (!suggestionsContainer.contains(e.target) && e.target !== inputElement) suggestionsContainer.classList.remove('show'); });
    renderTags(initialTags, tagsContainer, type);
    loadAllTags();
}

// --- CORREÇÃO AQUI: Função de setup unificada ---
async function setupProductForm(productData = null) {
    const form = document.getElementById('product-form');
    form.reset();
    const isEditing = productData !== null;

    document.getElementById('product-form-title').textContent = isEditing ? 'Editar Produto' : 'Adicionar Novo Produto';
    
    // Configura inputs de moeda
    setupCurrencyInput(document.getElementById('product-cost-price'));
    setupCurrencyInput(document.getElementById('product-price'));

    // Popula campos com dados existentes ou valores padrão
    form.elements['id'].value = isEditing ? productData.id : '';
    form.elements['product_code'].value = isEditing ? productData.product_code || '' : '';
    form.elements['title'].value = isEditing ? productData.title : '';
    form.elements['description'].value = isEditing ? productData.description || '' : '';
    form.elements['price'].value = isEditing ? formatCurrency(productData.price) : '';
    form.elements['cost_price'].value = isEditing ? formatCurrency(productData.cost_price || 0) : '';
    form.elements['photo_url_display'].value = isEditing ? productData.photo_url || '' : '';
    form.elements['photo_url'].value = isEditing ? productData.photo_url || '' : '';
    const preview = document.getElementById('product-image-preview');
    preview.src = isEditing && productData.photo_url ? backendBaseUrl + productData.photo_url : '';
    preview.style.display = isEditing && productData.photo_url ? 'block' : 'none';
    form.elements['quantity'].value = isEditing ? productData.quantity : '';
    form.elements['is_active'].checked = isEditing ? productData.is_active : true;

    // Tabela Nutricional
    const nutritionalTable = document.querySelector('.nutritional-info-table');
    renderNutritionalTable(nutritionalTable, isEditing ? productData.nutritional_info || {} : {});
    nutritionalTable.addEventListener('input', () => {
        form.elements['nutritional_info'].value = JSON.stringify(getNutritionalInfoFromForm());
    });
    form.elements['nutritional_info'].value = JSON.stringify(getNutritionalInfoFromForm());

    // Tags
    setupTagInput(document.getElementById('product-ingredients-input'), document.getElementById('ingredients-suggestions'), document.getElementById('product-ingredients-tags'), form.elements['ingredients'], 'ingredients', isEditing ? productData.ingredients || [] : []);
    setupTagInput(document.getElementById('product-dietary-restrictions-input'), document.getElementById('dietary-restrictions-suggestions'), document.getElementById('product-dietary-restrictions-tags'), form.elements['dietary_restrictions'], 'dietary-restrictions', isEditing ? productData.dietary_restrictions_details || [] : []);
    
    await populateCategoriesSelect(form.elements['category'], isEditing ? productData.category : '');

    form.onsubmit = async (e) => {
        e.preventDefault();
        try {
            const productPayload = {
                product_code: form.elements['product_code'].value.trim() || null,
                title: form.elements['title'].value,
                description: form.elements['description'].value,
                price: parseCurrency(form.elements['price'].value),
                cost_price: parseCurrency(form.elements['cost_price'].value),
                photo_url: form.elements['photo_url'].value,
                quantity: parseInt(form.elements['quantity'].value),
                category: form.elements['category'].value,
                nutritional_info: getNutritionalInfoFromForm(),
                ingredients: JSON.parse(form.elements['ingredients'].value || '[]'),
                dietary_restrictions: JSON.parse(form.elements['dietary_restrictions'].value || '[]'),
                is_active: form.elements['is_active'].checked
            };

            const url = isEditing ? `${urlBase}admin/products/${productData.id}` : `${urlBase}admin/products`;
            const method = isEditing ? 'PUT' : 'POST';

            const accessToken = localStorage.getItem('accessToken');
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
                body: JSON.stringify(productPayload)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            alert(`Produto ${isEditing ? 'atualizado' : 'criado'} com sucesso!`);
            closeModal('product-form-modal');
            loadProductsPage();
        } catch (error) {
            console.error(`Erro ao salvar produto:`, error);
            alert(`Erro: ${error.message}`);
        }
    };
}


async function populateCategoriesSelect(selectElement, selectedCategory = '') {
    const accessToken = localStorage.getItem('accessToken');
    try {
        const response = await fetch(`${urlBase}admin/categories`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (!response.ok) throw new Error('Erro ao carregar categorias.');
        const categories = await response.json();
        selectElement.innerHTML = '<option value="">Selecione uma categoria</option>';
        categories.forEach(cat => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = cat.name;
            cat.subcategories.forEach(sub => {
                const option = document.createElement('option');
                option.value = sub.name;
                option.textContent = `  ${sub.name}`;
                if (sub.name === selectedCategory) option.selected = true;
                optgroup.appendChild(option);
            });
            selectElement.appendChild(optgroup);
        });
    } catch (error) { console.error('Erro ao popular categorias:', error); }
}

async function renderImagesForSelectionInModal(gridContainer, searchTerm = '') {
    const accessToken = localStorage.getItem('accessToken');
    try {
        const response = await fetch(`${urlBase}admin/images`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (!response.ok) throw new Error('Erro ao carregar imagens.');
        const images = await response.json();
        gridContainer.innerHTML = '';
        images.filter(img => !searchTerm || (img.alt_text || '').toLowerCase().includes(searchTerm.toLowerCase())).forEach(image => {
            const card = document.createElement('div');
            card.classList.add('admin-item-card', 'image-item-card', 'selectable-image-card');
            card.dataset.imageUrl = image.url; // Corrigido para pegar o URL
            card.dataset.imageId = image.id; // Adicionado ID para referência
            card.innerHTML = `<img src="${backendBaseUrl}${image.url}" alt="${image.alt_text || ''}">`;
            card.addEventListener('click', () => {
                gridContainer.querySelectorAll('.selectable-image-card').forEach(c => c.classList.remove('selected-for-product'));
                card.classList.add('selected-for-product');
                currentSelectedImage = image;
                document.getElementById('select-chosen-image-button').style.display = 'block';
            });
            gridContainer.appendChild(card);
        });
    } catch (error) { console.error('Erro ao renderizar imagens:', error); }
}

async function loadProductsPage() {
    const products = await fetchProducts();
    await renderProducts(products);
}

function initProductsPage() {
    if (localStorage.getItem('userRole') !== 'admin') {
        alert('Acesso negado.');
        window.location.href = '../index.html';
        return;
    }
    loadProductsPage();

    document.querySelector('.add-new-item-button').addEventListener('click', () => {
        openModal('product-form-modal');
        setupProductForm();
    });

    document.querySelector('.admin-items-grid').addEventListener('click', async (e) => {
        const card = e.target.closest('.admin-item-card');
        if (!card) return;
        const itemId = card.dataset.itemId;
        
        if (e.target.closest('.selection-circle')) {
            const circle = e.target.closest('.selection-circle');
            if (selectedItems.has(itemId)) {
                selectedItems.delete(itemId); circle.classList.remove('selected'); circle.innerHTML = '';
            } else {
                selectedItems.add(itemId); circle.classList.add('selected'); circle.innerHTML = '<i class="fas fa-check"></i>';
            }
            updateDeleteSelectedButtonVisibility();
        } else if (e.target.closest('.edit-item-button')) {
             openModal('product-form-modal');
             const accessToken = localStorage.getItem('accessToken');
             try {
                const response = await fetch(`${urlBase}admin/products/${itemId}`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
                if (!response.ok) throw new Error((await response.json()).message);
                const productData = await response.json();
                await setupProductForm(productData);
             } catch(error) {
                alert(`Erro ao carregar dados para edição: ${error.message}`);
                closeModal('product-form-modal');
             }
        }
    });
    
    document.getElementById('select-image-from-bank-button').addEventListener('click', async () => {
        openModal('image-bank-selector-modal');
        await renderImagesForSelectionInModal(document.querySelector('#image-bank-selector-modal .image-selection-grid'));
    });
    document.getElementById('cancel-image-selection-button').addEventListener('click', () => closeModal('image-bank-selector-modal'));
    document.getElementById('select-chosen-image-button').addEventListener('click', () => {
        if(currentSelectedImage) {
            document.getElementById('product-photo-url-display').value = currentSelectedImage.url;
            // CORREÇÃO AQUI: Salvar o URL relativo no campo hidden
            document.getElementById('product-photo-url-hidden').value = currentSelectedImage.url;
            const preview = document.getElementById('product-image-preview');
            preview.src = backendBaseUrl + currentSelectedImage.url;
            preview.style.display = 'block';
        }
        closeModal('image-bank-selector-modal');
    });
}