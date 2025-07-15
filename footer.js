// Footer loader utility
async function loadFooter() {
    try {
        const response = await fetch('footer.html');
        const footerHtml = await response.text();
        const footerContainer = document.getElementById('footer-container');
        if (footerContainer) {
            footerContainer.innerHTML = footerHtml;
        }
    } catch (error) {
        console.error('Error loading footer:', error);
    }
}

// Load footer when DOM is ready
document.addEventListener('DOMContentLoaded', loadFooter);
