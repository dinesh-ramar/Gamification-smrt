// Game over function (add this if it doesn't exist, or modify the existing one)
function gameOver(isWin) {
    isGameOver = true;
    isPaused = true;
    
    // Stop the game timer
    if (gameTimerInterval) {
      clearInterval(gameTimerInterval);
    }
    
    // Calculate final time
    const finalTime = gameTimeElapsed;
    const minutes = Math.floor(finalTime / 60);
    const seconds = finalTime % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    if (isWin) {
      // Update time in success screen
      const timeDisplay = document.createElement('div');
      timeDisplay.className = 'final-time';
      timeDisplay.textContent = `Time: ${timeString}`;
      timeDisplay.style.color = 'white';
      timeDisplay.style.marginBottom = '10px';
      
      const successScreen = document.getElementById('successScreen');
      if (successScreen) {
        const content = successScreen.querySelector('.screen-content');
        if (content) {
          content.insertBefore(timeDisplay, content.firstChild.nextSibling);
        }
        successScreen.style.display = 'block';
      }
      
      // Also update null coupon screen if it exists
      const nullCouponScreen = document.getElementById('nullCouponScreen');
      if (nullCouponScreen) {
        const content = nullCouponScreen.querySelector('.screen-content');
        if (content) {
          const timeDisplayClone = timeDisplay.cloneNode(true);
          content.insertBefore(timeDisplayClone, content.firstChild.nextSibling);
        }
      }
    } else {
      // Update time in try again screen
      const timeDisplay = document.createElement('div');
      timeDisplay.className = 'final-time';
      timeDisplay.textContent = `Time: ${timeString}`;
      timeDisplay.style.color = 'white';
      timeDisplay.style.marginBottom = '10px';
      
      const tryAgainScreen = document.getElementById('tryAgainScreen');
      if (tryAgainScreen) {
        const content = tryAgainScreen.querySelector('.screen-content');
        if (content) {
          content.insertBefore(timeDisplay, content.firstChild.nextSibling);
        }
        tryAgainScreen.style.display = 'block';
      }
    }
  }
  
  // Also modify resetGame to reset the timer
  function resetGame() {
    // Hide all game over screens
    document.getElementById('successScreen').style.display = 'none';
    document.getElementById('nullCouponScreen').style.display = 'none';
    document.getElementById('tryAgainScreen').style.display = 'none';
    
    if (document.getElementById('timeUpScreen')) {
      document.getElementById('timeUpScreen').style.display = 'none';
    }
    
    // Reset game variables
    isGameOver = false;
    isPaused = false;
    
    // Clear special collectibles
    specialCollectibles = [];
    document.querySelectorAll('.special-collectible').forEach(el => el.remove());
    if (specialCollectibleTimer) {
      clearInterval(specialCollectibleTimer);
      specialCollectibleTimer = null;
    }
    
    // Initialize a new game
    initGame();
    
    // Reset and start the timer
    initGameTimer();
  }
  
  // Create and initialize the game timer
  function initGameTimer() {
    // Create timer element if it doesn't exist
    if (!document.getElementById('gameTimer')) {
      const timerElement = document.createElement('div');
      timerElement.id = 'gameTimer';
      timerElement.className = 'game-timer';
      timerElement.style.position = 'absolute';
      timerElement.style.top = '10px';
      timerElement.style.left = '50%';
      timerElement.style.transform = 'translateX(-50%)';
      timerElement.style.color = '#255be3';
      timerElement.style.fontSize = '18px';
      timerElement.style.fontWeight = 'bold';
      timerElement.style.zIndex = '100';
      timerElement.textContent = 'Time: 01:00';
      
      // Add to game container
      const gameContainer = document.getElementById('gameContainer');
      if (gameContainer) {
        gameContainer.appendChild(timerElement);
      }
    }
    
    // Reset timer variables
    gameStartTime = Date.now();
    gameTimeElapsed = 0;
    
    // Clear any existing interval
    if (gameTimerInterval) {
      clearInterval(gameTimerInterval);
    }
    
    // Start the timer
    gameTimerInterval = setInterval(updateGameTimer, 1000);
  }
  
  // Update the game timer
  function updateGameTimer() {
    if (isPaused || isGameOver) return;
    
    gameTimeElapsed = Math.floor((Date.now() - gameStartTime) / 1000);
    const timeRemaining = Math.max(0, maxGameTime - gameTimeElapsed);
    
    // Update timer display
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const timerDisplay = `Time: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    const timerElement = document.getElementById('gameTimer');
    if (timerElement) {
      timerElement.textContent = timerDisplay;
      
      // Add visual indication when time is running low
      if (timeRemaining <= 20) {
        timerElement.style.color = 'red';
        if (timeRemaining <= 10) {
          timerElement.style.animation = 'pulse 1s infinite';
        }
      }
    }
    
    // Check if time is up - this is the critical part
    if (timeRemaining === 0) {
      // Time's up - immediately stop the timer and show popup
      clearInterval(gameTimerInterval);
      gameTimerInterval = null;
      
      // Use setTimeout to ensure this runs after the current execution context
      setTimeout(() => {
        showTimeUpPopup();
      }, 0);
    }
  }
  
  // Show time up popup
  function showTimeUpPopup() {
    isPaused = true;
    isGameOver = true;
    
    // Calculate final time
    const finalTime = maxGameTime; // Use max time since we've completed the full duration
    const minutes = Math.floor(finalTime / 60);
    const seconds = finalTime % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Determine reward tier based on score
    let rewardTier = REWARD_TIERS.NONE.name;
    if (score >= REWARD_TIERS.TIER1.min) {
      rewardTier = REWARD_TIERS.TIER1.name;
    } else if (score >= REWARD_TIERS.TIER2.min) {
      rewardTier = REWARD_TIERS.TIER2.name;
    } else if (score >= REWARD_TIERS.TIER3.min) {
      rewardTier = REWARD_TIERS.TIER3.name;
    }
    
    console.log("Collectible counts at game end:", collectibleTypeCounts);
    
    // Count how many types have been collected (count > 0)
    let collectedTypesCount = 0;
    specialCollectibleTypes.forEach(type => {
      if (collectibleTypeCounts[type.name] > 0) {
        collectedTypesCount++;
      }
    });
    
    // Create detailed collectibles HTML
    let collectiblesDetailsHTML = '';
    specialCollectibleTypes.forEach(type => {
      // Make sure we're using the name property consistently
      const count = collectibleTypeCounts[type.name] || 0;
      collectiblesDetailsHTML += `
        <div class="collectible-detail" style="display: flex; align-items: center; margin: 5px 0; color: white;">
          <div class="collectible-icon" style="width: 15px; height: 15px; border-radius: 50%; background-color: ${type.color}; margin-right: 8px;"></div>
          <div class="collectible-name" style="margin-right: 5px;">${type.name.charAt(0).toUpperCase() + type.name.slice(1)}:</div>
          <div class="collectible-count">${count}</div>
        </div>
      `;
    });
    
    // Create time up popup if it doesn't exist
    if (!document.getElementById('timeUpScreen')) {
      const timeUpScreen = document.createElement('div');
      timeUpScreen.id = 'timeUpScreen';
      timeUpScreen.className = 'position-fixed top-0 start-0 w-100 h-100 game-over-screen';
      timeUpScreen.style.display = 'flex';
      timeUpScreen.style.alignItems = 'center';
      timeUpScreen.style.justifyContent = 'center';
      timeUpScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      timeUpScreen.style.zIndex = '1000';
      
      timeUpScreen.innerHTML = `
        <div class="try-again position-absolute top-50 start-50 translate-middle text-center p-4 rounded-3 screen-content">
          <h2 style="color: white;">Time's Up!</h2>
          <div class="game-stats">
            <div class="stat-item" style="color: white; margin: 10px 0;">Time Played: ${timeString}</div>
            <div class="stat-item totalCoinstimeup" style="color: white; margin: 10px 0;">Dots Collected: ${dotsCollected}/${totalDots}</div>
            <div class="stat-item special-collectibles" style="color: white; margin: 10px 0;">Special Items: ${collectedTypesCount}/${specialCollectibleTypes.length}</div>
            
            <div class="collectibles-details" style="margin: 10px 0; text-align: left; display: inline-block;">
              <div style="color: white; font-weight: bold; margin-bottom: 5px; text-align: center;">Collectibles Detail:</div>
              ${collectiblesDetailsHTML}
            </div>
            
            <div class="stat-item score-display" style="color: white; margin: 10px 0;">Final Score: ${score}</div>
            <div class="stat-item reward-tier" style="color: ${rewardTier === REWARD_TIERS.NONE.name ? 'red' : '#ffcc00'}; margin: 10px 0; font-weight: bold;">
              ${rewardTier}
            </div>
          </div>
          <div class="btnwrap" style="margin-top: 20px;">
            <a href="javascript:void(0);" onclick="resetGame()" class="">
              <img src="assets/images/Replay-button.png" alt="">
            </a>
            <a href="index.html" rel="noopener noreferrer" class="">
              <img src="assets/images/home-button.png" alt="">
            </a>
          </div>
        </div>
      `;
      
      document.body.appendChild(timeUpScreen);
    } else {
      // Update existing popup with current stats
      const timeDisplay = document.querySelector('#timeUpScreen .stat-item:first-child');
      if (timeDisplay) {
        timeDisplay.textContent = `Time Played: ${timeString}`;
      }
      
      const dotsDisplay = document.querySelector('#timeUpScreen .totalCoinstimeup');
      if (dotsDisplay) {
        dotsDisplay.textContent = `Dots Collected: ${dotsCollected}/${totalDots}`;
      }
      
      // Update special collectibles count
      const specialDisplay = document.querySelector('#timeUpScreen .special-collectibles');
      if (specialDisplay) {
        specialDisplay.textContent = `Special Items: ${collectedTypesCount}/${specialCollectibleTypes.length}`;
      }
      
      // Update collectibles details
      const collectiblesDetails = document.querySelector('#timeUpScreen .collectibles-details');
      if (collectiblesDetails) {
        // Create the inner HTML for collectibles details
        let innerDetailsHTML = '<div style="color: white; font-weight: bold; margin-bottom: 5px; text-align: center;">Collectibles Detail:</div>';
        innerDetailsHTML += collectiblesDetailsHTML;
        collectiblesDetails.innerHTML = innerDetailsHTML;
      } else {
        // If the element doesn't exist, create it
        const scoreDisplay = document.querySelector('#timeUpScreen .score-display');
        if (scoreDisplay) {
          const detailsDiv = document.createElement('div');
          detailsDiv.className = 'collectibles-details';
          detailsDiv.style.margin = '10px 0';
          detailsDiv.style.textAlign = 'left';
          detailsDiv.style.display = 'inline-block';
          detailsDiv.innerHTML = `
            <div style="color: white; font-weight: bold; margin-bottom: 5px; text-align: center;">Collectibles Detail:</div>
            ${collectiblesDetailsHTML}
          `;
          scoreDisplay.parentNode.insertBefore(detailsDiv, scoreDisplay);
        }
      }
      
      const scoreDisplay = document.querySelector('#timeUpScreen .score-display');
      if (scoreDisplay) {
        scoreDisplay.textContent = `Final Score: ${score}`;
      }
      
      const rewardDisplay = document.querySelector('#timeUpScreen .reward-tier');
      if (rewardDisplay) {
        rewardDisplay.textContent = rewardTier;
        rewardDisplay.style.color = rewardTier === REWARD_TIERS.NONE.name ? 'red' : '#ffcc00';
      }
      
      document.getElementById('timeUpScreen').style.display = 'flex';
    }
    
    // Stop the game loop
    if (gameInterval) {
      clearInterval(gameInterval);
    }
  }
  
  // Check for special collectible collection
  // Initialize special collectibles system
  function initSpecialCollectibles() {
    // Clear any existing special collectibles
    specialCollectibles = [];
    collectedCollectibleTypes = new Set();
    remainingCollectibleTypes = [...specialCollectibleTypes];
    playerCollectedTypes = new Set(); // Reset player's collected types
    
    // Initialize collectible type counts with zeros for all types
    collectibleTypeCounts = {}; 
    specialCollectibleTypes.forEach(type => {
      collectibleTypeCounts[type.name] = 0;
    });
    
    // Remove any existing special collectible elements
    document.querySelectorAll('.special-collectible').forEach(el => el.remove());
    
    // Clear any existing timer
    if (specialCollectibleTimer) {
      clearInterval(specialCollectibleTimer);
    }
    
    // Calculate spawn interval to ensure all collectibles appear within 60 seconds
    // We need to spawn 8 collectibles, so spawn one every 7.5 seconds
    const spawnInterval = 7500; // 7.5 seconds
    
    // Start the timer to spawn special collectibles
    specialCollectibleTimer = setInterval(spawnSpecialCollectible, spawnInterval);
    
    // Spawn the first special collectible immediately
    setTimeout(spawnSpecialCollectible, 1000);
    
    console.log("Initialized collectible counts:", collectibleTypeCounts);
  }
  
  // Check for special collectible collection
  function checkSpecialCollectibleCollection() {
    if (!specialCollectibles || specialCollectibles.length === 0) return;
    
    for (let i = specialCollectibles.length - 1; i >= 0; i--) {
      const collectible = specialCollectibles[i];
      const distance = Math.sqrt(
        Math.pow(pacman.x - collectible.x, 2) + 
        Math.pow(pacman.y - collectible.y, 2)
      );
      
      if (distance < (pacman.size/2 + collectible.size/2)) {
        // Collect the special item
        score += collectible.points;
        
        // Add to player's collected types
        playerCollectedTypes.add(collectible.type);
        
        // Make sure the type exists in the counts object
        if (collectibleTypeCounts[collectible.type] === undefined) {
          collectibleTypeCounts[collectible.type] = 0;
        }
        
        // Increment the count for this collectible type
        collectibleTypeCounts[collectible.type]++;
        
        console.log(`Collected ${collectible.type}, count now: ${collectibleTypeCounts[collectible.type]}`);
        
        // Update UI
        document.getElementById('score').textContent = `Score: ${score}`;
        
        // Show floating score text
        showFloatingText(`+${collectible.points}`, collectible.x, collectible.y, collectible.color);
        
        // Remove the collectible
        removeSpecialCollectible(collectible);
      }
    }
  }
  
  // Spawn a special collectible at a random valid position
  function spawnSpecialCollectible() {
    // Don't spawn if game is paused or over
    if (isPaused || isGameOver) return;
    
    let collectibleType;
    
    // If we still have types that haven't appeared, prioritize those
    if (remainingCollectibleTypes.length > 0) {
      // Choose a random type from the remaining ones
      const randomIndex = Math.floor(Math.random() * remainingCollectibleTypes.length);
      collectibleType = remainingCollectibleTypes[randomIndex];
      
      // Remove this type from the remaining list
      remainingCollectibleTypes.splice(randomIndex, 1);
      
      // Add to the collected set
      collectedCollectibleTypes.add(collectibleType.name);
    } else {
      // All types have appeared, choose any random type
      collectibleType = specialCollectibleTypes[Math.floor(Math.random() * specialCollectibleTypes.length)];
    }
    
    // Find a valid position (not on a wall or existing dot)
    let startX, startY;
    let attempts = 0;
    const maxAttempts = 50;
    
    do {
      startX = Math.floor(Math.random() * (boardSize - 2)) + 1;
      startY = Math.floor(Math.random() * (boardSize - 2)) + 1;
      attempts++;
      
      // Break if we can't find a valid position after many attempts
      if (attempts > maxAttempts) return;
    } while (gameBoard[startY][startX] !== 0);
    
    // Create the special collectible object
    const collectible = {
      x: startX * cellSize + cellSize/2,
      y: startY * cellSize + cellSize/2,
      type: collectibleType.name,
      points: collectibleType.points,
      size: collectibleType.size * 1.5, // Make them larger for better visibility
      color: collectibleType.color,
      createdAt: Date.now()
    };
    
    // Add to the array
    specialCollectibles.push(collectible);
    
    // Create the visual element
    const collectibleElement = document.createElement('div');
    collectibleElement.className = `special-collectible ${collectibleType.name}`;
    collectibleElement.style.position = 'absolute';
    collectibleElement.style.left = `${collectible.x - collectible.size/2}px`;
    collectibleElement.style.top = `${collectible.y - collectible.size/2}px`;
    collectibleElement.style.width = `${collectible.size}px`;
    collectibleElement.style.height = `${collectible.size}px`;
    collectibleElement.style.backgroundColor = collectible.color;
    collectibleElement.style.borderRadius = '50%';
    collectibleElement.style.zIndex = '5';
    collectibleElement.style.animation = 'collectible-pulse 1s infinite alternate';
    collectibleElement.style.boxShadow = `0 0 10px ${collectibleType.color}`;
    
    // Add to the game board
    document.getElementById('pacman-board').appendChild(collectibleElement);
    
    // Set a timeout to remove this collectible after 7 seconds if not collected
    setTimeout(() => {
      removeSpecialCollectible(collectible);
    }, 7000);
    
    console.log(`Spawned ${collectibleType.name} at (${startX}, ${startY})`);
  }
  
  // Remove a special collectible
  function removeSpecialCollectible(collectible) {
    const index = specialCollectibles.indexOf(collectible);
    if (index !== -1) {
      specialCollectibles.splice(index, 1);
      
      // Remove the visual element
      const elements = document.querySelectorAll('.special-collectible');
      elements.forEach((el) => {
        const elX = parseInt(el.style.left) + parseInt(el.style.width)/2;
        const elY = parseInt(el.style.top) + parseInt(el.style.height)/2;
        
        if (Math.abs(elX - collectible.x) < 5 && Math.abs(elY - collectible.y) < 5) {
          el.remove();
        }
      });
    }
  }
  
  // Show floating score text
  function showFloatingText(text, x, y, color) {
    const floatingText = document.createElement('div');
    floatingText.className = 'floating-text';
    floatingText.textContent = text;
    floatingText.style.position = 'absolute';
    floatingText.style.left = `${x}px`;
    floatingText.style.top = `${y}px`;
    floatingText.style.color = color;
    floatingText.style.fontWeight = 'bold';
    floatingText.style.fontSize = '16px';
    floatingText.style.zIndex = '50';
    floatingText.style.transform = 'translate(-50%, -50%)';
    floatingText.style.textShadow = '1px 1px 2px black';
    floatingText.style.pointerEvents = 'none';
    
    document.getElementById('pacman-board').appendChild(floatingText);
    
    // Animate the floating text
    let opacity = 1;
    let posY = y;
    
    const animateText = setInterval(() => {
      opacity -= 0.05;
      posY -= 1;
      
      floatingText.style.opacity = opacity;
      floatingText.style.top = `${posY}px`;
      
      if (opacity <= 0) {
        clearInterval(animateText);
        floatingText.remove();
      }
    }, 50);
  }
  
  // After the resetGame function, let's add a function to initialize and update lives
  
  // Initialize lives display
  function initLivesDisplay() {
    // Remove any existing lives display
    const existingLivesDisplay = document.getElementById('livesDisplay');
    if (existingLivesDisplay) {
      existingLivesDisplay.remove();
    }
    
    // Create lives display container
    const livesDisplay = document.createElement('div');
    livesDisplay.id = 'livesDisplay';
    livesDisplay.style.position = 'absolute';
    livesDisplay.style.top = '10px';
    livesDisplay.style.right = '20px';
    livesDisplay.style.display = 'flex';
    livesDisplay.style.gap = '5px';
    livesDisplay.style.zIndex = '100';
    
    // Add life images based on current lives
    for (let i = 0; i < lives; i++) {
      const lifeImg = document.createElement('img');
      lifeImg.src = 'assets/images/pacman-life.png'; // Make sure this image exists
      lifeImg.className = 'life-icon';
      lifeImg.style.width = '25px';
      lifeImg.style.height = '25px';
      livesDisplay.appendChild(lifeImg);
    }
    
    // Add to game container
    const gameContainer = document.getElementById('gameContainer');
    if (gameContainer) {
      gameContainer.appendChild(livesDisplay);
    }
  }
  
  // Update lives display when a life is lost
  function updateLivesDisplay() {
    const livesDisplay = document.getElementById('livesDisplay');
    if (livesDisplay) {
      // Remove all existing life icons
      while (livesDisplay.firstChild) {
        livesDisplay.removeChild(livesDisplay.firstChild);
      }
      
      // Add life images based on current lives
      for (let i = 0; i < lives; i++) {
        const lifeImg = document.createElement('img');
        lifeImg.src = 'assets/images/pacman-life.png';
        lifeImg.className = 'life-icon';
        lifeImg.style.width = '25px';
        lifeImg.style.height = '25px';
        livesDisplay.appendChild(lifeImg);
      }
    }
  }