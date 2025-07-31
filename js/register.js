// js/register.js

let registerPasswordInput;
let registerConfirmPasswordInput;
let showPasswordCheckbox;

function initRegisterModal() { 
    const registerForm = document.querySelector('.register-form');
    registerPasswordInput = document.querySelector('#register-password');
    registerConfirmPasswordInput = document.querySelector('#register-confirm-password');
    showPasswordCheckbox = document.querySelector('#show-password');
    const registerErrorMessage = document.querySelector('.register-error-message');
    const openLoginLink = document.querySelector('.open-login-modal'); 

    if (showPasswordCheckbox && registerPasswordInput && registerConfirmPasswordInput) {
        showPasswordCheckbox.addEventListener('change', () => {
            const type = showPasswordCheckbox.checked ? 'text' : 'password';
            registerPasswordInput.type = type;
            registerConfirmPasswordInput.type = type;
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
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
                const username = email; 

                const response = await fetch('http://localhost:3000/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password }),
                });

                const data = await response.json();

                if (response.ok) { 
                    alert('Cadastro realizado com sucesso! Agora faça login.');
                    window.location.href = 'login.html'; 
                } else { 
                    if (registerErrorMessage) {
                        registerErrorMessage.textContent = data.message || 'Erro ao cadastrar. Tente novamente.';
                        registerErrorMessage.classList.add('show');
                        setTimeout(() => registerErrorMessage.classList.remove('show'), 3000);
                    }
                }
            } catch (error) {
                console.error('Erro na requisição de cadastro:', error);
                if (registerErrorMessage) {
                    registerErrorMessage.textContent = 'Não foi possível conectar ao servidor. Verifique o backend ou sua conexão.';
                    registerErrorMessage.classList.add('show');
                    setTimeout(() => registerErrorMessage.classList.remove('show'), 4000);
                }
            }
        });
    }

    if (openLoginLink) {
        openLoginLink.addEventListener('click', (event) => {
            event.preventDefault();
            window.location.href = 'login.html';
        });
    }
}