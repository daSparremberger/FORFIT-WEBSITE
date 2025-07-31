// js/profile.js

// Funções duplicadas de meals.js para garantir que estejam disponíveis aqui.
// O ideal é ter um arquivo de "utils" ou usar módulos ES6.
async function loadAndPopulateMealCardForProfile(placeholderElement, mealItem, isAdminView = false) {
    try {
        const response = await fetch('../components/meal-card.html');
        const html = await response.text();
        placeholderElement.innerHTML = html;

        const card = placeholderElement.querySelector('.meal-card');
        if (card) {
            card.dataset.itemId = mealItem.id;
            card.querySelector('.meal-card-image').src = mealItem.photo_url || '../img/placeholder.png'; // Fallback image
            card.querySelector('.meal-card-image').alt = mealItem.title;
            card.querySelector('.meal-card-title').textContent = mealItem.title;
            card.querySelector('.meal-card-code').textContent = `#${mealItem.id}`;
            card.querySelector('.meal-card-price').textContent = `R$${mealItem.price ? mealItem.price.toFixed(2).replace('.', ',') : '0,00'}`;

            const removeButton = card.querySelector('.remove-item-button');
            const addButton = card.querySelector('.meal-card-button'); // Botão de adicionar ao carrinho

            // NOVO: Botão de Edição de Produto para Admin View
            // Esta lógica DEVE ser controlada APENAS nas novas páginas de admin/products.html
            // e seu products-page.js. Aqui, no profile.js, esta função será chamada apenas para "Favoritos".
            // Para favoritos, o botão de edição não faz sentido no card, então vamos garantir que não apareça.
            // O removeButton para favoritos já está ajustado.
            if (isAdminView) { // Isso só seria true se esta função fosse usada em produtos admin, o que não é mais o caso no profile.js
                // Lógica para admin products view (mantida caso haja um uso futuro, mas não ativa no profile.js)
                let editProductButton = document.createElement('button');
                editProductButton.classList.add('edit-product-button', 'action-button'); 
                editProductButton.dataset.itemId = mealItem.id;
                editProductButton.innerHTML = '<i class="fas fa-edit"></i>'; 
                // A posição deste botão seria ajustada no CSS ou com um container específico no meal-card.html para esta view
                card.appendChild(editProductButton); 
                
                if (removeButton) {
                    removeButton.style.display = 'flex'; 
                    removeButton.dataset.itemId = mealItem.id;
                    removeButton.dataset.itemTitle = mealItem.title; 
                }
                if (addButton) {
                    addButton.style.display = 'none'; 
                }
            } else { // Visão de favoritos do cliente (isAdminView é false aqui)
                 if (removeButton) { 
                    removeButton.style.display = 'flex'; 
                    removeButton.innerHTML = '<i class="fas fa-heart-broken"></i>'; 
                    removeButton.dataset.itemId = mealItem.id;
                    removeButton.dataset.itemTitle = mealItem.title;
                    removeButton.classList.add('remove-favorite-button'); 
                    removeButton.classList.remove('remove-item-button'); 
                }
                if (addButton) {
                    addButton.style.display = 'flex'; // Garante que o botão de adicionar ao carrinho esteja visível
                }
            }
        }
    } catch (error) {
        console.error('Erro ao carregar ou popular meal-card para perfil:', error);
    }
}


// Esta função renderProductsGrid agora será usada APENAS para a aba Favoritos no profile.html
// A lógica para Gerenciar Produtos (admin) será movida para products-page.js
async function renderProductsGrid(products, gridContainer) { // Remove isAdminView, pois será sempre false aqui
    gridContainer.innerHTML = ''; // Limpa o grid antes de renderizar
    
    // Gerencia o placeholder-text
    const placeholder = gridContainer.querySelector('.placeholder-text');
    if (products && products.length > 0) {
        if (placeholder) placeholder.style.display = 'none';
    } else {
        if (placeholder) placeholder.style.display = 'block';
        return; 
    }

    for (const mealItem of products) {
        const tempDiv = document.createElement('div');
        gridContainer.appendChild(tempDiv);
        await loadAndPopulateMealCardForProfile(tempDiv, mealItem, false); // Sempre false para isAdminView aqui
    }
}


function initProfilePage() {
    const profileNavLinks = document.querySelectorAll('.profile-nav-list .nav-link');
    const tabContents = document.querySelectorAll('.tab-content');
    const logoutLink = document.getElementById('logout-link');
    const displayUsername = document.getElementById('display-username');
    const displayEmail = document.getElementById('display-email');
    const displayRole = document.getElementById('display-role');
    const adminOnlyElements = document.querySelectorAll('.admin-only');

    const accessToken = localStorage.getItem('accessToken');
    const userRole = localStorage.getItem('userRole');
    const userId = localStorage.getItem('userId'); 

    let monthlyBillingChart = null; 
    const urlBase = 'http://localhost:3000/api/';

    console.log('--- Initializing Profile Page ---');
    console.log('profileNavLinks (capturados):', profileNavLinks); 
    console.log('tabContents (capturados):', tabContents); 


    // --- Funções de UI (Modais) ---
    // openModal e closeModal são funções auxiliares que podem ser definidas globalmente
    // ou importadas. Para o contexto do profile.js, elas são usadas internamente
    // para a lógica dos modais de formulário de produto/promoção (que agora são ativados em outras páginas).
    // As chamadas de closeModal no script do profile.html precisam dessas funções globais.
    window.openModal = function(modalId) { // Tornando global para acesso do profile.html
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('show');
    }

    window.closeModal = function(modalId) { // Tornando global para acesso do profile.html
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('show');
    }


    // --- Funções de UI para Abas ---

    function showTab(tabId) {
        console.log(`showTab chamada para: ${tabId}`); 
        tabContents.forEach(content => {
            content.classList.remove('active');
            // Limpa TODO o conteúdo das seções, exceto para 'personal-info'
            // Isso garante que não haja duplicação de elementos fixos que seriam recriados pelo JS
            if (content.id !== 'personal-info') {
                content.innerHTML = ''; 
            }
        });
        const activeTab = document.getElementById(tabId);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        profileNavLinks.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.tab === tabId) {
                link.classList.add('active');
            }
        });
        
        loadTabContent(tabId);
    }

    function showErrorMessage(element, message) {
        if (element) {
            element.textContent = message;
            element.classList.add('show');
            setTimeout(() => element.classList.remove('show'), 4000);
        }
    }

    // --- Funções de Carregamento de Dados (integração com Backend) ---

    async function loadTabContent(tabId) {
        console.log(`loadTabContent para: ${tabId}`); 

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        };

        const currentTabSection = document.getElementById(tabId);
        if (!currentTabSection) {
            console.error(`Seção da aba ${tabId} não encontrada no DOM.`);
            return;
        }

        try {
            // Monta o esqueleto da aba com TÍTULO e BOTOES AQUI
            switch (tabId) {
                case 'personal-info':
                    // Conteúdo fixo no HTML, não precisa de rebuild.
                    // Apenas atualiza os campos na loadUserProfileAndInitialData
                    break;
                case 'addresses':
                    currentTabSection.innerHTML = `
                        <h1>Meus Endereços</h1>
                        <button class="add-new-address-button action-button"><i class="fas fa-plus"></i> Adicionar Novo Endereço</button>
                        <div class="address-list">
                            <p class="placeholder-text">Carregando endereços...</p>
                        </div>
                    `;
                    const addressesResponse = await fetch(`${urlBase}user/addresses`, { headers });
                    if (!addressesResponse.ok) throw new Error('Erro ao carregar endereços.');
                    const addresses = await addressesResponse.json();
                    renderAddresses(addresses, currentTabSection.querySelector('.address-list'));
                    break;
                case 'payment-methods':
                    currentTabSection.innerHTML = `
                        <h1>Minhas Formas de Pagamento</h1>
                        <button class="add-new-payment-method-button action-button"><i class="fas fa-plus"></i> Adicionar Nova Forma de Pagamento</button>
                        <div class="payment-list">
                            <p class="placeholder-text">Carregando formas de pagamento...</p>
                        </div>
                    `;
                    const paymentsResponse = await fetch(`${urlBase}user/payment-methods`, { headers });
                    if (!paymentsResponse.ok) throw new Error('Erro ao carregar formas de pagamento.');
                    const paymentMethods = await paymentsResponse.json();
                    renderPaymentMethods(paymentMethods, currentTabSection.querySelector('.payment-list'));
                    break;
                case 'order-history':
                    currentTabSection.innerHTML = `
                        <h1>Meu Histórico de Pedidos</h1>
                        <div class="order-list">
                            <p class="placeholder-text">Carregando histórico de pedidos...</p>
                        </div>
                    `;
                    const ordersResponse = await fetch(`${urlBase}user/orders`, { headers });
                    if (!ordersResponse.ok) throw new Error('Erro ao carregar histórico de pedidos.');
                    const orderHistory = await ordersResponse.json();
                    renderOrderHistory(orderHistory, currentTabSection.querySelector('.order-list'));
                    break;
                case 'favorites':
                    currentTabSection.innerHTML = `
                        <h1>Meus Produtos Favoritos</h1>
                        <div class="favorites-grid meals-grid-container">
                            <p class="placeholder-text">Carregando favoritos...</p>
                        </div>
                    `;
                    const favoritesResponse = await fetch(`${urlBase}user/favorites`, { headers });
                    if (!favoritesResponse.ok) throw new Error('Erro ao carregar favoritos.');
                    const favorites = await favoritesResponse.json();
                    const favoritesGrid = currentTabSection.querySelector('.favorites-grid');
                    await renderProductsGrid(favorites, favoritesGrid); // isAdminView é false para favoritos
                    break;
                case 'manage-products': 
                case 'manage-promotions': 
                case 'image-bank': 
                    // Estas abas agora são links diretos para outras páginas HTML.
                    // Não há conteúdo a ser renderizado aqui. O navegador cuidará da navegação.
                    console.log(`Aba ${tabId} é um link externo. Não há renderização de conteúdo aqui.`);
                    break;
                case 'monthly-billing': // Admin - permanece aqui
                    if (userRole !== 'admin') { alert('Acesso negado.'); return; }
                    currentTabSection.innerHTML = `
                        <h1>Faturamento Mensal</h1>
                        <div class="billing-data">
                            <canvas id="monthly-billing-chart"></canvas>
                            <p class="placeholder-text" id="billing-placeholder-text">Carregando dados de faturamento...</p>
                        </div>
                    `;
                    const billingResponse = await fetch(`${urlBase}admin/billing/monthly`, { headers });
                    if (!billingResponse.ok) throw new Error('Erro ao carregar faturamento mensal.');
                    const billingData = await billingResponse.json();
                    renderMonthlyBillingChart(billingData, currentTabSection.querySelector('#monthly-billing-chart'), currentTabSection.querySelector('#billing-placeholder-text'));
                    break;
                case 'all-orders': // Admin - permanece aqui
                    if (userRole !== 'admin') { alert('Acesso negado.'); return; }
                    currentTabSection.innerHTML = `
                        <h1>Todos os Pedidos</h1>
                        <div class="admin-order-list">
                            <p class="placeholder-text">Carregando pedidos...</p>
                        </div>
                    `;
                    const allOrdersResponse = await fetch(`${urlBase}admin/orders`, { headers });
                    if (!allOrdersResponse.ok) throw new Error('Erro ao carregar todos os pedidos para admin.');
                    const allOrders = await allOrdersResponse.json();
                    renderAllOrders(allOrders, currentTabSection.querySelector('.admin-order-list'));
                    break;
                default:
                    console.log('Aba não reconhecida:', tabId);
            }
        } catch (error) {
            console.error(`Erro ao carregar conteúdo da aba ${tabId}:`, error); 
            alert(`Não foi possível carregar os dados para esta aba: ${error.message}`);
            const placeholder = currentTabSection.querySelector('.placeholder-text');
            if (placeholder) {
                placeholder.textContent = `Erro ao carregar dados: ${error.message}`;
                placeholder.style.display = 'block';
            }
        }
    }


    // --- Funções de Renderização que preenchem as DIVs de lista ---

    function renderAddresses(addresses, parentDiv) {
        parentDiv.innerHTML = ''; 
        if (addresses.length === 0) {
            parentDiv.innerHTML = `<p class="placeholder-text">Nenhum endereço cadastrado. Clique em "Adicionar Novo Endereço".</p>`;
            return;
        }
        addresses.forEach(address => {
            const addressDiv = document.createElement('div');
            addressDiv.classList.add('list-item-card'); 
            addressDiv.innerHTML = `
                <p><strong>Rua:</strong> ${address.street}, ${address.number} ${address.complement ? `(${address.complement})` : ''}</p>
                <p><strong>Bairro:</strong> ${address.neighborhood}</p>
                <p><strong>Cidade/Estado:</strong> ${address.city} - ${address.state}</p>
                <p><strong>CEP:</strong> ${address.zip_code}</p>
                <p>${address.is_default ? '<span class="default-badge">Padrão</span>' : ''}</p>
                <div class="item-actions">
                    <button class="edit-address-button action-button" data-id="${address.id}"><i class="fas fa-edit"></i> Editar</button>
                    <button class="delete-address-button action-button" data-id="${address.id}"><i class="fas fa-trash-alt"></i> Remover</button>
                </div>
            `;
            parentDiv.appendChild(addressDiv);
        });
    }

    function renderPaymentMethods(paymentMethods, parentDiv) {
        parentDiv.innerHTML = '';
        if (paymentMethods.length === 0) {
            parentDiv.innerHTML = `<p class="placeholder-text">Nenhuma forma de pagamento cadastrada. Clique em "Adicionar Nova Forma de Pagamento".</p>`;
            return;
        }
        paymentMethods.forEach(pm => {
            const pmDiv = document.createElement('div');
            pmDiv.classList.add('list-item-card'); 
            pmDiv.innerHTML = `
                <p><strong>Tipo:</strong> ${pm.method_type}</p>
                ${pm.card_brand ? `<p><strong>Bandeira:</strong> ${pm.card_brand}</p>` : ''}
                ${pm.last_four_digits ? `<p><strong>Final:</strong> **** **** **** ${pm.last_four_digits}</p>` : ''}
                <p>${pm.is_default ? '<span class="default-badge">Padrão</span>' : ''}</p>
                <div class="item-actions">
                    <button class="delete-payment-method-button action-button" data-id="${pm.id}"><i class="fas fa-trash-alt"></i> Remover</button>
                </div>
            `;
            parentDiv.appendChild(pmDiv);
        });
    }

    async function renderOrderHistory(orders, parentDiv) {
        parentDiv.innerHTML = '';
        if (orders.length === 0) {
            parentDiv.innerHTML = `<p class="placeholder-text">Nenhum pedido realizado ainda.</p>`;
            return;
        }

        for (const order of orders) {
            const orderDiv = document.createElement('div');
            orderDiv.classList.add('list-item-card', 'order-card'); 
            orderDiv.innerHTML = `
                <h3>Pedido #${order.id} - <span class="order-date">${new Date(order.order_date).toLocaleDateString('pt-BR')} ${new Date(order.order_date).toLocaleTimeString('pt-BR')}</span></h3>
                <p><strong>Total:</strong> R$${order.total_amount.toFixed(2).replace('.', ',')}</p>
                <p><strong>Status:</strong> <span class="order-status ${order.status}">${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span></p>
                <ul class="order-items-list"></ul>
                <div class="item-actions">
                    <button class="view-order-details action-button" data-id="${order.id}"><i class="fas fa-info-circle"></i> Ver Detalhes</button>
                </div>
            `;
            parentDiv.appendChild(orderDiv);
        }
    }


    function renderAdminPromotions(promotions, parentDiv) {
        parentDiv.innerHTML = '';
        if (promotions.length === 0) {
            parentDiv.innerHTML = `<p class="placeholder-text">Nenhuma promoção cadastrada.</p>`;
            return;
        }
        promotions.forEach(promo => {
            const promoDiv = document.createElement('div');
            promoDiv.classList.add('list-item-card', 'promotion-card'); 
            promoDiv.innerHTML = `
                <h3>${promo.title} <span class="promo-status ${promo.is_active ? 'active' : 'inactive'}">${promo.is_active ? '(Ativa)' : '(Inativa)'}</span></h3>
                <p>${promo.description || 'Sem descrição.'}</p>
                <p>Desconto: <strong>${promo.discount_percentage ? `${promo.discount_percentage}%` : `R$${promo.discount_amount ? promo.discount_amount.toFixed(2).replace('.', ',') : 'N/A'}`}</strong></p>
                <p>Período: ${promo.start_date ? new Date(promo.start_date).toLocaleDateString('pt-BR') : 'N/A'} - ${promo.end_date ? new Date(promo.end_date).toLocaleDateString('pt-BR') : 'N/A'}</p>
                <div class="item-actions">
                    <button class="edit-promotion-button action-button" data-id="${promo.id}"><i class="fas fa-edit"></i> Editar</button>
                    <button class="toggle-promotion-status-button action-button" data-id="${promo.id}" data-active="${promo.is_active}">
                        <i class="fas ${promo.is_active ? 'fa-toggle-on' : 'fa-toggle-off'}"></i> ${promo.is_active ? 'Desativar' : 'Ativar'}
                    </button>
                    <button class="delete-promotion-button action-button" data-id="${promo.id}"><i class="fas fa-trash-alt"></i> Remover</button>
                </div>
            `;
            parentDiv.appendChild(promoDiv);
        });
    }

    function renderImageBank(images, parentDiv) {
        parentDiv.innerHTML = '';
        if (images.length === 0) {
            parentDiv.innerHTML = `<p class="placeholder-text">Nenhuma imagem no banco.</p>`;
            return;
        }
        images.forEach(img => {
            const imgItemDiv = document.createElement('div');
            imgItemDiv.classList.add('uploaded-image-item');
            imgItemDiv.innerHTML = `
                <img src="${img.url}" alt="${img.alt_text || 'Imagem'}" title="${img.url}">
                <button class="remove-image-button" data-id="${img.id}" data-url="${img.url}"><i class="fas fa-times"></i></button>
            `;
            parentDiv.appendChild(imgItemDiv);
        });
    }

    function renderMonthlyBillingChart(billingData, canvasElement, placeholderElement) {
        
        if (!billingData || billingData.length === 0) {
            placeholderElement.textContent = 'Não há dados de faturamento para exibir.';
            canvasElement.style.display = 'none';
            placeholderElement.style.display = 'block';
            if (monthlyBillingChart) {
                monthlyBillingChart.destroy(); 
                monthlyBillingChart = null;
            }
            return;
        }
        
        placeholderElement.style.display = 'none';
        canvasElement.style.display = 'block';

        const labels = billingData.map(data => data.month);
        const revenues = billingData.map(data => data.total_revenue);

        if (monthlyBillingChart) {
            monthlyBillingChart.destroy(); 
        }

        monthlyBillingChart = new Chart(canvasElement, { 
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Faturamento Mensal (R$)',
                    data: revenues,
                    backgroundColor: 'rgba(174, 34, 42, 0.8)', 
                    borderColor: '#AE222A',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Faturamento (R$)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Mês/Ano'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Faturamento de Pedidos Concluídos por Mês'
                    }
                }
            }
        });
    }

    async function renderAllOrders(orders, parentDiv) {
        parentDiv.innerHTML = '';
        if (orders.length === 0) {
            parentDiv.innerHTML = `<p class="placeholder-text">Nenhum pedido realizado.</p>`;
            return;
        }

        for (const order of orders) {
            const orderDiv = document.createElement('div');
            orderDiv.classList.add('list-item-card', 'admin-order-card'); 
            orderDiv.innerHTML = `
                <h3>Pedido #${order.id} - Cliente: ${order.username}</h3>
                <p><strong>Data:</strong> ${new Date(order.order_date).toLocaleDateString('pt-BR')} ${new Date(order.order_date).toLocaleTimeString('pt-BR')}</p>
                <p><strong>Total:</strong> R$${order.total_amount.toFixed(2).replace('.', ',')}</p>
                <p><strong>Status:</strong> <span class="order-status-text ${order.status}" data-order-id="${order.id}">${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span></p>
                <div class="admin-order-items-summary"></div>
                <div class="item-actions">
                    <button class="admin-view-order-details action-button" data-id="${order.id}"><i class="fas fa-info-circle"></i> Ver Detalhes</button>
                    <select class="admin-order-status-select" data-order-id="${order.id}">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pendente</option>
                        <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Em Processamento</option>
                        <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Concluído</option>
                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelado</option>
                    </select>
                    <button class="update-order-status-button action-button" data-id="${order.id}"><i class="fas fa-sync-alt"></i> Atualizar</button>
                </div>
            `;
            parentDiv.appendChild(orderDiv);
        }
    }


    // --- Lógica Inicial de Carregamento ---

    async function loadUserProfileAndInitialData() {
        if (!accessToken) {
            console.log('Nenhum accessToken encontrado, redirecionando para login.');
            alert('Você precisa estar logado para acessar esta página.');
            window.location.href = 'login.html'; 
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/api/user/profile', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
            });

            if (response.ok) {
                const userData = await response.json();
                console.log('Dados do usuário carregados:', userData); 
                if (displayUsername) displayUsername.value = userData.username;
                if (displayEmail) displayEmail.value = userData.email || userData.username; 
                if (displayRole) displayRole.value = userData.role || 'usuário';

                // Lógica de visibilidade para admin
                if (userData.role === 'admin') {
                    adminOnlyElements.forEach(el => {
                        el.style.display = 'list-item'; // Torna os itens da sidebar visíveis
                    });
                    console.log('Usuário é ADMIN. Elementos de admin na sidebar visíveis.'); 
                } else {
                    adminOnlyElements.forEach(el => {
                        el.style.display = 'none'; // Esconde para usuários comuns
                    });
                    console.log('Usuário é comum. Elementos de admin na sidebar escondidos.'); 
                }

                // Carrega o conteúdo da primeira aba ativa (ou a padrão)
                // Isso deve ser feito APÓS a visibilidade dos adminOnlyElements ser ajustada
                const initialActiveTab = document.querySelector('.profile-nav-list .nav-link.active');
                // IMPORTANTE: Só chama showTab para abas que são *internas* e *não* os links de admin agora externos
                if (initialActiveTab && !initialActiveTab.closest('.admin-only')) { 
                    showTab(initialActiveTab.dataset.tab);
                } else {
                    // Se a aba ativa inicial for uma que agora é link externo (ex: se o HTML padrão veio com "Gerenciar Produtos" ativo),
                    // force o carregamento de "Informações Pessoais".
                    showTab('personal-info'); 
                }

            } else if (response.status === 401 || response.status === 403) {
                console.error('Sessão expirada ou não autorizada:', response.status); 
                alert('Sessão expirada ou não autorizada. Faça login novamente.');
                localStorage.clear(); 
                window.location.href = 'login.html';
            } else {
                console.error('Erro ao carregar perfil:', response.status, response.statusText); 
                alert('Erro ao carregar informações do perfil.');
            }
        } catch (error) {
            console.error('Erro de rede ao carregar perfil:', error); 
            alert('Não foi possível conectar ao servidor para carregar o perfil.');
        }
    }


    // --- Event Listeners ---

    // Lógica para alternar abas
    profileNavLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            // Verifica se o link é para uma das novas páginas de admin
            // Se o link tem um `href` para `admin/` ou se está em um `.admin-only` nav-item,
            // e NÃO tem um `data-tab` ou o `data-tab` é um dos links externos
            const isExternalAdminLink = event.target.closest('.admin-only') || 
                                        (event.target.tagName === 'A' && event.target.href.includes('admin/'));
            
            if (isExternalAdminLink) {
                // Deixa o link HTML fazer a navegação normal (href)
                console.log('Link clicado é um link de navegação direta para admin. Deixando o navegador processar.');
                return; // Não impede o default
            }

            // Para as abas que são internas (com data-tab)
            event.preventDefault(); 
            const tabId = event.target.dataset.tab;
            if (tabId) {
                showTab(tabId);
            }
        });
    });

    // Lógica de logout
    if (logoutLink) {
        logoutLink.addEventListener('click', (event) => {
            event.preventDefault();
            localStorage.removeItem('accessToken');
            localStorage.removeItem('userRole');
            localStorage.removeItem('username');
            localStorage.removeItem('userId'); 
            window.isLoggedIn = false;
            window.isAdmin = false;
            alert('Você foi desconectado.');
            window.location.href = '../index.html'; 
        });
    }

    // Ações para botões dentro das abas (EDITAR, ADICIONAR, REMOVER)
    document.querySelector('.profile-content').addEventListener('click', async (event) => {
        const target = event.target;
        
        // --- Ações do Cliente Comum ---

        // Botão Editar Informações Pessoais
        if (target.classList.contains('edit-profile-button')) {
            alert('Funcionalidade de edição de perfil a ser implementada.');
        }

        // Botão Adicionar Novo Endereço
        if (target.classList.contains('add-new-address-button')) {
            alert('Abrir modal/formulário para adicionar endereço.');
        }
        // Botão Editar Endereço (delegado)
        if (target.classList.contains('edit-address-button')) {
            const addressId = target.dataset.id;
            alert(`Editar endereço com ID: ${addressId} (funcionalidade a ser implementada).`);
        }
        // Botão Remover Endereço (delegado)
        if (target.classList.contains('delete-address-button')) {
            const addressId = target.dataset.id;
            if (confirm('Tem certeza que deseja remover este endereço?')) {
                try {
                    const response = await fetch(`${urlBase}user/addresses/${addressId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                    });
                    if (!response.ok) {
                         const errorData = await response.json();
                         throw new Error(errorData.message || 'Erro ao remover endereço.');
                    }
                    alert('Endereço removido com sucesso!');
                    loadTabContent('addresses'); 
                } catch (error) {
                    alert(`Erro: ${error.message}`);
                }
            }
        }

        // Botão Adicionar Nova Forma de Pagamento
        if (target.classList.contains('add-new-payment-method-button')) {
            alert('Abrir modal/formulário para adicionar forma de pagamento.');
        }
        // Botão Remover Forma de Pagamento
        if (target.classList.contains('delete-payment-method-button')) {
            const paymentMethodId = target.dataset.id;
            if (confirm('Tem certeza que deseja remover esta forma de pagamento?')) {
                try {
                    const response = await fetch(`${urlBase}user/payment-methods/${paymentMethodId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                    });
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Erro ao remover forma de pagamento.');
                    }
                    alert('Forma de pagamento removida com sucesso!');
                    loadTabContent('payment-methods'); 
                } catch (error) {
                    alert(`Erro: ${error.message}`);
                }
            }
        }

        // Botão Ver Detalhes do Pedido (Histórico de Pedidos - Cliente)
        if (target.classList.contains('view-order-details')) {
            const orderId = target.dataset.id;
            const orderCard = target.closest('.order-card');
            const itemsListUl = orderCard.querySelector('.order-items-list');

            if (itemsListUl.classList.contains('loaded')) {
                itemsListUl.classList.toggle('show-items');
                target.textContent = itemsListUl.classList.contains('show-items') ? 'Esconder Detalhes' : 'Ver Detalhes';
                return;
            }

            try {
                const detailsResponse = await fetch(`${urlBase}user/orders/${orderId}`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                if (!detailsResponse.ok) {
                    const errorData = await detailsResponse.json();
                    throw new Error(errorData.message || 'Erro ao carregar detalhes do pedido.');
                }
                const detailedOrder = await detailsResponse.json();
                
                itemsListUl.innerHTML = ''; 
                if (detailedOrder.items && detailedOrder.items.length > 0) {
                    detailedOrder.items.forEach(item => {
                        const li = document.createElement('li');
                        li.innerHTML = `
                            <img src="${item.photo_url || '../img/placeholder.png'}" alt="${item.title}" class="order-item-img">
                            <span>${item.quantity}x ${item.title}</span>
                            <span class="item-price">R$${item.price_at_order.toFixed(2).replace('.', ',')}</span>
                        `;
                        itemsListUl.appendChild(li);
                    });
                    itemsListUl.classList.add('loaded', 'show-items'); 
                    target.textContent = 'Esconder Detalhes';
                } else {
                    itemsListUl.innerHTML = '<li>Nenhum item encontrado para este pedido.</li>';
                }
            } catch (error) {
                alert(`Erro ao carregar detalhes do pedido: ${error.message}`);
            }
        }

        // Botão Remover de Favoritos (no favourites-grid)
        if (target.classList.contains('remove-favorite-button')) {
            const productId = target.dataset.itemId;
            const productName = target.dataset.itemTitle;
             if (confirm(`Tem certeza que deseja remover "${productName}" dos seus favoritos?`)) {
                try {
                    const response = await fetch(`${urlBase}user/favorites/${productId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                    });
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Erro ao remover dos favoritos.');
                    }
                    alert(`${productName} removido dos favoritos!`);
                    loadTabContent('favorites'); 
                } catch (error) {
                    alert(`Erro: ${error.message}`);
                }
            }
        }


        // --- Ações para Admin (Apenas para abas que permanecem no profile.html) ---
        if (userRole === 'admin') {
            // Botão Ver Detalhes Completos (Pedidos Admin)
            if (target.classList.contains('admin-view-order-details')) {
                const orderId = target.dataset.id;
                const orderCard = target.closest('.admin-order-card');
                const itemsSummaryDiv = orderCard.querySelector('.admin-order-items-summary');

                if (itemsSummaryDiv.classList.contains('loaded')) {
                    itemsSummaryDiv.classList.toggle('show-items');
                    target.textContent = itemsSummaryDiv.classList.contains('show-items') ? 'Esconder Detalhes' : 'Ver Detalhes';
                    return;
                }

                try {
                    const orderDetailsResponse = await fetch(`${urlBase}admin/orders/${orderId}`, {
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                    });
                    if (!orderDetailsResponse.ok) {
                        const errorData = await orderDetailsResponse.json();
                        throw new Error(errorData.message || 'Erro ao carregar detalhes do pedido.');
                    }
                    const orderDetails = await orderDetailsResponse.json();
                    
                    itemsSummaryDiv.innerHTML = '<h4>Itens do Pedido:</h4>';
                    const itemsListUl = document.createElement('ul');
                    itemsListUl.classList.add('order-items-list');

                    if (orderDetails.items && orderDetails.items.length > 0) {
                        orderDetails.items.forEach(item => {
                            const li = document.createElement('li');
                            li.innerHTML = `
                                <img src="${item.photo_url || '../img/placeholder.png'}" alt="${item.title}" class="order-item-img">
                                <span>${item.quantity}x ${item.title}</span>
                                <span class="item-price">R$${item.price_at_order.toFixed(2).replace('.', ',')}</span>
                            `;
                            itemsListUl.appendChild(li);
                        });
                        itemsSummaryDiv.appendChild(itemsListUl);
                        itemsSummaryDiv.classList.add('loaded', 'show-items');
                        target.textContent = 'Esconder Detalhes';
                    } else {
                        itemsSummaryDiv.innerHTML += '<p>Nenhum item encontrado para este pedido.</p>';
                    }

                    itemsSummaryDiv.innerHTML += `
                        <h4>Endereço de Entrega:</h4>
                        <p>${orderDetails.street}, ${orderDetails.number} ${orderDetails.complement ? `(${orderDetails.complement})` : ''}</p>
                        <p>${orderDetails.neighborhood}, ${orderDetails.city} - ${orderDetails.state}, ${orderDetails.zip_code}</p>
                        <h4>Forma de Pagamento:</h4>
                        <p>${orderDetails.method_type} ${orderDetails.card_brand ? `(${orderDetails.card_brand} Final: ${orderDetails.last_four_digits})` : ''}</p>
                    `;

                } catch (error) {
                    alert(`Erro ao carregar detalhes do pedido: ${error.message}`);
                }
            }
            // Botão Atualizar Status do Pedido (Pedidos Admin)
            if (target.classList.contains('update-order-status-button')) {
                const orderId = target.dataset.id;
                const statusSelect = document.querySelector(`.admin-order-status-select[data-order-id="${orderId}"]`);
                const newStatus = statusSelect ? statusSelect.value : null;

                if (!newStatus) {
                    return alert('Selecione um status válido.');
                }

                if (confirm(`Confirmar atualização do status do pedido ${orderId} para "${newStatus}"?`)) {
                    try {
                        const response = await fetch(`${urlBase}admin/orders/${orderId}/status`, {
                            method: 'PATCH',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${accessToken}`
                            },
                            body: JSON.stringify({ status: newStatus })
                        });
                        if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.message || 'Erro ao atualizar status do pedido.');
                        }
                        alert('Status do pedido atualizado com sucesso!');
                        loadTabContent('all-orders'); 
                    } catch (error) {
                        alert(`Erro: ${error.message}`);
                    }
                }
            }
        } // Fim do if userRole === 'admin'
    });

    // As funções setupProductFormForCreation/Edit, setupPromotionFormForCreation/Edit
    // NÃO SÃO MAIS CHAMADAS AQUI. Elas serão movidas para os JS das novas páginas de admin.
    // Mantenho os stubs vazios para não causar ReferenceError se alguma outra parte do código ainda chamar.
    function setupProductFormForCreation() { console.warn("setupProductFormForCreation chamado, mas a lógica foi movida."); }
    function setupProductFormForEdit(productId) { console.warn("setupProductFormForEdit chamado, mas a lógica foi movida."); }
    function setupPromotionFormForCreation() { console.warn("setupPromotionFormForCreation chamado, mas a lógica foi movida."); }
    function setupPromotionFormForEdit(promotionId) { console.warn("setupPromotionFormForEdit chamado, mas a lógica foi movida."); }


    // Chama a função principal de carregamento ao inicializar
    loadUserProfileAndInitialData();
}