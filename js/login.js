// js/login.js

function initLoginModal() { 
    const loginForm = document.querySelector('.login-form');
    const loginPasswordInput = document.querySelector('#password');
    const showPasswordCheckboxLogin = document.querySelector('#show-password-login');
    const errorMessage = document.querySelector('.login-error-message');
    const openRegisterLink = document.querySelector('.open-register-link'); 

    if (showPasswordCheckboxLogin && loginPasswordInput) {
        showPasswordCheckboxLogin.addEventListener('change', () => {
            loginPasswordInput.type = showPasswordCheckboxLogin.checked ? 'text' : 'password';
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => { 
            event.preventDefault(); 
            const usernameInput = loginForm.querySelector('#username');
            const username = usernameInput.value;
            const password = loginPasswordInput.value;

            try {
                const response = await fetch('http://localhost:3000/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password }),
                });

                const data = await response.json();

                if (response.ok) { 
                    window.isLoggedIn = true;
                    window.isAdmin = (data.user.role === 'admin');

                    localStorage.setItem('accessToken', data.accessToken);
                    localStorage.setItem('userRole', data.user.role);
                    localStorage.setItem('username', data.user.username);
                    localStorage.setItem('userId', data.user.id); // É bom guardar o ID também!

                    // CORREÇÃO AQUI: Redirecionar para a raiz do site
                    window.location.href = '../index.html'; // Altera de 'index.html' para '../index.html'

                } else { 
                    if (errorMessage) {
                        errorMessage.textContent = data.message || 'Erro ao fazer login. Tente novamente.';
                        errorMessage.classList.add('show');
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

    if (openRegisterLink) {
        openRegisterLink.addEventListener('click', (event) => {
            event.preventDefault();
            // CORREÇÃO AQUI (já estava certo, mas confirmando)
            window.location.href = 'register.html'; 
        });
    }
}