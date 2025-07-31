// js/admin.js

// Variável para simular o estado do painel de produtos (seria do backend)
const availableProducts = [
    { id: 'ap1', img: 'img/promo-salad.png', title: 'Salada de Quinoa Proteica', code: '#AP01', price: 'R$28,00', category: 'tradicional' },
    { id: 'ap2', img: 'img/promo-burger.png', title: 'Hambúrguer de Grão de Bico', code: '#AP02', price: 'R$32,00', category: 'low-carb' },
    { id: 'ap3', img: 'img/caldo-legumes.png', title: 'Sopa Detox de Legumes', code: '#AP03', price: 'R$20,00', category: 'caldos-sopas' },
    { id: 'ap4', img: 'img/cafe-latte.png', title: 'Espresso Macchiato', code: '#AP04', price: 'R$9,50', category: 'cafe-expresso' },
];

function initAdminPanel() {
    // Isso será chamado no DOMContentLoaded do index.html
    // e novamente após login/logout
    
    // Assegura que window.isAdmin reflete o localStorage
    window.isAdmin = (localStorage.getItem('userRole') === 'admin');

    if (!window.isAdmin) {
        document.body.classList.remove('admin-mode');
        return; 
    }

    document.body.classList.add('admin-mode'); // Adiciona classe ao body se for admin

    const confirmRemovePopup = document.getElementById('confirm-remove-popup');
    const confirmRemoveYes = document.getElementById('confirm-remove-yes');
    const confirmRemoveNo = document.getElementById('confirm-remove-no');
    let itemToRemoveId = null;
    let itemToRemoveElement = null;

    function showConfirmPopup(itemId, itemElement) {
        itemToRemoveId = itemId;
        itemToRemoveElement = itemElement;
        confirmRemovePopup.classList.add('show');
    }

    function hideConfirmPopup() {
        confirmRemovePopup.classList.remove('show');
        itemToRemoveId = null;
        itemToRemoveElement = null;
    }

    confirmRemoveYes.addEventListener('click', () => {
        if (itemToRemoveId && itemToRemoveElement) {
            itemToRemoveElement.remove();

            // Lógica mock para remover do mealData (em um backend real, seria uma API DELETE)
            const currentMainCategory = document.querySelector('.main-category-title.active').dataset.category;
            const currentSubFilter = itemToRemoveElement.closest('.meals-filter-content').querySelector('.filter-button.active').dataset.filter;
            
            if (mealData[currentMainCategory] && mealData[currentMainCategory][currentSubFilter]) {
                mealData[currentMainCategory][currentSubFilter] = mealData[currentMainCategory][currentSubFilter].filter(item => item.id !== itemToRemoveId);
            }
        }
        hideConfirmPopup();
    });

    confirmRemoveNo.addEventListener('click', hideConfirmPopup);

    document.body.addEventListener('click', (event) => {
        const removeButton = event.target.closest('.remove-item-button');
        if (removeButton && window.isAdmin) {
            const itemId = removeButton.dataset.itemId;
            const itemElement = removeButton.closest('.meal-card');
            showConfirmPopup(itemId, itemElement);
        }

        const addCard = event.target.closest('.meal-card.add-new-item');
        if (addCard && window.isAdmin) {
            alert('Funcionalidade de Adicionar Item (abriria modal de seleção de produto).');

            // Simula adição de um novo item
            const itemToAdd = availableProducts[Math.floor(Math.random() * availableProducts.length)]; 
            
            const currentMainCategory = document.querySelector('.main-category-title.active').dataset.category;
            const currentSubFilter = addCard.closest('.meals-filter-content').querySelector('.filter-button.active').dataset.filter;

            if (mealData[currentMainCategory] && mealData[currentMainCategory][currentSubFilter]) {
                mealData[currentMainCategory][currentSubFilter].push(itemToAdd);
                
                const mealsGridContainer = addCard.closest('.meals-grid-container');
                if (mealsGridContainer && typeof renderMealCardsWithAnimation === 'function') {
                    renderMealCardsWithAnimation(mealData[currentMainCategory][currentSubFilter], mealsGridContainer);
                }
            }
        }
    });
}