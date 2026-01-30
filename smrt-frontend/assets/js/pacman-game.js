// After creating the game board, add this code to position the directional buttons
function positionDirectionalButtons() {
  const pacmanBoard = document.getElementById('pacman-board');
  const directionalButtons = document.getElementById('directionalButtons');
  
  if (pacmanBoard && directionalButtons) {
    // Get the position of the board
    const boardRect = pacmanBoard.getBoundingClientRect();
    
    // Position the buttons below the board
    directionalButtons.style.position = 'absolute';
    directionalButtons.style.top = `${boardRect.bottom + 20}px`; // 20px gap
    directionalButtons.style.left = '50%';
    directionalButtons.style.transform = 'translateX(-50%)';
    directionalButtons.style.zIndex = '50';
  }
}

// Call this function after initializing the game board
function initGame() {
  // ... existing initialization code ...
  
  // Position directional buttons under the board
  positionDirectionalButtons();
  
  // Prevent touch movement affecting Pac-Man
  preventTouchMovement();
  
  // ... rest of initialization ...
}

// Also call this on window resize to maintain positioning
window.addEventListener('resize', positionDirectionalButtons);

// Add this function to your initialization code
function preventTouchMovement() {
  const pacmanBoard = document.getElementById('pacman-board');
  
  // Prevent default touch events on the game board
  pacmanBoard.addEventListener('touchstart', function(e) {
    e.preventDefault();
  }, { passive: false });
  
  pacmanBoard.addEventListener('touchmove', function(e) {
    e.preventDefault();
  }, { passive: false });
  
  pacmanBoard.addEventListener('touchend', function(e) {
    e.preventDefault();
  }, { passive: false });
  
  // Make sure directional buttons work properly on touch devices
  const dirButtons = document.querySelectorAll('.direction-btn');
  dirButtons.forEach(button => {
    button.addEventListener('touchstart', function(e) {
      e.stopPropagation();
      // Trigger the direction change based on button id or data attribute
      const direction = this.id.replace('btn-', '') || this.getAttribute('data-direction');
      if (direction) {
        pacman.nextDirection = direction;
      }
    });
  });
}