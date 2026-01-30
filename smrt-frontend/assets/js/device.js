// Function to update content visibility based on device orientation
function updateContentVisibility() {
  const content = document.getElementById('content');
  const rotateMessage = document.getElementById('rotate-message');
  
  // Check if elements exist before accessing their properties
  if (!content || !rotateMessage) {
    // Silently return if elements don't exist - this is normal for this game
    return;
  }
  
  if (window.innerWidth < window.innerHeight) {
    // Portrait mode
    content.style.display = 'none';
    rotateMessage.style.display = 'flex';
  } else {
    // Landscape mode
    content.style.display = 'block';
    rotateMessage.style.display = 'none';
  }
}

// Add event listeners
window.addEventListener('load', updateContentVisibility);
window.addEventListener('resize', updateContentVisibility);
window.addEventListener('orientationchange', updateContentVisibility);
