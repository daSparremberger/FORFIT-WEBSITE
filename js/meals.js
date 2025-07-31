// js/meals.js

// Removendo o mealData fixo, pois buscaremos do backend.
// const mealData = { ... };

async function fetchMealData(category, subCategory) {
    try {
        // --- CORREÇÃO AQUI ---
        // Ajustei a URL para apontar para a rota pública de produtos "/api/products/public"
        const response = await fetch(`http://localhost:3000/api/products/public?category=${subCategory}`); 
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const products = await response.json();
        // A função getProductDetails no backend já trata o JSON, então não precisamos fazer o parse aqui.
        return products;
    } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        return []; // Retorna um array vazio em caso de erro
    }
}

async function loadAndPopulateMealCard(placeholderElement, mealItem) {
    try {
        const response = await fetch('components/meal-card.html'); // Carrega o template do card
        const html = await response.text();
        placeholderElement.innerHTML = html;

        const card = placeholderElement.querySelector('.meal-card');
        if (card) {
            // Usando o ID do produto do backend
            card.dataset.itemId = mealItem.id; 
            // Usando a URL da foto do backend (photo_url)
            card.querySelector('.meal-card-image').src = `http://localhost:3000${mealItem.photo_url || '/img/placeholder.png'}`;
            card.querySelector('.meal-card-image').alt = mealItem.title;
            card.querySelector('.meal-card-title').textContent = mealItem.title;
            // Usando o código do produto ou o ID como fallback
            card.querySelector('.meal-card-code').textContent = mealItem.product_code || `#${mealItem.id}`;
            // Formatando o preço para o padrão brasileiro
            card.querySelector('.meal-card-price').textContent = `R$${mealItem.price.toFixed(2).replace('.', ',')}`;

            // Configura o botão de remover para admins
            const removeButton = card.querySelector('.remove-item-button');
            if (removeButton) {
                removeButton.dataset.itemId = mealItem.id;
            }
        }
    } catch (error) {
        console.error('Erro ao carregar ou popular meal-card:', error);
    }
}

// Esta função agora recebe os dados diretamente (do fetch)
async function renderMealCardsWithAnimation(products, gridContainer) {
    gridContainer.style.opacity = '0';
    gridContainer.style.transition = 'opacity 0.3s ease-out';
    
    setTimeout(async () => {
        gridContainer.innerHTML = ''; // Limpa o grid antes de renderizar

        // Adicionar o card "+" se for ADMIN
        if (window.isAdmin) {
            const addCardPlaceholder = document.createElement('div');
            addCardPlaceholder.innerHTML = `
                <div class="meal-card add-new-item">
                    <i class="fas fa-plus add-new-item-icon"></i>
                    <span class="add-new-item-text">Adicionar Novo Produto</span>
                </div>
            `;
            gridContainer.appendChild(addCardPlaceholder.firstElementChild);
        }

        if (!products || products.length === 0) {
            // Se não houver produtos, exibe uma mensagem
            if (!window.isAdmin) { // Mostra a mensagem apenas para usuários normais
                 gridContainer.innerHTML = '<p class="placeholder-text" style="grid-column: 1 / -1; text-align: center;">Nenhum produto encontrado nesta categoria.</p>';
            }
        } else {
            for (const mealItem of products) {
                const tempDiv = document.createElement('div');
                gridContainer.appendChild(tempDiv);
                await loadAndPopulateMealCard(tempDiv, mealItem);
            }
        }
        
        gridContainer.style.opacity = '1';
    }, 300);
}

function moveMainUnderline(activeTitle) {
    const underline = document.querySelector('.category-underline');
    const mainCategoryTabs = document.querySelector('.main-category-tabs');
    if (!underline || !mainCategoryTabs || !activeTitle) return;
    const titleRect = activeTitle.getBoundingClientRect();
    const parentRect = mainCategoryTabs.getBoundingClientRect();
    underline.style.width = `${titleRect.width}px`;
    underline.style.transform = `translateX(${titleRect.left - parentRect.left}px)`;
}

function moveFilterUnderline(activeButton) {
    const underline = activeButton.closest('.meals-filters').querySelector('.filter-underline');
    const filterButtonsContainer = activeButton.closest('.meals-filters');
    if (!underline || !filterButtonsContainer || !activeButton) return;
    const buttonRect = activeButton.getBoundingClientRect();
    const parentRect = filterButtonsContainer.getBoundingClientRect();
    underline.style.width = `${buttonRect.width}px`;
    underline.style.transform = `translateX(${buttonRect.left - parentRect.left}px)`;
}

// Marcado como async
async function initMealsSection() { 
    const mainCategoryTitles = document.querySelectorAll('.main-category-title');
    const mealsFilterContents = document.querySelectorAll('.meals-filter-content');

    mainCategoryTitles.forEach(mainTitle => {
        mainTitle.addEventListener('click', async () => { 
            mainCategoryTitles.forEach(title => title.classList.remove('active'));
            mainTitle.classList.add('active');
            const selectedMainCategory = mainTitle.dataset.category;
            
            mealsFilterContents.forEach(content => {
                content.classList.remove('active');
                content.style.opacity = '0';
            });
            
            const activeContent = document.querySelector(`.meals-filter-content[data-content="${selectedMainCategory}"]`);
            if (activeContent) {
                activeContent.classList.add('active');
                setTimeout(async () => {
                    activeContent.style.opacity = '1';
                    const firstFilterButton = activeContent.querySelector('.filter-button');
                    if (firstFilterButton) {
                        activeContent.querySelectorAll('.filter-button').forEach(btn => btn.classList.remove('active'));
                        firstFilterButton.classList.add('active');
                        const subFilterCategory = firstFilterButton.dataset.filter;
                        const mealsGridContainer = activeContent.querySelector('.meals-grid-container');
                        
                        const products = await fetchMealData(selectedMainCategory, subFilterCategory);
                        renderMealCardsWithAnimation(products, mealsGridContainer);
                        moveFilterUnderline(firstFilterButton);
                    }
                }, 150);
            }
            
            moveMainUnderline(mainTitle);
        });
    });

    mealsFilterContents.forEach(content => {
        const mealsFiltersDiv = content.querySelector('.meals-filters');
        if (!mealsFiltersDiv.querySelector('.filter-underline')) {
            const underlineDiv = document.createElement('div');
            underlineDiv.classList.add('filter-underline');
            mealsFiltersDiv.appendChild(underlineDiv);
        }
        mealsFiltersDiv.addEventListener('click', async (event) => { 
            const clickedButton = event.target.closest('.filter-button');
            if (clickedButton && mealsFiltersDiv.contains(clickedButton)) {
                const filterButtons = mealsFiltersDiv.querySelectorAll('.filter-button');
                filterButtons.forEach(btn => btn.classList.remove('active'));
                clickedButton.classList.add('active');
                const currentMainCategory = document.querySelector('.main-category-title.active').dataset.category;
                const filterCategory = clickedButton.dataset.filter;
                const mealsGridContainer = content.querySelector('.meals-grid-container');
                
                const products = await fetchMealData(currentMainCategory, filterCategory);
                renderMealCardsWithAnimation(products, mealsGridContainer);
                moveFilterUnderline(clickedButton);
            }
        });
    });

    // Lógica para carregar o conteúdo inicial
    const initialMainCategory = document.querySelector('.main-category-title.active');
    if (initialMainCategory) {
        initialMainCategory.click(); // Simula o clique para carregar os dados iniciais
    }
}