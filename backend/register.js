let registerModal;
let registerPasswordInput;
let registerConfirmPasswordInput;
let showPasswordCheckbox;

function showRegisterModal() {
    if (registerModal) {
        registerModal.classList.add('show');
        // Limpar campos e mensagens de erro ao abrir
        registerModal.querySelector('#register-email').value = '';
        registerPasswordInput.value = '';
        registerConfirmPasswordInput.value = '';
        const errorMessage = registerModal.querySelector('.register-error-message');
        if (errorMessage) {
            errorMessage.classList.remove('show');
        }
    }
}

function hideRegisterModal() {
    if (registerModal) {
        registerModal.classList.remove('show');
    }
}

function initRegisterModal() {
    registerModal = document.querySelector('.register-modal');
    const closeButton = registerModal ? registerModal.querySelector('.close-button') : null;
    const registerForm = registerModal ? registerModal.querySelector('.register-form') : null;
    registerPasswordInput = registerModal ? registerModal.querySelector('#register-password') : null;
    registerConfirmPasswordInput = registerModal ? registerModal.querySelector('#register-confirm-password') : null;
    showPasswordCheckbox = registerModal ? registerModal.querySelector('#show-password') : null;
    const registerErrorMessage = registerModal ? registerModal.querySelector('.register-error-message') : null;
    const openLoginLink = registerModal ? registerModal.querySelector('.open-login-modal') : null;


    if (closeButton) {
        closeButton.addEventListener('click', hideRegisterModal);
    }

    if (registerModal) {
        registerModal.addEventListener('click', (event) => {
            if (event.target === registerModal) {
                hideRegisterModal();
            }
        });
    }

    if (showPasswordCheckbox && registerPasswordInput && registerConfirmPasswordInput) {
        showPasswordCheckbox.addEventListener('change', () => {
            const type = showPasswordCheckbox.checked ? 'text' : 'password';
            registerPasswordInput.type = type;
            registerConfirmPasswordInput.type = type;
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => { // Adicionado 'async'
            event.preventDefault();
            const emailInput = registerForm.querySelector('#register-email');
            const email = emailInput.value;
            const password = registerPasswordInput.value;
            const confirmPassword = registerConfirmPasswordInput.value;

            if (password !== confirmPassword) {
                if (registerErrorMessage) {
                    registerErrorMessage.textContent = 'As senhas não coincidem.';
                    registerErrorMessage.classList.add('show');
                    setTimeout(() => registerErrorMessage.classList.remove('show'), 3000);
                }
                return;
            }

            try {
                // Usando o email como username para simplificar o registro
                const username = email; 

                const response = await fetch('http://localhost:3000/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password }),
                });

                const data = await response.json();

                if (response.ok) { // Status 201 Created
                    alert('Cadastro realizado com sucesso! Agora faça login.');
                    hideRegisterModal();
                    if (typeof showLoginModal === 'function') { // showLoginModal será definida em login.js
                        showLoginModal(); // Abre o modal de login após cadastro
                    }
                } else { // Erro do backend (ex: 400, 409)
                    if (registerErrorMessage) {
                        registerErrorMessage.textContent = data.message || 'Erro ao cadastrar. Tente novamente.';
                        registerErrorMessage.classList.add('show');
                        setTimeout(() => registerErrorMessage.classList.remove('show'), 3000);
                    }
                }
            } catch (error) {
                console.error('Erro na requisição de cadastro:', error);
                if (registerErrorMessage) {
                    registerErrorMessage.textContent = 'Não foi possível conectar ao servidor. Tente mais tarde.';
                    registerErrorMessage.classList.add('show');
                    setTimeout(() => registerErrorMessage.classList.remove('show'), 4000);
                }
            }
        });
    }

    // Link para abrir o modal de login (do cadastro)
    if (openLoginLink) {
        openLoginLink.addEventListener('click', (event) => {
            event.preventDefault();
            hideRegisterModal();
            if (typeof showLoginModal === 'function') {
                showLoginModal();
            }
        });
    }
}