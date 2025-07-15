// Authentication functionality
let currentUser = null;

// Load authentication modal and initialize
async function loadAuthModal() {
    try {
        const response = await fetch('auth.html');
        const authHtml = await response.text();
        document.body.insertAdjacentHTML('beforeend', authHtml);
        initializeAuth();
    } catch (error) {
        console.error('Error loading auth modal:', error);
    }
}

// Initialize authentication
function initializeAuth() {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('brieflyAI_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateNavbarForLoggedInUser();
    }

    // Ensure correct initial form state
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const forgotForm = document.getElementById('forgotPasswordForm');
    
    if (loginForm) loginForm.classList.add('active');
    if (signupForm) signupForm.classList.remove('active');
    if (forgotForm) forgotForm.classList.remove('active');

    // Password strength checker
    const passwordInput = document.getElementById('signupPassword');
    if (passwordInput) {
        passwordInput.addEventListener('input', checkPasswordStrength);
    }

    // Confirm password validation
    const confirmPasswordInput = document.getElementById('confirmPassword');
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', validatePasswordMatch);
    }
}

// Open authentication modal
function openAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    } else {
        loadAuthModal().then(() => {
            setTimeout(() => openAuthModal(), 100);
        });
    }
}

// Close authentication modal
function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Switch between login and signup tabs
function switchTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const authTitle = document.getElementById('authTitle');
    const tabs = document.querySelectorAll('.auth-tab');

    // Remove active class from all tabs
    tabs.forEach(t => t.classList.remove('active'));
    
    // Add active class to the clicked tab
    tabs.forEach(t => {
        if ((tab === 'login' && t.textContent.includes('Sign In')) ||
            (tab === 'signup' && t.textContent.includes('Sign Up'))) {
            t.classList.add('active');
        }
    });

    if (tab === 'login') {
        loginForm.classList.add('active');
        signupForm.classList.remove('active');
        authTitle.textContent = 'Welcome Back';
    } else {
        signupForm.classList.add('active');
        loginForm.classList.remove('active');
        authTitle.textContent = 'Join Briefly.AI';
    }
    
    // Debug: Force scroll to top of modal to ensure visibility
    const modalContent = document.querySelector('.auth-modal-content');
    if (modalContent) {
        modalContent.scrollTop = 0;
    }
}

// Show forgot password form
function showForgotPassword() {
    const loginForm = document.getElementById('loginForm');
    const forgotForm = document.getElementById('forgotPasswordForm');
    const authTitle = document.getElementById('authTitle');

    loginForm.classList.remove('active');
    forgotForm.classList.add('active');
    authTitle.textContent = 'Reset Password';
}

// Show login form
function showLogin() {
    const loginForm = document.getElementById('loginForm');
    const forgotForm = document.getElementById('forgotPasswordForm');
    const authTitle = document.getElementById('authTitle');

    forgotForm.classList.remove('active');
    loginForm.classList.add('active');
    authTitle.textContent = 'Welcome Back';
}

// Handle email/password login
function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    // Simulate login process
    const submitBtn = event.target.querySelector('.auth-submit-btn');
    submitBtn.textContent = 'Signing In...';
    submitBtn.disabled = true;

    setTimeout(() => {
        // Simulate successful login
        const user = {
            id: 'user_' + Date.now(),
            email: email,
            name: email.split('@')[0],
            loginMethod: 'email',
            avatar: `https://ui-avatars.com/api/?name=${email.split('@')[0]}&background=3b82f6&color=fff`,
            rememberMe: rememberMe
        };

        loginUser(user);
        submitBtn.textContent = 'Sign In';
        submitBtn.disabled = false;
    }, 1500);
}

// Handle email/password signup
function handleSignup(event) {
    event.preventDefault();
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }

    // Simulate signup process
    const submitBtn = event.target.querySelector('.auth-submit-btn');
    submitBtn.textContent = 'Creating Account...';
    submitBtn.disabled = true;

    setTimeout(() => {
        // Create user object with optional name fields
        const userName = firstName && lastName 
            ? `${firstName} ${lastName}` 
            : firstName 
                ? firstName 
                : email.split('@')[0];
        
        const user = {
            id: 'user_' + Date.now(),
            email: email,
            name: userName,
            firstName: firstName || '',
            lastName: lastName || '',
            loginMethod: 'email',
            avatar: firstName && lastName 
                ? `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=3b82f6&color=fff`
                : `https://ui-avatars.com/api/?name=${userName}&background=3b82f6&color=fff`,
            rememberMe: true
        };

        loginUser(user);
        submitBtn.textContent = 'Create Account';
        submitBtn.disabled = false;
    }, 1500);
}

// Handle forgot password
function handleForgotPassword(event) {
    event.preventDefault();
    const email = document.getElementById('forgotEmail').value;

    const submitBtn = event.target.querySelector('.auth-submit-btn');
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;

    setTimeout(() => {
        alert(`Password reset link sent to ${email}!`);
        showLogin();
        submitBtn.textContent = 'Send Reset Link';
        submitBtn.disabled = false;
    }, 1500);
}

// Social login functions
function signInWithGoogle() {
    simulateSocialLogin('Google', 'google');
}

function signUpWithGoogle() {
    simulateSocialLogin('Google', 'google');
}

function signInWithApple() {
    simulateSocialLogin('Apple', 'apple');
}

function signUpWithApple() {
    simulateSocialLogin('Apple', 'apple');
}

function signInWithGitHub() {
    simulateSocialLogin('GitHub', 'github');
}

function signUpWithGitHub() {
    simulateSocialLogin('GitHub', 'github');
}

function signInWithMicrosoft() {
    simulateSocialLogin('Microsoft', 'microsoft');
}

function signUpWithMicrosoft() {
    simulateSocialLogin('Microsoft', 'microsoft');
}

// Simulate social login
function simulateSocialLogin(provider, method) {
    // In a real app, this would integrate with actual OAuth providers
    const user = {
        id: 'user_' + Date.now(),
        email: `user@${method}.com`,
        name: `${provider} User`,
        loginMethod: method,
        avatar: `https://ui-avatars.com/api/?name=${provider}+User&background=3b82f6&color=fff`,
        rememberMe: true
    };

    setTimeout(() => {
        loginUser(user);
    }, 1000);
}

// Login user and update UI
function loginUser(user) {
    currentUser = user;
    
    // Save to localStorage if remember me is checked
    if (user.rememberMe) {
        localStorage.setItem('brieflyAI_user', JSON.stringify(user));
    }

    updateNavbarForLoggedInUser();
    closeAuthModal();
    
    // Show success message
    showNotification(`Welcome${user.name ? ', ' + user.name.split(' ')[0] : ''}! You're now signed in.`);
}

// Update navbar for logged in user
function updateNavbarForLoggedInUser() {
    const authSection = document.querySelector('.auth-section');
    if (authSection && currentUser) {
        authSection.innerHTML = `
            <div class="user-menu">
                <button class="user-btn" onclick="toggleUserMenu()">
                    <img src="${currentUser.avatar}" alt="${currentUser.name}" class="user-avatar">
                    <span class="user-name">${currentUser.name.split(' ')[0]}</span>
                    <span class="dropdown-arrow">▼</span>
                </button>
                <div class="user-dropdown">
                    <div class="user-info">
                        <img src="${currentUser.avatar}" alt="${currentUser.name}" class="user-avatar-large">
                        <div class="user-details">
                            <div class="user-name-full">${currentUser.name}</div>
                            <div class="user-email">${currentUser.email}</div>
                        </div>
                    </div>
                    <div class="dropdown-divider"></div>
                    <a href="#" class="dropdown-item" onclick="showProfile()">
                        <span class="dropdown-icon">👤</span>
                        Profile Settings
                    </a>
                    <a href="#" class="dropdown-item" onclick="showBillings()">
                        <span class="dropdown-icon">💳</span>
                        Billing & Plans
                    </a>
                    <a href="#" class="dropdown-item" onclick="showPreferences()">
                        <span class="dropdown-icon">⚙️</span>
                        Preferences
                    </a>
                    <div class="dropdown-divider"></div>
                    <a href="#" class="dropdown-item" onclick="logout()">
                        <span class="dropdown-icon">🚪</span>
                        Sign Out
                    </a>
                </div>
            </div>
        `;
    }
}

// Toggle user menu dropdown
function toggleUserMenu() {
    const dropdown = document.querySelector('.user-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// Close user menu when clicking outside
document.addEventListener('click', function(event) {
    const userMenu = document.querySelector('.user-menu');
    if (userMenu && !userMenu.contains(event.target)) {
        const dropdown = document.querySelector('.user-dropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
    }
});

// Logout function
function logout() {
    currentUser = null;
    localStorage.removeItem('brieflyAI_user');
    
    // Reset navbar
    const authSection = document.querySelector('.auth-section');
    if (authSection) {
        authSection.innerHTML = '<button class="login-btn" onclick="openAuthModal()">Sign In</button>';
    }
    
    showNotification('You have been signed out successfully.');
}

// Placeholder functions for user menu items
function showProfile() {
    alert('Profile settings would open here');
    toggleUserMenu();
}

function showBillings() {
    alert('Billing & plans would open here');
    toggleUserMenu();
}

function showPreferences() {
    alert('User preferences would open here');
    toggleUserMenu();
}

// Password strength checker
function checkPasswordStrength() {
    const password = this.value;
    const strengthBar = document.querySelector('.strength-bar');
    const strengthText = document.querySelector('.strength-text');
    
    let score = 0;
    let feedback = [];

    if (password.length >= 8) score++;
    else feedback.push('at least 8 characters');

    if (/[A-Z]/.test(password)) score++;
    else feedback.push('uppercase letter');

    if (/[a-z]/.test(password)) score++;
    else feedback.push('lowercase letter');

    if (/[0-9]/.test(password)) score++;
    else feedback.push('number');

    if (/[^A-Za-z0-9]/.test(password)) score++;
    else feedback.push('special character');

    const strength = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][score];
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];
    
    strengthBar.style.width = (score * 20) + '%';
    strengthBar.style.backgroundColor = colors[score - 1] || '#ef4444';
    
    if (password.length === 0) {
        strengthText.textContent = 'Password strength';
        strengthBar.style.width = '0%';
    } else {
        strengthText.textContent = feedback.length > 0 ? 
            `${strength} - Add ${feedback.join(', ')}` : 
            strength;
    }
}

// Validate password match
function validatePasswordMatch() {
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = this.value;
    
    if (confirmPassword && password !== confirmPassword) {
        this.setCustomValidity('Passwords do not match');
        this.style.borderColor = '#ef4444';
    } else {
        this.setCustomValidity('');
        this.style.borderColor = password === confirmPassword && confirmPassword ? '#10b981' : '';
    }
}

// Show notification
function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Hide notification after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const modal = document.getElementById('authModal');
    if (event.target === modal) {
        closeAuthModal();
    }
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in on page load
    const savedUser = localStorage.getItem('brieflyAI_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        // Wait for navbar to load, then update it
        setTimeout(updateNavbarForLoggedInUser, 500);
    }
});
