let loginModal;

function showLoginModal() {
    if (loginModal) {
        loginModal.classList.add('show');
        // Opcional: limpar campos e mensagens de erro ao abrir
        loginModal.querySelector('#username').value = '';
        loginModal.querySelector('#password').value = '';
        const errorMessage = loginModal.querySelector('.login-error-message');
        if (errorMessage) {
            errorMessage.classList.remove('show');
        }
    }
}

function hideLoginModal() {
    if (loginModal) {
        loginModal.classList.remove('show');
    }
}

function initLoginModal() {
    loginModal = document.querySelector('.login-modal');
    const closeButton = loginModal ? loginModal.querySelector('.close-button') : null;
    const loginForm = loginModal ? loginModal.querySelector('.login-form') : null;
    const errorMessage = loginModal ? loginModal.querySelector('.login-error-message') : null;
    const openRegisterLink = loginModal ? loginModal.querySelector('.open-register-modal') : null;


    if (closeButton) {
        closeButton.addEventListener('click', hideLoginModal);
    }

    if (loginModal) {
        loginModal.addEventListener('click', (event) => {
            if (event.target === loginModal) { // Clicou fora do conteúdo do modal
                hideLoginModal();
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => { // Adicionado 'async'
            event.preventDefault(); // Previne o comportamento padrão do formulário
            const usernameInput = loginForm.querySelector('#username');
            const passwordInput = loginForm.querySelector('#password');
            const username = usernameInput.value;
            const password = passwordInput.value;

            try {
                const response = await fetch('http://localhost:3000/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password }),
                });

                const data = await response.json();

                if (response.ok) { // Status 200 OK
                    window.isLoggedIn = true;
                    window.isAdmin = (data.user.role === 'admin'); // Define isAdmin baseado no role do backend

                    // Armazenar no localStorage (para persistência entre recarregamentos)
                    localStorage.setItem('accessToken', data.accessToken);
                    localStorage.setItem('userRole', data.user.role);
                    localStorage.setItem('username', data.user.username); // Opcional, para exibir nome de usuário

                    hideLoginModal();
                    // alert(`Login bem-sucedido! Bem-vindo, ${data.user.username}!`); // Removido para não ser intrusivo

                    // Chamar funções para atualizar a UI
                    // updateHeaderUIForLogin será criada em js/header.js
                    if (typeof updateHeaderUIForLogin === 'function') {
                        updateHeaderUIForLogin();
                    }
                    // Re-inicializar seções que dependem do status de admin
                    if (typeof initAdminPanel === 'function') {
                        initAdminPanel(); // Ativa/desativa funcionalidades admin
                    }
                    if (typeof initMealsSection === 'function') {
                        initMealsSection(); // Re-renderiza cards para modo admin/usuário
                    }

                } else { // Erro do backend (ex: 400, 401, 403)
                    if (errorMessage) {
                        errorMessage.textContent = data.message || 'Erro ao fazer login. Tente novamente.';
                        errorMessage.classList.add('show');
                        // Esconde a mensagem de erro após alguns segundos
                        setTimeout(() => errorMessage.classList.remove('show'), 3000);
                    }
                }
            } catch (error) {
                console.error('Erro na requisição de login:', error);
                if (errorMessage) {
                    errorMessage.textContent = 'Não foi possível conectar ao servidor. Verifique o backend ou sua conexão.';
                    errorMessage.classList.add('show');
                    setTimeout(() => errorMessage.classList.remove('show'), 4000);
                }
            }
        });
    }

    // Link para abrir o modal de cadastro (do login) - Adicionei essa classe no login.html
    if (openRegisterLink) {
        openRegisterLink.addEventListener('click', (event) => {
            event.preventDefault();
            hideLoginModal();
            if (typeof showRegisterModal === 'function') { // showRegisterModal será definida em register.js
                showRegisterModal();
            }
        });
    }
}