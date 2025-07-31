// js/header.js

let userIconLink; // Declarado globalmente para ser acessível por updateHeaderUIForLogin e initHeader

function updateHeaderUIForLogin() {
    const accessToken = localStorage.getItem('accessToken');
    const username = localStorage.getItem('username');
    const userRole = localStorage.getItem('userRole'); 

    if (!userIconLink) {
        // Se userIconLink ainda não foi inicializado, tenta pegá-lo aqui também
        // Isso é uma medida de segurança, mas initHeader() é o local ideal para sua primeira atribuição.
        userIconLink = document.querySelector('.header-right .header-icon-link[aria-label="Minha Conta"]');
        if (!userIconLink) {
            console.error('userIconLink não encontrado no header!');
            return; // Sai da função se o link do ícone de usuário não for encontrado
        }
    }

    // Remova todos os listeners de clique para evitar duplicação antes de adicionar o correto
    userIconLink.removeEventListener('click', handleUserIconClick);
    userIconLink.removeEventListener('click', handleProfileClick);

    if (accessToken && username) {
        window.isLoggedIn = true;
        window.isAdmin = (userRole === 'admin'); 
        
        document.body.classList.add('logged-in');
        document.body.classList.toggle('admin-mode', window.isAdmin);

        // Atualiza o HTML e o href do link do ícone de usuário
        userIconLink.innerHTML = `<i class="fas fa-user-circle"></i>`; // Ícone de usuário logado
        userIconLink.setAttribute('href', 'pages/profile.html'); // Redireciona para a página de perfil

        userIconLink.addEventListener('click', handleProfileClick); // Adiciona o listener de perfil
    } else {
        window.isLoggedIn = false;
        window.isAdmin = false;
        document.body.classList.remove('logged-in');
        document.body.classList.remove('admin-mode');

        // Atualiza o HTML e o href do link do ícone de usuário
        userIconLink.innerHTML = `<i class="fas fa-user"></i>`; // Ícone de usuário não logado
        userIconLink.setAttribute('href', 'pages/register.html'); // Redireciona para a página de registro
        
        userIconLink.addEventListener('click', handleUserIconClick); // Adiciona o listener de registro
    }
}

// Handler para clique no ícone quando o usuário NÃO ESTÁ logado (redireciona para a página de registro)
function handleUserIconClick(event) {
    //event.preventDefault(); // Com o href setado, o preventDefault pode ser opcional, mas garante o JS primeiro.
    // O redirecionamento já é feito pelo href do link, mas podemos forçar aqui se quisermos.
    // window.location.href = 'pages/register.html'; 
}

// Handler para clique no ícone quando o usuário ESTÁ logado (redireciona para a página de perfil)
function handleProfileClick(event) {
    //event.preventDefault(); // Com o href setado, o preventDefault pode ser opcional, mas garante o JS primeiro.
    // O redirecionamento já é feito pelo href do link, mas podemos forçar aqui se quisermos.
    // window.location.href = 'pages/profile.html'; 
}


function initHeader() {
    const header = document.querySelector('.main-header');
    const dropdowns = document.querySelectorAll('.has-dropdown');
    const searchBox = document.querySelector('.search-box');
    const searchInput = document.querySelector('.search-input');
    const searchToggle = document.querySelector('.search-toggle');
    
    // CORREÇÃO: Seleciona o link do ícone de usuário de forma mais específica
    // Use o atributo aria-label para maior robustez, ou um ID se preferir.
    userIconLink = document.querySelector('.header-icon-link[aria-label="Minha Conta"]'); 
    
    if (!userIconLink) {
        console.error('Erro: Não foi possível encontrar o link do ícone de usuário no header.');
        return; // Impede que o resto do script cause erros se o elemento não for encontrado
    }

    let lastScrollY = 0;
    const stickyTrigger = 200;

    function handleScroll() {
        const currentScrollY = window.scrollY;
        if (currentScrollY > stickyTrigger) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
            header.classList.remove('hidden-on-scroll');
        }
        if (currentScrollY > stickyTrigger) {
            if (currentScrollY > lastScrollY) {
                header.classList.add('hidden-on-scroll');
            } else {
                header.classList.remove('hidden-on-scroll');
            }
        }
        lastScrollY = currentScrollY;
    }
    window.addEventListener('scroll', handleScroll);

    dropdowns.forEach(dropdown => {
        const navLink = dropdown.querySelector('.nav-link');
        navLink.addEventListener('mouseenter', () => {
            dropdown.classList.add('dropdown-active');
        });
        dropdown.addEventListener('mouseleave', () => {
            dropdown.classList.remove('dropdown-active');
        });
    });

    searchToggle.addEventListener('click', (event) => {
        event.stopPropagation();
        searchBox.classList.toggle('expanded');
        if (searchBox.classList.contains('expanded')) {
            searchInput.focus();
        } else {
            searchInput.value = '';
        }
    });
    document.addEventListener('click', (event) => {
        if (!searchBox.contains(event.target) && searchBox.classList.contains('expanded')) {
            searchBox.classList.remove('expanded');
            searchInput.value = '';
        }
    });
    searchInput.addEventListener('click', (event) => {
        event.stopPropagation();
    });

    // Chama a função para atualizar a UI do header com base no status de login/admin
    updateHeaderUIForLogin();
}