// Navbar loader utility
async function loadNavbar() {
    try {
        const response = await fetch('navbar.html');
        const navbarHtml = await response.text();
        const navbarContainer = document.getElementById('navbar-container');
        if (navbarContainer) {
            navbarContainer.innerHTML = navbarHtml;
        }
    } catch (error) {
        console.error('Error loading navbar:', error);
    }
}

// Load navbar when DOM is ready
document.addEventListener('DOMContentLoaded', loadNavbar);
