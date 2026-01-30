// Game variables
let score = 0;
let lives = 3;
let totalDots = 0;
let dotsCollected = 0;
let gameInterval;
let isGameOver = false;
let isPaused = false;
let level = 4;

// Game board
const boardSize = 20; // 20x20 grid
let cellSize = 25; // pixels (changed to let for responsiveness)
let gameBoard = [];

// Initialize the game
document.addEventListener('DOMContentLoaded', function() {
  // Set initial board size
  const boardElement = document.getElementById('pacman-board');
  if (boardElement) {
    // Update to use full viewport height
    const viewportHeight = window.innerHeight;
    cellSize = Math.floor(viewportHeight / boardSize);
    
    boardElement.style.width = `${boardSize * cellSize}px`;
    boardElement.style.height = `100vh`;
    boardElement.style.maxHeight = `${boardSize * cellSize}px`;
    boardElement.style.backgroundColor = '#000';
    boardElement.style.margin = '0 auto';
    boardElement.style.position = 'relative';
    boardElement.style.overflow = 'hidden';
  }
  
  // Initialize game with a slight delay to ensure DOM is fully ready
  setTimeout(() => {
    initGame();
  }, 100);
  
  // Add window resize handler for responsiveness
  window.addEventListener('resize', adjustBoardSize);
  
  // Check if it's a mobile device
  if (window.innerWidth > 768) {
    const popup = document.getElementById('popup');
    if (popup) {
      popup.style.display = 'block';
    }
  }
  
  // Add event listeners for keyboard controls
  document.addEventListener('keydown', handleKeyDown);
  
  // Add touch controls for mobile
  document.addEventListener('touchstart', handleTouchStart);
  document.addEventListener('touchmove', handleTouchMove);
  
  // Handle copy button click
  document.getElementById('copyButton').addEventListener('click', function() {
    const couponCode = document.getElementById('couponCode').textContent;
    navigator.clipboard.writeText(couponCode)
      .then(() => alert('Coupon code copied to clipboard!'))
      .catch(err => console.error('Failed to copy: ', err));
  });
  
  // Handle redirect modal
  document.getElementById('gotoVoucher').addEventListener('click', function() {
    $('#redirectModal').modal('show');
  });
  
  document.getElementById('confirmRedirect').addEventListener('click', function() {
    window.open('https://www.grab.com', '_blank');
    $('#redirectModal').modal('hide');
  });
  
  document.getElementById('cancelRedirect').addEventListener('click', function() {
    $('#redirectModal').modal('hide');
  });
});

// Initialize the game
function initGame() {
  // Reset game variables
  score = 0;
  lives = 3;
  dotsCollected = 0;
  isGameOver = false;
  isPaused = false;
  level = 4;
  
  // Update UI
  document.getElementById('score').textContent = `Score: ${score}`;
  document.getElementById('lives').innerHTML = `<img src="assets/images/life-heart.png" alt="" class="heart-img" />${lives}`;
  document.getElementById('totalCoins').textContent = `Dots: ${dotsCollected}/240`;
  
  // Create game board
  createGameBoard();
  
  // Initialize Pac-Man
  initPacMan();
  
  // Initialize ghosts
  initGhosts();
  
  // Initialize special collectibles - add this line
  initSpecialCollectibles();
  
  // Start game loop
  startGameLoop();
}

// Create the game board
function createGameBoard() {
  const boardElement = document.getElementById('pacman-board');
  boardElement.innerHTML = '';
  boardElement.style.width = `${boardSize * cellSize}px`;
  boardElement.style.height = `${boardSize * cellSize}px`;
  
  // Initialize empty game board
  gameBoard = [];
  for (let y = 0; y < boardSize; y++) {
    gameBoard[y] = [];
    for (let x = 0; x < boardSize; x++) {
      gameBoard[y][x] = 0; // 0 = empty, 1 = wall, 2 = dot, 3 = power pellet
    }
  }
  
  // Create walls (maze)
  createMaze();
  
  // Place dots and power pellets
  placeDots();
  
  // Render the board
  renderBoard();
  
  // Count total dots
  countTotalDots();
}

// Create the maze walls
function createMaze() {
  // Outer walls
  for (let i = 0; i < boardSize; i++) {
    gameBoard[0][i] = 1; // Top wall
    gameBoard[boardSize-1][i] = 1; // Bottom wall
    gameBoard[i][0] = 1; // Left wall
    gameBoard[i][boardSize-1] = 1; // Right wall
  }
  
  // Internal maze structure with 2-3 walls together
  // Horizontal walls
  for (let x = 2; x < boardSize-4; x += 3) {
    for (let y = 2; y < boardSize-2; y += 4) {
      if (Math.random() > 0.3) { // 70% chance to place walls
        // Place 2-3 horizontal walls in a row
        const wallLength = Math.floor(Math.random() * 2) + 2; // 2 or 3 walls
        for (let i = 0; i < wallLength && x + i < boardSize-2; i++) {
          gameBoard[y][x + i] = 1;
        }
      }
    }
  }
  
  // Vertical walls
  for (let y = 2; y < boardSize-4; y += 3) {
    for (let x = 2; x < boardSize-2; x += 4) {
      if (Math.random() > 0.3) { // 70% chance to place walls
        // Place 2-3 vertical walls in a column
        const wallLength = Math.floor(Math.random() * 2) + 2; // 2 or 3 walls
        for (let i = 0; i < wallLength && y + i < boardSize-2; i++) {
          gameBoard[y + i][x] = 1;
        }
      }
    }
  }
  
  // Add some L-shaped walls for more interesting maze structure
  for (let y = 3; y < boardSize-4; y += 5) {
    for (let x = 3; x < boardSize-4; x += 5) {
      if (Math.random() > 0.6) { // 40% chance to place L-shaped walls
        // Create L-shape
        gameBoard[y][x] = 1;
        gameBoard[y][x+1] = 1;
        gameBoard[y+1][x] = 1;
      }
    }
  }
  
  // Ensure there's a path from start to end
  ensurePathExists();
}

// Ensure there's a path from start to end (simplified)
function ensurePathExists() {
  // For simplicity, just clear a path in the middle
  for (let i = 1; i < boardSize-1; i++) {
    gameBoard[boardSize/2][i] = 0;
    gameBoard[i][boardSize/2] = 0;
  }
}

// Start the game loop
function startGameLoop() {
  if (gameInterval) {
    clearInterval(gameInterval);
  }
  
  gameInterval = setInterval(function() {
    if (!isPaused && !isGameOver) {
      updatePacMan();
      updateGhosts();
      checkCollisions();
      renderGame();
    }
  }, 1000/60); // 60 FPS
}

// Make the board responsive
function adjustBoardSize() {
  const viewportHeight = window.innerHeight;
  const maxBoardWidth = window.innerWidth * 0.9;
  
  // Calculate cell size based on the smaller dimension to maintain square aspect ratio
  cellSize = Math.min(
    Math.floor(viewportHeight / boardSize),
    Math.floor(maxBoardWidth / boardSize)
  );
  
  // Add this line to define boardElement before it's used
  const boardElement = document.getElementById('pacman-board');
  
  // Then the code at line 246 that's causing the error should work properly
  if (boardElement) {
    boardElement.style.width = `${boardSize * cellSize}px`;
    boardElement.style.height = `100vh`; // Full viewport height
    boardElement.style.maxHeight = `${boardSize * cellSize}px`;
    
    // Center the board
    boardElement.style.margin = 'auto';
    
    // Only render if the game has been initialized
    if (!isGameOver && gameBoard && gameBoard.length > 0) {
      renderBoard();
      renderGame();
    }
  }
}

// Make sure this is added to the DOMContentLoaded event
document.addEventListener('DOMContentLoaded', function() {
  // Define boardElement at the beginning of this function
  const boardElement = document.getElementById('pacman-board');
  
  // Add window resize handler
  window.addEventListener('resize', adjustBoardSize);
  
  // Initial board size adjustment
  adjustBoardSize();
  
  // Center the board
  if (boardElement) {
    boardElement.style.margin = 'auto';
  }
  
  // Update all existing elements' positions
  if (!isGameOver) {
    renderBoard();
    renderGame();
  }
  
  // Check if it's a mobile device
  if (window.innerWidth > 768) {
    const popup = document.getElementById('popup');
    if (popup) {
      popup.style.display = 'block';
    }
  }
  
  // Create directional buttons for mobile/touch controls
  createDirectionalButtons();
  
  initGame();
  
  // Add event listeners for keyboard controls
  document.addEventListener('keydown', handleKeyDown);
  
  // Add touch controls for mobile
  document.addEventListener('touchstart', handleTouchStart);
  document.addEventListener('touchmove', handleTouchMove);
  
  // Handle copy button click
  document.getElementById('copyButton').addEventListener('click', function() {
    const couponCode = document.getElementById('couponCode').textContent;
    navigator.clipboard.writeText(couponCode)
      .then(() => alert('Coupon code copied to clipboard!'))
      .catch(err => console.error('Failed to copy: ', err));
  });
  
  // Handle redirect modal
  document.getElementById('gotoVoucher').addEventListener('click', function() {
    $('#redirectModal').modal('show');
  });
  
  document.getElementById('confirmRedirect').addEventListener('click', function() {
    window.open('https://www.grab.com', '_blank');
    $('#redirectModal').modal('hide');
  });
  
  document.getElementById('cancelRedirect').addEventListener('click', function() {
    $('#redirectModal').modal('hide');
  });
});

// Toggle pause state
function togglePause() {
  isPaused = !isPaused;
}

// Reset the game
function resetGame() {
  // Hide game over screens
  document.getElementById('successScreen').style.display = 'none';
  document.getElementById('nullCouponScreen').style.display = 'none';
  document.getElementById('tryAgainScreen').style.display = 'none';
  
  // Initialize a new game
  initGame();
}

// Function to create directional buttons
function createDirectionalButtons() {
  const gameContainer = document.getElementById('gameContainer');
  
  if (gameContainer) {
    // Create a container for the buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.id = 'directionalButtons';
    buttonContainer.style.display = 'flex';
    buttonContainer.style.flexDirection = 'column';
    buttonContainer.style.alignItems = 'center';
    buttonContainer.style.marginTop = '20px';
    buttonContainer.style.touchAction = 'manipulation';
    
    // Create the button layout (up button on top, left/right/down in a row below)
    const topRow = document.createElement('div');
    const middleRow = document.createElement('div');
    middleRow.style.display = 'flex';
    middleRow.style.justifyContent = 'center';
    middleRow.style.gap = '10px';
    
    // Create buttons
    const upButton = createButton('↑', 'ArrowUp');
    const leftButton = createButton('←', 'ArrowLeft');
    const rightButton = createButton('→', 'ArrowRight');
    const downButton = createButton('↓', 'ArrowDown');
    
    // Add buttons to rows
    topRow.appendChild(upButton);
    middleRow.appendChild(leftButton);
    middleRow.appendChild(downButton);
    middleRow.appendChild(rightButton);
    
    // Add rows to container
    buttonContainer.appendChild(topRow);
    buttonContainer.appendChild(middleRow);
    
    // Add container to game
    gameContainer.appendChild(buttonContainer);
  }
}

// Helper function to create a directional button
function createButton(text, keyCode) {
  const button = document.createElement('button');
  button.textContent = text;
  button.className = 'direction-btn';
  button.style.width = '50px';
  button.style.height = '50px';
  button.style.margin = '5px';
  button.style.fontSize = '24px';
  button.style.backgroundColor = '#4a90e2';
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.borderRadius = '50%';
  button.style.cursor = 'pointer';
  button.style.touchAction = 'manipulation';
  
  // Add event listeners for both click and touch
  button.addEventListener('click', function() {
    // Simulate a keydown event
    const event = new KeyboardEvent('keydown', {
      key: keyCode,
      code: keyCode,
      keyCode: keyCode === 'ArrowUp' ? 38 : 
               keyCode === 'ArrowDown' ? 40 : 
               keyCode === 'ArrowLeft' ? 37 : 39,
      which: keyCode === 'ArrowUp' ? 38 : 
             keyCode === 'ArrowDown' ? 40 : 
             keyCode === 'ArrowLeft' ? 37 : 39,
      bubbles: true
    });
    document.dispatchEvent(event);
  });
  
  // Prevent default touch behavior to avoid scrolling
  button.addEventListener('touchstart', function(e) {
    e.preventDefault();
    // Simulate a keydown event
    const event = new KeyboardEvent('keydown', {
      key: keyCode,
      code: keyCode,
      keyCode: keyCode === 'ArrowUp' ? 38 : 
               keyCode === 'ArrowDown' ? 40 : 
               keyCode === 'ArrowLeft' ? 37 : 39,
      which: keyCode === 'ArrowUp' ? 38 : 
             keyCode === 'ArrowDown' ? 40 : 
             keyCode === 'ArrowLeft' ? 37 : 39,
      bubbles: true
    });
    document.dispatchEvent(event);
  });
  
  return button;
}