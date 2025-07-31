// js/cart-popup.js

function initCartPopup() {
    const popup = document.getElementById('add-to-cart-popup');
    const cartIcon = document.querySelector('.header-icon-link .fa-shopping-cart');

    let popupTimeout;

    document.body.addEventListener('click', (event) => {
        const clickedButton = event.target.closest('.meal-card-button');
        if (clickedButton) {
            event.preventDefault();

            clearTimeout(popupTimeout);
            popup.classList.add('show');
            popupTimeout = setTimeout(() => {
                popup.classList.remove('show');
            }, 3000);

            if (cartIcon) {
                const itemRect = clickedButton.getBoundingClientRect();
                const cartRect = cartIcon.getBoundingClientRect();

                const flyingItem = document.createElement('div');
                flyingItem.classList.add('flying-item');
                
                flyingItem.style.left = `${itemRect.left + itemRect.width / 2 - 15}px`;
                flyingItem.style.top = `${itemRect.top + itemRect.height / 2 - 15}px`;
                document.body.appendChild(flyingItem);

                void flyingItem.offsetWidth; 

                flyingItem.style.left = `${cartRect.left + cartRect.width / 2 - 15}px`;
                flyingItem.style.top = `${cartRect.top + cartRect.height / 2 - 15}px`;
                flyingItem.style.transform = `scale(0.2)`;
                flyingItem.style.opacity = `0`;

                flyingItem.addEventListener('transitionend', () => {
                    flyingItem.remove();
                });
            }
        }
    });
}