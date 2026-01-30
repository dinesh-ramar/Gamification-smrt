document.addEventListener('DOMContentLoaded', handlePopup);
window.addEventListener('resize', handlePopup);

function handlePopup() {
    const existingPopup = document.getElementById('popup');
    if (window.innerWidth > 600) {
        if (!existingPopup) {
            const popup = document.createElement('div');
            popup.id = 'popup';
            popup.className = 'popup';
            popup.innerHTML = `
                <div class="popup-content">
                    <p>This game is best viewed on a mobile device.</p>
                </div>
            `;
            popup.style.display = 'block';
            document.body.appendChild(popup);
        } else {
            existingPopup.style.display = 'block';
        }
    } else if (existingPopup) {
        existingPopup.style.display = 'none';
    }
}