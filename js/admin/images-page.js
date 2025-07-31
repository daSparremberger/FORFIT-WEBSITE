// js/admin/images-page.js

const urlBase = 'http://localhost:3000/api/'; // Base URL para as APIs
const backendBaseUrl = 'http://localhost:3000'; // NOVO: Base URL para o servidor do backend para imagens

let selectedItems = new Set(); 
let currentImages = []; 

// Funções utilitárias (openModal/closeModal são placeholders, não usados diretamente aqui ainda)
function openModal(modalId) { 
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('show');
}
function closeModal(modalId) { 
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('show');
}


async function fetchImages() {
    const accessToken = localStorage.getItem('accessToken');
    try {
        const response = await fetch(`${urlBase}admin/images`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                alert('Sessão expirada ou não autorizada. Faça login novamente.');
                localStorage.clear();
                window.location.href = '../login.html';
                return [];
            }
            throw new Error(`Erro HTTP: ${response.status} ${response.statusText}`);
        }
        const images = await response.json();
        currentImages = images;
        return images;
    } catch (error) {
        console.error('Erro ao buscar imagens:', error);
        alert(`Erro ao carregar imagens: ${error.message}`);
        return [];
    }
}

// MODIFICADA: renderImages para construir a URL da imagem corretamente
function renderImages(images) {
    const gridContainer = document.querySelector('.admin-items-grid');
    if (!gridContainer) {
        console.error('Container de grid de imagens não encontrado.');
        return;
    }
    gridContainer.innerHTML = '';

    const placeholder = gridContainer.querySelector('.placeholder-text');
    if (images.length === 0) {
        if (placeholder) placeholder.style.display = 'block';
    } else {
        if (placeholder) placeholder.style.display = 'none';
    }

    images.forEach(image => {
        const imageCard = document.createElement('div');
        imageCard.classList.add('admin-item-card', 'image-item-card'); 
        imageCard.dataset.itemId = image.id;

        const isSelected = selectedItems.has(image.id.toString());

        // NOVO: Constrói a URL completa da imagem usando backendBaseUrl
        const imageUrlFull = `${backendBaseUrl}${image.url}`; 

        imageCard.innerHTML = `
            <div class="selection-circle ${isSelected ? 'selected' : ''}" data-item-id="${image.id}">
                ${isSelected ? '<i class="fas fa-check"></i>' : ''}
            </div>
            <img src="${imageUrlFull}" alt="${image.alt_text || 'Imagem'}" class="image-preview-admin">
            <div class="admin-card-actions">
                <button class="admin-action-button delete-item-button delete" data-item-id="${image.id}"><i class="fas fa-trash-alt"></i> Excluir</button>
            </div>
            <p class="image-card-title">${image.alt_text || `Imagem ID: ${image.id}`}</p> 
        `;
        gridContainer.appendChild(imageCard);
    });
    updateDeleteSelectedButtonVisibility();
}

function updateDeleteSelectedButtonVisibility() {
    const deleteSelectedButton = document.querySelector('.delete-selected-items-button');
    if (deleteSelectedButton) {
        if (selectedItems.size > 0) {
            deleteSelectedButton.style.display = 'flex';
        } else {
            deleteSelectedButton.style.display = 'none';
        }
    }
}

async function addImage(file, altText) { 
    const accessToken = localStorage.getItem('accessToken');
    const formData = new FormData(); 
    
    formData.append('image', file); 
    if (altText) formData.append('alt_text', altText);

    try {
        const response = await fetch(`${urlBase}admin/images/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            body: formData 
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao adicionar imagem.');
        }
        alert('Imagem adicionada ao banco com sucesso!');
        return true;
    } catch (error) {
        alert(`Erro: ${error.message}`);
        return false;
    }
}

async function loadImagesPage() {
    const images = await fetchImages();
    renderImages(images);
}

// Inicialização da página de imagens do admin
function initImagesPage() {
    const selectImageButton = document.querySelector('.admin-actions-bar .select-image-button');
    const imageFileInput = document.getElementById('image-file-input');
    const imageUrlInput = document.getElementById('image-url-input'); 
    const uploadImageButton = document.querySelector('.admin-actions-bar .upload-image-button');
    const deleteSelectedButton = document.querySelector('.admin-actions-bar .delete-selected-items-button');
    const adminItemsGrid = document.querySelector('.admin-items-grid');

    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'admin') {
        alert('Acesso negado. Você não tem permissão para acessar esta página.');
        window.location.href = '../index.html';
        return;
    }

    loadImagesPage(); 

    if (selectImageButton) {
        const previewImage = document.createElement('img');
        previewImage.classList.add('preview-image-icon');
        selectImageButton.appendChild(previewImage);

        selectImageButton.addEventListener('click', () => {
            imageFileInput.click(); 
        });
    }

    if (imageFileInput) {
        imageFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const previewImage = selectImageButton.querySelector('.preview-image-icon');
                    if (previewImage) {
                        previewImage.src = e.target.result;
                        selectImageButton.classList.add('has-preview');
                    }
                };
                reader.readAsDataURL(file);
            } else {
                selectImageButton.classList.remove('has-preview');
                selectImageButton.querySelector('.preview-image-icon').src = '';
            }
        });
    }


    if (uploadImageButton) {
        uploadImageButton.addEventListener('click', async () => {
            const file = imageFileInput.files[0]; 
            const imageUrl = imageUrlInput.value.trim(); 

            if (file) {
                const altText = imageUrlInput.value.trim() || `Imagem ForFit - ${file.name}`; 
                const success = await addImage(file, altText); 
                if (success) {
                    imageUrlInput.value = ''; 
                    imageFileInput.value = ''; 
                    selectImageButton.classList.remove('has-preview'); 
                    selectImageButton.querySelector('.preview-image-icon').src = ''; 
                    loadImagesPage(); 
                }
            } else if (imageUrl) {
                alert('A funcionalidade de "Adicionar Imagem" com URL direta ainda não está implementada. Por favor, use o botão "Selecionar Imagem" para carregar um arquivo.');
            } else {
                alert('Por favor, selecione uma imagem para upload ou insira uma URL.');
            }
        });
    }

    if (adminItemsGrid) {
        adminItemsGrid.addEventListener('click', async (event) => {
            const target = event.target;
            const itemId = target.dataset.itemId || target.closest('[data-item-id]')?.dataset.itemId;

            if (!itemId) return;

            // Lógica de seleção de círculo
            if (target.closest('.selection-circle')) {
                const circle = target.closest('.selection-circle');
                if (selectedItems.has(itemId)) {
                    selectedItems.delete(itemId);
                    circle.classList.remove('selected');
                    circle.innerHTML = '';
                } else {
                    selectedItems.add(itemId);
                    circle.classList.add('selected');
                    circle.innerHTML = '<i class="fas fa-check"></i>';
                }
                updateDeleteSelectedButtonVisibility();
                return;
            }

            // Lógica de exclusão individual
            if (target.closest('.delete-item-button')) {
                const imageElement = target.closest('.image-item-card').querySelector('.image-preview-admin'); 
                const imageUrlDisplay = imageElement ? imageElement.src : `ID ${itemId}`; 
                if (confirm(`Tem certeza que deseja EXCLUIR a imagem (URL: ${imageUrlDisplay})? Esta ação é irreversível e removerá o arquivo do servidor!`)) {
                    const accessToken = localStorage.getItem('accessToken');
                    try {
                        const response = await fetch(`${urlBase}admin/images/${itemId}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${accessToken}` }
                        });
                        if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.message || 'Erro ao deletar imagem.');
                        }
                        alert(`Imagem deletada com sucesso!`);
                        selectedItems.delete(itemId);
                        loadImagesPage();
                    } catch (error) {
                        alert(`Erro: ${error.message}`);
                    }
                }
                return;
            }
        });
    }

    if (deleteSelectedButton) {
        deleteSelectedButton.addEventListener('click', async () => {
            if (selectedItems.size === 0) {
                alert('Nenhuma imagem selecionada para remover.');
                return;
            }
            if (confirm(`Tem certeza que deseja EXCLUIR ${selectedItems.size} imagem(ns) selecionada(s)? Esta ação é irreversível e removerá os arquivos do servidor!`)) {
                const accessToken = localStorage.getItem('accessToken');
                const deletePromises = Array.from(selectedItems).map(id => 
                    fetch(`${urlBase}admin/images/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                    }).then(res => {
                        if (!res.ok) {
                            return res.json().then(errorData => { throw new Error(errorData.message || `Falha ao deletar imagem ${id}.`); });
                        }
                        return `Imagem ${id} deletada.`;
                    }).catch(error => {
                        console.error(error);
                        return `Erro ao deletar imagem ${id}: ${error.message}`;
                    })
                );

                const results = await Promise.allSettled(deletePromises);
                let successCount = 0;
                let errorMessages = [];

                results.forEach(result => {
                    if (result.status === 'fulfilled') {
                        successCount++;
                    } else {
                        errorMessages.push(result.reason.message || result.reason);
                    }
                });

                if (successCount > 0) {
                    alert(`${successCount} imagem(ns) deletada(s) com sucesso!`);
                }
                if (errorMessages.length > 0) {
                    alert(`Algumas imagens não puderam ser deletadas:\n${errorMessages.join('\n')}`);
                }
                selectedItems.clear();
                loadImagesPage();
            }
        });
    }
}