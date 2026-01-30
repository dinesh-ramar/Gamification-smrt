import { GameCamera } from './modules/GameCamera.js';
class MetroMazeGame {
    constructor() {
        this.coinRespawnDelay = 6000; // Changed from 4000 to 6000 (6 seconds)
        this.coinRespawnQueue = new Map(); // Track coins to respawn
        this.visitedPaths = new Set(); // Track visited path sections
        this.maxCoinsPerSection = 3; // Maximum coins per path section
        this.intersectionCache = new Map();

        // Initial player position at a valid path intersection
        this.player = { x: 128, y: 132 }; // Updated starting position
        this.currentRotation = -90; // Start facing right
        this.coins = [];
        this.score = 0;
        this.points = 0;
        this.timeLeft = 60;
        this.gameRunning = false; // MUST be false
        this.validPaths = [];
        this.gameTimer = null;    // MUST be null
        this.pathAlignmentTolerance = 12; // Increased further for very easy line detection
        this.currentPath = null;

        // Pac-Man style movement properties
        this.moveSpeed = 0.6; // Reduced speed for easier turning
        this.moveInterval = 16; // ~60 FPS movement
        this.isMoving = false;
        this.targetDirection = 'right'; // Direction player wants to go
        this.currentDirection = 'right'; // Direction player is actually moving
        this.pendingDirection = null; // Direction waiting to be applied

        this.setupTapToStart();

        // Auto-movement properties
        this.autoMoveSpeed = 1;
        this.autoMoveInterval = null;
        this.moveDirection = 'right'; // Start moving right
        this.nextTurn = null;         // Buffer for next turn
        this.moveInterval = null;     // For continuous movement
        this.lastValidRotation = -90; // Track last valid rotation
        this.gridSize = 12;           // Increased further for very easy line detection

        this.isTurning = false; // Add turning state
        this.stepCount = 0; // Initialize step count for sprite animation
        this.lastSpriteStep = -1; // Initialize last sprite step for animation control

        this.setupMaze();
        this.initializeCamera();

        this.setupCoins();
        this.setupControls();
        this.updateDisplay();

        // Ensure initial position is aligned to a path
        const initialPaths = this.getPathsAtPosition(this.player.x, this.player.y);
        if (initialPaths.length > 0) {
            // Align to the first valid path
            const path = initialPaths[0];
            if (path.type === 'vertical') {
                this.player.x = path.x;
            } else {
                this.player.y = path.y;
            }
        }

        this.updatePlayerPosition(this.currentRotation);
        // Set initial player image to Victor-rightleg.png at the very beginning
        const playerElement = document.getElementById('player');
        if (playerElement) {
            playerElement.style.setProperty('background-image', "url('../smrt-frontend/assets/images/Victor-leftleg.png')", 'important');
        }
        this.isFirstSprite = true; // Add flag for first sprite
        this.updatePlayerSprite('right'); // Set initial sprite to right direction
        this.createArrow();


        this.coinRespawnTimeouts = []; // Track coin respawn timeouts
        this.autoMoveTimeoutId = null; // Track auto-move timeout

        // Preload all sprite images to prevent delays
        this.preloadImages();
    }

    initializeCamera() {
        const gameBoard = document.getElementById('gameBoard');

        if (!gameBoard) {
            console.warn('Game board element not found for camera');
            return;
        }

        const cameraSettings = this.getResponsiveCameraSettings();

        this.camera = new GameCamera(this.player, gameBoard, cameraSettings);
        this.camera.initializeCamera();

        // Add resize listener for responsive camera
        this.setupResponsiveCamera();
    }

    setupResponsiveCamera() {
        let resizeTimeout;

        const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (this.camera) {
                    const newSettings = this.getResponsiveCameraSettings();
                    this.camera.updateSettings(newSettings);
                    this.camera.initializeCamera();
                }
            }, 250); // Debounce resize events
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);
    }

    getResponsiveCameraSettings() {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        // Base settings for different screen sizes
        if (screenWidth <= 320) {
            // Very small phones
            return {
                viewportWidth: 175,
                viewportHeight: 180,
                boardWidth: 340,
                boardHeight: 516,
                topBias: 0.05,
                topThreshold: 60,
                topYOffset: 0,
                rightOffset: 8,
                bottomOffset: 2,
                browserUIHeight: 60
            };
        } else if (screenWidth <= 375) {
            // Small phones (iPhone SE, etc.)
            return {
                viewportWidth: 195,
                viewportHeight: 290,
                boardWidth: 340,
                boardHeight: 516,
                topBias: 0.05,
                topThreshold: 80,
                topYOffset: 0,
                rightOffset: 12,
                bottomOffset: 3,
                browserUIHeight: 70
            };
        } else if (screenWidth <= 414) {
            // Medium phones (iPhone 12, 13, etc.)
            return {
                viewportWidth: 210,
                viewportHeight: 315,
                boardWidth: 340,
                boardHeight: 516,
                topBias: 0.05,
                topThreshold: 100,
                topYOffset: 0,
                rightOffset: 16,
                bottomOffset: 5,
                browserUIHeight: 80
            };
        } else if (screenWidth <= 480) {
            // Large phones
            return {
                viewportWidth: 230,
                viewportHeight: 370,
                boardWidth: 340,
                boardHeight: 516,
                topBias: 0.05,
                topThreshold: 110,
                topYOffset: 0,
                rightOffset: 18,
                bottomOffset: 6,
                browserUIHeight: 85
            };
        } else if (screenWidth <= 768) {
            // Small tablets
            return {
                viewportWidth: 250,
                viewportHeight: 500,
                boardWidth: 400,
                boardHeight: 600,
                topBias: 0.05,
                topThreshold: 120,
                topYOffset: 0,
                rightOffset: 20,
                bottomOffset: 8,
                browserUIHeight: 90
            };
        }
    }

    // Preload all sprite images to prevent delays
    preloadImages() {
        const spriteImages = [
            'Avator-Back.gif',
            'Avator-Front.gif',
            'leftwalkcycle.gif',
            'rightwalkcycle.gif',
            'leftsidewalkcycle_01.png',
            'rightsidewalkcycle_01.png',
            'Victor-backturnleftleg.png',
            'Victor-leftleg.png'
        ];

        this.preloadedImages = {};

        spriteImages.forEach(imageName => {
            const img = new Image();
            img.onload = () => {
                this.preloadedImages[imageName] = img;
            };
            img.onerror = () => {
                console.warn(`Failed to preload: ${imageName}`);
            };
            img.src = `../smrt-frontend/assets/images/${imageName}`;
        });
    }

    setupMaze() {
        const board = document.getElementById('gameBoard');

        // Create paths first (higher z-index)

        this.createPaths();
        this.drawAllMetroDots();
        // Then create buildings (lower z-index)
        this.createBuildings(board);

        this.setupPathData();
    }

    createDot(x, y, color) {
        const board = document.getElementById('gameBoard');
        if (!board) return; // Add null check for board

        const dot = document.createElement('div');
        dot.className = 'metro-dot-outer';
        dot.style.left = (x - 4) + 'px'; // 8px dot: offset by 4
        dot.style.top = (y - 4) + 'px';
        dot.style.backgroundColor = color;

        const innerDot = document.createElement('div');
        innerDot.className = 'metro-dot-inner';

        dot.appendChild(innerDot);
        board.appendChild(dot);
    }



    drawMetroLine(points, color = '#4CAF50', width = 8, radius = 32) {
        const metroSVG = document.getElementById('metroSVG');
        if (!metroSVG) return; // Add null check for metroSVG

        const s = Snap("#metroSVG");
        const pathStr = this.buildCurvedPath(points, radius);

        const path = s.path(pathStr);
        path.attr({
            stroke: color,
            strokeWidth: width,
            fill: "none",
            strokeLinecap: "round",
            strokeLinejoin: "round"
        });

        // Draw a dot only at the end of the line
        if (points.length > 1) {
            this.createDot(points[points.length - 1].x, points[points.length - 1].y, color); // end only
        }
    }



    // color: '#825b3e' - dark wood, color: '#4CAF50' - green

    createPaths() {

        const greenMetroPaths = [

            [
                { x: 128.5, y: 130 },  // bottom of right vertical
                { x: 128, y: 10 },   // top of right vertical
                { x: 10, y: 10 },    // start of horizontal
                { x: 10, y: 52 },    // down to 2nd line
                { x: 128, y: 52 },   // right across
                { x: 10, y: 52 },    // back to left
                { x: 10, y: 92 },    // down to 3rd line
                { x: 128, y: 92 },   // right again
                { x: 64, y: 92 },    // small upward nudge to vertical connector
                { x: 64, y: 160 },    // down full vertical line
            ],

            [
                { x: 190, y: 312 },  // center of the +
                { x: 190, y: 450 },  // go down
                { x: 190, y: 350 },  // back to center (horizontal level)
                { x: 12, y: 350 },  // ⬇️ down from left
                { x: 12, y: 350 },    // ⬆️ up from left
                { x: 190, y: 350 },  // ↩️ back to center
                { x: 256, y: 350 }   // ➡️ go right
            ],

        ];

        greenMetroPaths.forEach(path => {
            this.drawMetroLine(path, '#4CAF50', 2.25, 0);
        });

        const brownMetroPaths = [
            // Curve top horizontal to vertical drop
            [
                { x: 128.5, y: 10 },     // start left
                { x: 328, y: 10 },     // approach right
                { x: 328, y: 18 },     // gentle curve down
                { x: 328, y: 121 },     // vertical drop
                { x: 259.5, y: 121 },
                { x: 328, y: 121 }
            ],

            // Flat horizontal
            [
                { x: 208, y: 74 },
                { x: 328, y: 74 }
            ],

            // Right turn from vertical to horizontal
            [
                { x: 259.5, y: 236 },       // going down
                { x: 259.5, y: 74 }     // vertical line top    
            ],

            // Small right step and upward
            [
                { x: 177, y: 130 },
                { x: 177, y: 89.5 },     // start horizontal
                { x: 208, y: 89.5 },     // go right to align with vertical line
                { x: 208, y: 11.5 },      // vertical up to join top line
            ],

            [
                { x: 10, y: 450.5 },    // left vertical up
                { x: 10, y: 500 },    // left vertical down
                { x: 95, y: 500 },    // horizontal start
                { x: 95, y: 394 },    // ⬆️ go higher than before
                { x: 95, y: 470 },    // ⬇️ dip down slightly
                { x: 95, y: 450.5 },    // ⬆️ settle back at original height
                { x: 256, y: 450.5 },   // ➡️ go right
                { x: 160, y: 450.5 },
                { x: 160, y: 480 },
                { x: 160, y: 500 },

                { x: 160, y: 500 },
                { x: 80, y: 500 },

                { x: 256, y: 500 },   // ⬇️ down again
                { x: 256, y: 429 },   // ⬆️ back up
                { x: 328, y: 429 },   // ➡️ across to right
                { x: 328, y: 500 },    // ⬇️ final drop

                { x: 95, y: 500 }
            ]
        ];


        brownMetroPaths.forEach(path => {
            this.drawMetroLine(path, '#8B4513', 2.25, 0);
        });



        const orangeMetroPaths = [
            // Bottom-left L-curve: horizontal → vertical down (10,158 → 94,158 → 94,350)
            [
                { x: 10, y: 162 },
                { x: 105, y: 162 },
                { x: 105, y: 237 }
            ],

            // Left L-curve: vertical → horizontal (62,158 → 62,270 → 105,270)
            [
                { x: 64, y: 162 },
                { x: 64, y: 269 }
            ],

            // Top-right corner (horizontal to vertical): 105,130 → 214,130 → 214,240
            [
                { x: 10, y: 162 },      // start from left
                { x: 85, y: 162 },      // approach corner
                { x: 105, y: 162 },     // curve in
                { x: 105, y: 132 },     // go up
                { x: 200, y: 132 },     // right across top
                { x: 214, y: 132 },     // enter corner
                { x: 214, y: 237 },     // go down
                { x: 214, y: 162 },     // 🆕 go back up slightly
                { x: 230, y: 162 },     // 🆕 curve right
                { x: 326, y: 162 }      // 🆕 continue right in middle
            ],

            [
                { x: 326, y: 319 },   // ➡️ start further right
                { x: 270, y: 319 },   // ⬅️ start bending
                { x: 256, y: 319 },   // ↘️ curve into downward
                { x: 256, y: 428 },   // ⬇️ vertical drop
            ],


        ];

        orangeMetroPaths.forEach(path => {
            this.drawMetroLine(path, 'orange', 2.25, 0);
        });

        const redMetroPaths = [
            [
                { x: 50, y: 500 },
                { x: 50, y: 452 },
                { x: 10, y: 452 },    // ⬆️ start higher for curve
                { x: 10, y: 290 },    // ⬇️ curve into line
                { x: 10, y: 269 },    // ⬇️ settle on main line
                { x: 105, y: 269 },
                { x: 105, y: 237 },
            ],


            // Horizontal middle rail
            [
                { x: 105, y: 237 },
                { x: 216, y: 237 },
                { x: 328, y: 237 }
            ],

            // Vertical drop right end
            [
                { x: 328, y: 237 },
                { x: 328, y: 394 },
                { x: 328, y: 429 }
            ],

            // Lower horizontal bar
            [
                { x: 105, y: 270 },
                { x: 105, y: 312 },    // ➡️ Start
                { x: 190, y: 312 },    // ➡️ Horizontal
                { x: 190, y: 300 },    // ⬆️ Start vertical curve
                { x: 190, y: 237 },    // 🆙 Higher bump peak
                { x: 190, y: 274 },    // ⬇️ Deeper dip
                { x: 328, y: 274 }     // ➡️ Longer exit to the right
            ],

            [
                { x: 10, y: 394 },
                { x: 328, y: 394 },
                { x: 95, y: 394 },
                { x: 95, y: 350 },
                { x: 95, y: 394 },
            ]

        ];

        redMetroPaths.forEach(path => {
            this.drawMetroLine(path, 'red', 2.25, 0);
        });

    }

    drawAllMetroDots() {
        const dots = new Set();
        for (const h of this.validPaths.filter(p => p.type === 'horizontal')) {
            for (const v of this.validPaths.filter(p => p.type === 'vertical')) {
                // Check if the vertical crosses the horizontal
                if (
                    v.x >= h.xStart && v.x <= h.xEnd &&
                    h.y >= v.yStart && h.y <= v.yEnd
                ) {
                    // Use a string key to avoid duplicates
                    const key = `${v.x},${h.y}`;
                    if (!dots.has(key)) {
                        dots.add(key);
                        this.createDot(v.x, h.y, '#fff'); // or any color you want
                    }
                }
            }
        }
    }

    createBuildings(board) {
        const buildings = [
            // Existing buildings
            { x: 18, y: 20, w: 32, h: 22, color: '#C2F0D4', class: 'green-border' }, // light green
            { x: 54, y: 20, w: 32, h: 22, color: '#91DBED', class: 'blue-border' }, // light blue
            { x: 88, y: 20, w: 32, h: 22, color: '#FCF8EE', class: 'cream-border' }, // light orange

            { x: 18, y: 60, w: 32, h: 22, color: '#C2F0D4', class: 'green-border' },
            { x: 54, y: 60, w: 32, h: 22, color: '#91DBED', class: 'blue-border' },
            { x: 88, y: 60, w: 32, h: 22, color: '#FCF8EE', class: 'cream-border' },
            { x: 138, y: 20, w: 60, h: 50, color: '#C2F0D4', class: 'green-border' }, // Top horizontal block                    
            { x: 138, y: 75, w: 30, h: 45, color: '#C2F0D4', class: 'green-border' },// Bottom vertical block                    
            { x: 218, y: 20, w: 98, h: 45, color: '#91DBED', class: 'blue-border' },
            { x: 10, y: 105, w: 46, h: 30, color: '#C2F0D4', class: 'green-border' },
            { x: 186, y: 96, w: 30, h: 28, color: '#FCF8EE', class: 'cream-border' },
            { x: 222, y: 82, w: 30, h: 70, color: '#FCF8EE', class: 'cream-border' },
            { x: 72, y: 98, w: 48, h: 24, color: '#91DBED', class: 'blue-border' },
            { x: 72, y: 126, w: 24, h: 26, color: '#91DBED', class: 'blue-border' },
            { x: 166, y: 140, w: 40, h: 35, color: '#FCF8EE', class: 'cream-border' },
            { x: 166, y: 180, w: 40, h: 50, color: '#FCF8EE', class: 'cream-border' },
            { x: 268, y: 82, w: 50, h: 32, color: '#C2F0D4', class: 'green-border' },
            { x: 270, y: 130, w: 50, h: 22, color: '#C2F0D4', class: 'green-border' },
            { x: 10, y: 172, w: 46, h: 90, color: '#FCF8EE', class: 'cream-border' },
            { x: 72, y: 172, w: 24, h: 90, color: '#91DBED', class: 'blue-border' },
            { x: 114, y: 140, w: 44, h: 52, color: '#91DBED', class: 'blue-border' },
            { x: 114, y: 198, w: 44, h: 32, color: '#91DBED', class: 'blue-border' },

            { x: 225, y: 168, w: 26, h: 60, color: '#FCF8EE', class: 'cream-border' },
            { x: 268, y: 168, w: 54, h: 60, color: '#FCF8EE', class: 'cream-border' },

            //{x: 160, y: 240, w: 30, h: 20, color: '#fff3e0'},
            { x: 200, y: 282, w: 45, h: 60, color: '#C2F0D4', class: 'green-border' },

            { x: 20, y: 278, w: 75, h: 36, color: '#C2F0D4', class: 'green-border' },
            { x: 20, y: 320, w: 75, h: 22, color: '#C2F0D4', class: 'green-border' },

            { x: 114, y: 245, w: 66, h: 60, color: '#91DBED', class: 'blue-border' },

            { x: 200, y: 245, w: 70, h: 20, color: '#FCF8EE', class: 'cream-border' },
            { x: 275, y: 245, w: 45, h: 20, color: '#FCF8EE', class: 'cream-border' },
            { x: 100, y: 320, w: 78, h: 22, color: '#FCF8EE', class: 'cream-border' },

            { x: 250, y: 282, w: 70, h: 30, color: '#C2F0D4', class: 'green-border' },
            { x: 16, y: 356, w: 70, h: 32, color: '#91DBED', class: 'blue-border' },
            { x: 108, y: 356, w: 70, h: 32, color: '#91DBED', class: 'blue-border' },
            { x: 16, y: 400, w: 70, h: 44, color: '#FCF8EE', class: 'cream-border' },

            { x: 106, y: 400, w: 74, h: 44, color: '#FCF8EE', class: 'cream-border' },
            { x: 196, y: 356, w: 54, h: 32, color: '#C2F0D4', class: 'green-border' },

            { x: 196, y: 400, w: 54, h: 44, color: '#C2F0D4', class: 'green-border' },
            { x: 262, y: 326, w: 58, h: 63, color: '#C2F0D4', class: 'green-border' },

            { x: 20, y: 460, w: 20, h: 30, color: '#C2F0D4', class: 'green-border' },

            { x: 60, y: 448, w: 26, h: 46, color: '#C2F0D4', class: 'green-border' },

            { x: 104, y: 456, w: 50, h: 40, color: '#91DBED', class: 'blue-border' },
            { x: 166, y: 456, w: 78, h: 40, color: '#C2F0D4', class: 'green-border' },

            { x: 262, y: 400, w: 60, h: 24, color: '#FCF8EE', class: 'cream-border' },

            { x: 262, y: 435, w: 60, h: 16, color: '#C2F0D4', class: 'green-border' },

            { x: 262, y: 456, w: 60, h: 40, color: '#FCF8EE', class: 'cream-border' }
        ];

        buildings.forEach(building => {
            if (!board) return; // Add null check for board

            const div = document.createElement('div');

            // 👇 Add extra class if building has one
            div.className = 'building' + (building.class ? ' ' + building.class : '');

            div.style.left = building.x + 'px';
            div.style.top = building.y + 'px';
            div.style.width = building.w + 'px';
            div.style.height = building.h + 'px';
            div.style.background = building.color;

            board.appendChild(div);
        });
    }

    setupPathData() {
        this.validPaths = [
            // --- Horizontal Paths (extracted from createPaths coordinates) ---
            { type: 'horizontal', y: 10, xStart: 10, xEnd: 328 },
            { type: 'horizontal', y: 52, xStart: 10, xEnd: 128 },
            { type: 'horizontal', y: 74, xStart: 208, xEnd: 328 },
            { type: 'horizontal', y: 90, xStart: 177, xEnd: 208 },
            { type: 'horizontal', y: 92, xStart: 10, xEnd: 128 },
            { type: 'horizontal', y: 121, xStart: 259, xEnd: 328 },
            { type: 'horizontal', y: 132, xStart: 105, xEnd: 214 },
            { type: 'horizontal', y: 162, xStart: 10, xEnd: 105 },
            { type: 'horizontal', y: 162, xStart: 214, xEnd: 326 },
            { type: 'horizontal', y: 237, xStart: 105, xEnd: 328 },
            { type: 'horizontal', y: 269, xStart: 10, xEnd: 105 },
            { type: 'horizontal', y: 269, xStart: 105, xEnd: 105 }, // Single point connection
            { type: 'horizontal', y: 274, xStart: 190, xEnd: 328 },
            { type: 'horizontal', y: 312, xStart: 105, xEnd: 190 },
            { type: 'horizontal', y: 319, xStart: 256, xEnd: 326 },
            { type: 'horizontal', y: 350, xStart: 12, xEnd: 256 },
            { type: 'horizontal', y: 394, xStart: 10, xEnd: 328 },
            { type: 'horizontal', y: 429, xStart: 256, xEnd: 328 },
            { type: 'horizontal', y: 450, xStart: 95, xEnd: 256 },
            { type: 'horizontal', y: 452, xStart: 10, xEnd: 50 },
            { type: 'horizontal', y: 500, xStart: 10, xEnd: 328 },

            // --- Vertical Paths (extracted from createPaths coordinates) ---
            { type: 'vertical', x: 10, yStart: 10, yEnd: 92 },
            { type: 'vertical', x: 10, yStart: 269, yEnd: 394 },
            { type: 'vertical', x: 10, yStart: 394, yEnd: 500 },
            { type: 'vertical', x: 50, yStart: 452, yEnd: 500 },
            { type: 'vertical', x: 64, yStart: 92, yEnd: 162 },
            { type: 'vertical', x: 64, yStart: 162, yEnd: 269 },
            { type: 'vertical', x: 95, yStart: 350, yEnd: 500 },
            { type: 'vertical', x: 105, yStart: 132, yEnd: 162 },
            { type: 'vertical', x: 105, yStart: 162, yEnd: 237 },
            { type: 'vertical', x: 105, yStart: 237, yEnd: 312 },
            { type: 'vertical', x: 128, yStart: 10, yEnd: 132 },
            { type: 'vertical', x: 160, yStart: 450, yEnd: 500 },
            { type: 'vertical', x: 177, yStart: 90, yEnd: 132 },
            { type: 'vertical', x: 190, yStart: 237, yEnd: 312 },
            { type: 'vertical', x: 190, yStart: 312, yEnd: 450 },
            { type: 'vertical', x: 208, yStart: 11, yEnd: 90 },
            { type: 'vertical', x: 214, yStart: 132, yEnd: 237 },
            { type: 'vertical', x: 256, yStart: 319, yEnd: 500 },
            { type: 'vertical', x: 259, yStart: 74, yEnd: 236 },
            { type: 'vertical', x: 328, yStart: 10, yEnd: 121 },
            { type: 'vertical', x: 328, yStart: 237, yEnd: 500 }
        ];

        // Remove duplicates
        const uniquePaths = this.removeDuplicatePaths(this.validPaths);
        this.validPaths = uniquePaths;

        // Add intersection points at all path crossings
        const intersections = [];
        for (let i = 0; i < this.validPaths.length; i++) {
            for (let j = i + 1; j < this.validPaths.length; j++) {
                const path1 = this.validPaths[i];
                const path2 = this.validPaths[j];

                if (path1.type !== path2.type) {
                    const intersection = this.findIntersectionPoint(path1, path2);
                    if (intersection) {
                        intersections.push(intersection);
                    }
                }
            }
        }

        // Sort intersections to remove duplicates
        const uniqueIntersections = Array.from(new Set(intersections.map(JSON.stringify))).map(JSON.parse);

        // Add short path segments at intersections if needed
        uniqueIntersections.forEach(point => {
            const tolerance = this.pathAlignmentTolerance;
            const hasVertical = this.validPaths.some(p =>
                p.type === 'vertical' &&
                Math.abs(p.x - point.x) <= tolerance &&
                point.y >= p.yStart - tolerance &&
                point.y <= p.yEnd + tolerance
            );
            const hasHorizontal = this.validPaths.some(p =>
                p.type === 'horizontal' &&
                Math.abs(p.y - point.y) <= tolerance &&
                point.x >= p.xStart - tolerance &&
                point.x <= p.xEnd + tolerance
            );

            // Add slightly longer intersection segments for better movement
            if (!hasVertical) {
                this.validPaths.push({
                    type: 'vertical',
                    x: point.x,
                    yStart: point.y - tolerance * 2,
                    yEnd: point.y + tolerance * 2
                });
            }
            if (!hasHorizontal) {
                this.validPaths.push({
                    type: 'horizontal',
                    y: point.y,
                    xStart: point.x - tolerance * 2,
                    xEnd: point.x + tolerance * 2
                });
            }
        });

        // Add debug logging for path validation
    }

    arePathsConnected(path1, path2, oldX, oldY, newX, newY) {
        // If it's the same path, it's always valid
        if (path1 === path2) return true;

        const tolerance = this.pathAlignmentTolerance;

        // For horizontal to vertical path connection
        if (path1.type === 'horizontal' && path2.type === 'vertical') {
            // Check if paths intersect
            const intersects = (
                path2.x >= path1.xStart - tolerance &&
                path2.x <= path1.xEnd + tolerance &&
                path1.y >= path2.yStart - tolerance &&
                path1.y <= path2.yEnd + tolerance
            );

            if (!intersects) return false;

            // Check if we're moving near the intersection
            const movingTowardsIntersection = (
                Math.abs(oldY - path1.y) <= tolerance && // Currently on horizontal path
                Math.abs(newX - path2.x) <= tolerance && // Moving towards vertical path
                Math.abs(newY - path1.y) <= tolerance * 2 // Allow more vertical movement during transition
            );

            return movingTowardsIntersection;
        }

        // For vertical to horizontal path connection
        if (path1.type === 'vertical' && path2.type === 'horizontal') {
            // Check if paths intersect
            const intersects = (
                path1.x >= path2.xStart - tolerance &&
                path1.x <= path2.xEnd + tolerance &&
                path2.y >= path1.yStart - tolerance &&
                path2.y <= path1.yEnd + tolerance
            );

            if (!intersects) return false;

            // Check if we're moving near the intersection
            const movingTowardsIntersection = (
                Math.abs(oldX - path1.x) <= tolerance && // Currently on vertical path
                Math.abs(newY - path2.y) <= tolerance && // Moving towards horizontal path
                Math.abs(newX - path1.x) <= tolerance * 2 // Allow more horizontal movement during transition
            );

            return movingTowardsIntersection;
        }

        return false;
    }

    setupCoins() {
        const STEP = 40;   // distance between candidate points
        const MAX_COINS = 8;   // how many coins you actually want on screen

        // STEP 0: Clear existing coins from DOM and array
        const existingCoins = document.querySelectorAll('.coin');
        existingCoins.forEach(coinEl => coinEl.remove());
        this.coins = [];

        // 1-3  Collect all candidate points that are on a path and not in a building
        const candidates = [];

        this.validPaths.forEach(path => {
            if (path.type === 'horizontal') {
                for (let x = path.xStart + STEP; x <= path.xEnd - STEP; x += STEP) {
                    const pos = { x, y: path.y };
                    if (!this.isInBuilding(pos.x, pos.y) && !this.isInBlockedArea()) candidates.push(pos);
                }
            } else { // vertical
                for (let y = path.yStart + STEP; y <= path.yEnd - STEP; y += STEP) {
                    const pos = { x: path.x, y };
                    if (!this.isInBuilding(pos.x, pos.y) && !this.isInBlockedArea()) candidates.push(pos);
                }
            }
        });

        // 4  Remove duplicates (same coordinate reached by two paths)
        const unique = [];
        const seen = new Set();
        candidates.forEach(p => {
            const key = `${p.x}-${p.y}`;
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(p);
            }
        });

        // 5  Shuffle and create coins
        unique.sort(() => Math.random() - 0.5);      // simple shuffle
        const selected = unique.slice(0, MAX_COINS); // take the first N

        selected.forEach((pos, idx) => this.createCoin(pos, idx));
    }
    createCoin(pos, index) {
        const gameBoard = document.getElementById('gameBoard');
        if (!gameBoard) return; // Add null check for gameBoard

        const coin = document.createElement('div');
        coin.className = 'coin';
        // coin.style.left = pxToPercentX(pos.x);
        // coin.style.top = pxToPercentY(pos.y);
        coin.style.left = pos.x + 'px';          // use exact pixel co-ordinates
        coin.style.top = pos.y + 'px';
        coin.style.transform = 'translate(-50%, -50%)'; // Center the coin on the position
        coin.id = `coin-${index}`;
        // Cycle through 01-07 points images
        const imgNum = (index % 7) + 1;
        const img = document.createElement('img');
        img.src = `images/0${imgNum}-icon.png`;
        img.alt = `Points ${imgNum}`;
        img.style.width = '100%';
        img.style.height = '100%';
        const coin_animation = document.createElement('div');
        coin_animation.className = 'shine-icon';
        coin_animation.appendChild(img);
        img.draggable = false;
        coin.appendChild(coin_animation);
        gameBoard.appendChild(coin);
        this.coins.push({ ...pos, element: coin, collected: false, id: index, imgNum });
    }

    setupControls() {
        let touchStartX = 0;
        let touchStartY = 0;

        // Add keyboard event listener to document
        document.addEventListener('keydown', (e) => {
            if (!this.gameRunning) {
                return;
            }

            // Prevent default behavior for arrow keys
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                this.handleInput(e.key);
            }
        });

        const gameBoard = document.getElementById('gameBoard');
        if (!gameBoard) {
            console.error('Game board element not found');
            return;
        }

        gameBoard.addEventListener('touchstart', (e) => {
            e.preventDefault();
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        });

        gameBoard.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (!this.gameRunning) return;

            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;

            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
                this.handleInput(deltaX > 0 ? 'ArrowRight' : 'ArrowLeft');
            } else if (Math.abs(deltaY) > 30) {
                this.handleInput(deltaY > 0 ? 'ArrowDown' : 'ArrowUp');
            }
        });
    }

    getActualPlayerPosition() {
        // This is a placeholder. In a real scenario, this might query the DOM
        // or another source of truth for the player's position.
        return this.player;
    }

    handleInput(key) {
        if (!this.gameRunning || this.isTurning) return;

        let direction;
        switch (key) {
            case 'ArrowUp': direction = 'up'; break;
            case 'ArrowDown': direction = 'down'; break;
            case 'ArrowLeft': direction = 'left'; break;
            case 'ArrowRight': direction = 'right'; break;
            default: return;
        }

        // Always set pendingDirection to the new direction
        this.pendingDirection = direction;
        this.targetDirection = direction;

        // Start movement if not already moving
        if (!this.isMoving && this.gameRunning) {
            this.startPacManMovement();
        }
    }

    // New method to check if we can move in a direction
    canMoveInDirection(direction) {
        const availableDirections = this.getAvailableDirections();
        return availableDirections.includes(direction);
    }

    // New method to update rotation
    updateRotation(direction) {
        switch (direction) {
            case 'up': this.currentRotation = 180; break;
            case 'down': this.currentRotation = 0; break;
            case 'left': this.currentRotation = 90; break;
            case 'right': this.currentRotation = -90; break;
        }
    }

    // New Pac-Man style movement system
    startPacManMovement() {
        if (this.isMoving) return;
        this.isMoving = true;
        const moveLoop = () => {
            if (!this.gameRunning || !this.isMoving) {
                this.isMoving = false;
                return;
            }

            // Only allow direction change at a junction/intersection OR at path end
            if (this.pendingDirection && (this.isAtJunction && this.isAtJunction() || this.isAtPathEnd(this.player.x, this.player.y))) {
                if (this.canTurnAtIntersection(this.pendingDirection) || this.canTurnAtPathEnd(this.pendingDirection)) {
                    this.currentDirection = this.pendingDirection;
                    this.pendingDirection = null;
                    this.updateRotation(this.currentDirection);
                    this.updatePlayerSprite(this.currentDirection);
                }
            }

            // Calculate next position
            const nextX = this.player.x + (this.currentDirection === 'left' ? -this.moveSpeed :
                this.currentDirection === 'right' ? this.moveSpeed : 0);
            const nextY = this.player.y + (this.currentDirection === 'up' ? -this.moveSpeed :
                this.currentDirection === 'down' ? this.moveSpeed : 0);

            // Check if next position is valid
            if (this.isValidMove(this.player.x, this.player.y, nextX, nextY)) {
                this.player.x = nextX;
                this.player.y = nextY;
                this.maintainPathAlignment();
                this.updatePlayerPosition(this.currentRotation);
                this.checkCoinCollection();
                this.updateSpriteAnimation();

                // Update camera after player position changes
                if (this.camera) {
                    this.camera.updateCameraPosition();
                }
            } else {
                // Movement would be invalid: snap using the attempted next position
                const snapped = this.snapToNearestPathAnchor(nextX, nextY);
                if (!snapped) {
                    // Try snapping from current position as a fallback
                    this.snapToNearestPathAnchor(this.player.x, this.player.y);
                }
                this.maintainPathAlignment();
                this.updateRotation(this.currentDirection);
                this.updatePlayerPosition(this.currentRotation);

                // Update camera after player position changes
                if (this.camera) {
                    this.camera.updateCameraPosition();
                }

                this.isMoving = false;
                this.updatePlayerSprite(null);
                return;
            }

            setTimeout(moveLoop, this.moveInterval);
        };
        moveLoop();
    }

    // Method to maintain path alignment during movement
    maintainPathAlignment() {
        // Only snap to centerline if at a junction/intersection
        const paths = this.getPathsAtPosition(this.player.x, this.player.y);
        const atJunction = this.isAtJunction && this.isAtJunction();
        if (paths.length > 0 && atJunction) {
            if (this.currentDirection === 'left' || this.currentDirection === 'right') {
                const horizontalPath = paths.find(p => p.type === 'horizontal');
                if (horizontalPath) {
                    this.player.y = horizontalPath.y; // align to centerline
                }
            } else if (this.currentDirection === 'up' || this.currentDirection === 'down') {
                const verticalPath = paths.find(p => p.type === 'vertical');
                if (verticalPath) {
                    this.player.x = verticalPath.x; // align to centerline
                }
            }
        } else if (paths.length === 0) {
            this.snapToNearestPath();
        }
    }

    // Method to snap player to nearest path if they get off track
    snapToNearestPath() {
        const nearestPath = this.findNearestPath(this.player.x, this.player.y);
        if (nearestPath) {
            if (nearestPath.type === 'horizontal') {
                this.player.y = nearestPath.y; // align to centerline
            } else {
                this.player.x = nearestPath.x; // align to centerline
            }
        }
    }

    // Helper to snap to nearest endpoint/intersection on current paths
    snapToNearestPathAnchor(x, y) {
        const paths = this.getPathsAtPosition(x, y);
        if (paths.length === 0) return false;

        const candidates = [];

        paths.forEach(p => {
            if (p.type === 'horizontal') {
                // endpoints
                candidates.push({ x: p.xStart, y: p.y });
                candidates.push({ x: p.xEnd, y: p.y });
                // intersections along this horizontal
                this.validPaths.forEach(q => {
                    if (q.type === 'vertical' &&
                        q.x >= p.xStart - this.pathAlignmentTolerance &&
                        q.x <= p.xEnd + this.pathAlignmentTolerance &&
                        p.y >= q.yStart - this.pathAlignmentTolerance &&
                        p.y <= q.yEnd + this.pathAlignmentTolerance) {
                        candidates.push({ x: q.x, y: p.y });
                    }
                });
            } else {
                // vertical: endpoints
                candidates.push({ x: p.x, y: p.yStart });
                candidates.push({ x: p.x, y: p.yEnd });
                // intersections along this vertical
                this.validPaths.forEach(q => {
                    if (q.type === 'horizontal' &&
                        q.y >= p.yStart - this.pathAlignmentTolerance &&
                        q.y <= p.yEnd + this.pathAlignmentTolerance &&
                        p.x >= q.xStart - this.pathAlignmentTolerance &&
                        p.x <= q.xEnd + this.pathAlignmentTolerance) {
                        candidates.push({ x: p.x, y: q.y });
                    }
                });
            }
        });

        if (candidates.length === 0) return false;

        // Pick the closest anchor
        let best = null;
        let bestDist = Infinity;
        for (const c of candidates) {
            const dx = c.x - x;
            const dy = c.y - y;
            const d2 = dx * dx + dy * dy;
            if (d2 < bestDist) {
                bestDist = d2;
                best = c;
            }
        }

        if (best) {
            this.player.x = best.x;
            this.player.y = best.y;
            return true;
        }
        return false;
    }

    // New method for sprite animation
    updateSpriteAnimation() {
        if (!this.animationFrame) {
            this.animationFrame = 0;
        }

        this.animationFrame++;

        // Change sprite every 8 frames (adjust for desired animation speed)
        if (this.animationFrame % 8 === 0) {
            this.updatePlayerSprite(this.currentDirection);
        }
    }

    // Enhanced moveInDirection method for Pac-Man style movement
    moveInDirection(direction) {
        const paths = this.getPathsAtPosition(this.player.x, this.player.y);
        let moved = false;
        const step = this.moveSpeed;

        // Try to move along current path first
        for (const path of paths) {
            if (direction === 'up' || direction === 'down') {
                if (path.type === 'vertical') {
                    const newY = direction === 'up' ? this.player.y - step : this.player.y + step;
                    if (newY >= path.yStart - this.pathAlignmentTolerance &&
                        newY <= path.yEnd + this.pathAlignmentTolerance) {
                        this.player.y = newY;
                        this.player.x = path.x; // centerline
                        moved = true;
                        break;
                    }
                }
            } else {
                if (path.type === 'horizontal') {
                    const newX = direction === 'left' ? this.player.x - step : this.player.x + step;
                    if (newX >= path.xStart - this.pathAlignmentTolerance &&
                        newX <= path.xEnd + this.pathAlignmentTolerance) {
                        this.player.x = newX;
                        this.player.y = path.y; // centerline
                        moved = true;
                        break;
                    }
                }
            }
        }

        // If we couldn't move on current path, check for connecting paths
        if (!moved) {
            const newX = direction === 'left' ? this.player.x - step :
                direction === 'right' ? this.player.x + step : this.player.x;
            const newY = direction === 'up' ? this.player.y - step :
                direction === 'down' ? this.player.y + step : this.player.y;

            const newPaths = this.getPathsAtPosition(newX, newY);
            for (const newPath of newPaths) {
                for (const currentPath of paths) {
                    if (this.arePathsConnected(currentPath, newPath, this.player.x, this.player.y, newX, newY)) {
                        this.player.x = newX;
                        this.player.y = newY;
                        moved = true;
                        break;
                    }
                }
                if (moved) break;
            }
        }

        if (moved) {
            this.updatePlayerPosition(this.currentRotation);
            this.checkCoinCollection();

            // Update camera after player position changes
            if (this.camera) {
                this.camera.updateCameraPosition();
            }
        }

        return moved;
    }

    findNearestPath(x, y) {
        const tolerance = this.pathAlignmentTolerance; // Use normal tolerance, not doubled
        return this.validPaths.find(path => {
            if (path.type === 'horizontal') {
                return Math.abs(y - path.y) <= tolerance &&
                    x >= path.xStart - tolerance &&
                    x <= path.xEnd + tolerance;
            } else {
                return Math.abs(x - path.x) <= tolerance &&
                    y >= path.yStart - tolerance &&
                    y <= path.yEnd + tolerance;
            }
        });
    }

    removeDuplicatePaths(paths) {
        const unique = [];
        const keys = new Set();

        paths.forEach(p => {
            const key = p.type === 'horizontal'
                ? `h-${p.y}-${p.xStart}-${p.xEnd}`
                : `v-${p.x}-${p.yStart}-${p.yEnd}`;   // <-- include BOTH ends!

            if (!keys.has(key)) {
                keys.add(key);
                unique.push(p);
            }
        });

        return unique;
    }

    isValidMove(oldX, oldY, newX, newY) {


        // Check if both positions are on paths
        const oldPaths = this.getPathsAtPosition(oldX, oldY);
        const newPaths = this.getPathsAtPosition(newX, newY);

        if (oldPaths.length === 0 || newPaths.length === 0) {
            return false;
        }

        // Check if we're moving along a single path
        const singlePath = oldPaths.find(path =>
            newPaths.includes(path) &&
            ((path.type === 'horizontal' && Math.abs(oldY - newY) <= this.pathAlignmentTolerance) ||
                (path.type === 'vertical' && Math.abs(oldX - newX) <= this.pathAlignmentTolerance))
        );

        if (singlePath) {
            return true;
        }

        // Check if we're at a valid intersection
        const isAtIntersection = this.isAtIntersection(oldX, oldY);
        if (isAtIntersection) {
            // Allow movement to any connected path
            const validMove = newPaths.some(newPath => {
                return oldPaths.some(oldPath => {
                    if (oldPath === newPath) return true;

                    // Check if paths intersect
                    if (oldPath.type !== newPath.type) {
                        const intersectPoint = this.findIntersectionPoint(oldPath, newPath);
                        if (intersectPoint) {
                            // Check if we're close enough to the intersection
                            const distToIntersection = Math.hypot(oldX - intersectPoint.x, oldY - intersectPoint.y);
                            return distToIntersection <= this.pathAlignmentTolerance * 2;
                        }
                    }
                    return false;
                });
            });



            return validMove;
        }

        return false;
    }

    updatePlayerPosition() {
        const playerElement = document.getElementById('player');
        const gameBoard = document.getElementById('gameBoard');

        if (!playerElement || !gameBoard) {
            console.warn('Player or game board element not found');
            return;
        }

        // Update player element position
        this.updatePlayerElementPosition(playerElement);

        // Update camera position
        if (this.camera) {
            this.camera.updateCameraPosition();
        }
    }

    updatePlayerElementPosition(playerElement) {
        // Base placement centers the 32x32 box around logical position
        let left = this.player.x - 16;
        let top = this.player.y - 32;

        // Optional: tiny visual shift for horizontal directions only (do NOT change this.player)
        if (this.currentDirection === 'left' || this.currentDirection === 'right') {
            // e.g., move sprite up by 2px purely visually
            top -= 2;
        }

        playerElement.style.left = left + 'px';
        playerElement.style.top = top + 'px';
        playerElement.style.transform = '';
    }

    updatePlayerSprite(direction) {
        const playerElement = document.getElementById('player');
        if (!playerElement) {
            console.error('Player element not found!');
            return;
        }

        // Track last direction for idle state
        if (direction) {
            this.lastDirection = direction;
        }

        // Handle idle state (no movement)
        if (!direction && this.lastDirection) {
            let idleSprite;
            if (this.lastDirection === 'left') {
                idleSprite = 'leftsidewalkcycle_01.png';
            } else if (this.lastDirection === 'right') {
                idleSprite = 'rightsidewalkcycle_01.png';
            } else {
                // For up/down, use the first frame of their respective cycles
                idleSprite = this.lastDirection === 'up' ? 'Victor-backturnleftleg.png' : 'Victor-leftleg.png';
            }

            const imagePath = `url('../smrt-frontend/assets/images/${idleSprite}')`;
            playerElement.style.setProperty('background-image', imagePath, 'important');
            return;
        }

        // Map directions to sprite images
        const spriteMap = {
            'up': 'Avator-Back.gif',
            'down': 'Avator-Front.gif',
            'left': 'leftwalkcycle.gif',
            'right': 'rightwalkcycle.gif'
        };

        // Track step count for animation
        if (!this.stepCount) {
            this.stepCount = 0;
        }

        // Special case: first sprite should always be Victor-rightleg.png for right direction
        if (this.isFirstSprite && direction === 'right') {
            const imagePath = `url('../smrt-frontend/assets/images/Victor-leftleg.png')`;
            playerElement.style.setProperty('background-image', imagePath, 'important');
            this.isFirstSprite = false;
            return;
        }

        // Get the appropriate sprite image
        const spriteImage = spriteMap[direction] || 'Victor-rightleg.png';

        // Check if image is preloaded to prevent delays
        if (this.preloadedImages && this.preloadedImages[spriteImage]) {
            // Use preloaded image for immediate display
            const imagePath = `url('../smrt-frontend/assets/images/${spriteImage}')`;
            playerElement.style.setProperty('background-image', imagePath, 'important');
        } else {
            // Fallback to direct loading if not preloaded
            const imagePath = `url('../smrt-frontend/assets/images/${spriteImage}')`;
            playerElement.style.setProperty('background-image', imagePath, 'important');
        }

        // Increment step count for next animation
        this.stepCount++;
    }

    getCurrentPath() {
        const pathsAtPosition = this.getPathsAtPosition(this.player.x, this.player.y);
        if (pathsAtPosition.length > 0) {
            return pathsAtPosition[0]; // Return the first path found
        }
        return null;
    }

    checkCoinCollection() {
        const collectionRadius = 20; // Increased from 10 to 20 for better collection

        this.coins.forEach(coin => {
            if (coin.element.style.display === 'none') return;

            // Calculate distance between player and coin
            const distance = Math.hypot(this.player.x - coin.x, this.player.y - coin.y);

            if (!coin.collected) {
                if (distance < collectionRadius) {

                    coin.collected = true;
                    coin.element.style.display = 'none';
                    this.score++;
                    this.points += 5;

                    // Play coin collection sound
                    this.playCoinSound();

                    // Show points animation
                    this.showPointsAnimation(coin.x, coin.y, 5);

                    this.updateDisplay();
                    this.queueCoinRespawn(coin);
                }
            }
        });
    }

    // Add new methods for coin collection effects
    playCoinSound() {
        try {
            // Create audio context for ding sound
            const audioContext = new (window.AudioContext || window['webkitAudioContext'])();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Configure ding sound (high frequency, short duration)
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
            // Audio not supported or blocked
        }
    }

    showPointsAnimation(x, y, points) {
        // Create points animation element
        const pointsElement = document.createElement('div');
        pointsElement.className = 'points-animation';
        pointsElement.textContent = `+${points}`;
        pointsElement.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            color: #FFD700;
            font-weight: bold;
            font-size: 18px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            pointer-events: none;
            z-index: 1000;
            transform: translate(-50%, -50%);
            animation: pointsFloat 1s ease-out forwards;
        `;

        // Add to game board
        const gameBoard = document.getElementById('gameBoard');
        if (gameBoard) {
            gameBoard.appendChild(pointsElement);

            // Remove element after animation
            setTimeout(() => {
                if (pointsElement.parentNode) {
                    pointsElement.parentNode.removeChild(pointsElement);
                }
            }, 1000);
        }
    }

    startTimer() {
        // STEP 1: Nuclear timer clearing first
        if (typeof clearAllTimers === 'function') {
            clearAllTimers();
        }

        // STEP 2: Reset all timer-related state
        this.gameTimer = null;
        this.gameRunning = false;
        this.timeLeft = 60;

        // STEP 3: Start fresh timer
        this.gameRunning = true;
        this.gameTimer = setInterval(() => {
            this.timeLeft--;
            this.updateDisplay();

            if (this.timeLeft <= 0) {
                this.endGame();
            }
        }, 1000);

        // STEP 4: Add periodic coin collection check
        this.coinCheckInterval = setInterval(() => {
            if (this.gameRunning) {
                this.checkCoinCollection();
            }
        }, 200); // Check every 200ms


    }

    updateDisplay() {
        const pointsDisplay = document.getElementById('pointsDisplay');
        const timerDisplay = document.getElementById('timer');

        if (pointsDisplay) {
            pointsDisplay.textContent = this.points.toLocaleString();
        }
        if (timerDisplay) {
            // Format time as M:SS
            const minutes = Math.floor(this.timeLeft / 60);
            const seconds = this.timeLeft % 60;
            timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    endGame() {
        this.gameRunning = false;

        // Clear timer
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
            this.gameTimer = null;
        }

        // Clear coin check interval
        if (this.coinCheckInterval) {
            clearInterval(this.coinCheckInterval);
            this.coinCheckInterval = null;
        }

        // Clear movement intervals
        if (this.moveInterval) {
            clearInterval(this.moveInterval);
            this.moveInterval = null;
        }

        // Stop auto-move
        this.stopAutoMove();

        // Show appropriate end game screen based on score
        if (this.points >= 100) {
            // Fetch reward data from API for high scores
            this.fetchRewardData(this.points);
        } else {
            // FIXED: Use global showGameOver function for consistency
            if (typeof showGameOver === 'function') {
                showGameOver(this.points);
            } else {
                // Fallback to direct DOM manipulation
                const tryAgain = document.getElementById('try-again');
                const tryAgainScore = document.getElementById('try-again-score');
                if (tryAgain && tryAgainScore) {
                    tryAgainScore.textContent = this.points;
                    tryAgain.style.display = 'flex';
                    document.body.style.overflow = 'hidden';
                }
            }
        }
    }

    // Replace the current fetchRewardData method with this:
    async fetchRewardData(points) {
        try {
            if (!window.appConfig.apiUrl) {
                console.error("API URL not set in config.");
                return;
            }


            // Determine the correct API path based on current location

            let apiPath = `${window.appConfig.apiUrl}/smrt-gamification/api/reward.php`;

            // Adjust path based on current location
            // if (window.location.origin === 'https://devgaming.xerago.com') {
            //     apiPath = 'https://devgaming.xerago.com/smrt-gamification/api/reward.php';
            // }



            const response = await fetch(apiPath, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    points: points,
                    time_window: 60
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();


            if (result.success) {
                this.displayRewardPopup(result);
            } else {
                console.error('Reward API error:', result.message);
                this.displayFallbackReward(points);
            }

        } catch (error) {
            console.error('Error fetching reward data:', error);
            this.displayFallbackReward(points);
        }
    }

    // Add method to display reward section with API data
    displayRewardPopup(apiResult) {
        // Get Data and Append to tag
        document.getElementById('pr_reward_type').value = apiResult.reward_type;
        document.getElementById('pr_category').value = apiResult.data.category;
        document.getElementById('pr_image_url').value = apiResult.data.image_url;
        // Use the new reward section instead of the popup modal
        const rewardSection = document.getElementById('reward-section');
        const rewardPoints = document.getElementById('rewardPointsSection');
        const rewardCoupon = document.getElementById('rewardCouponSection');
        // Hide the game screen when showing the reward section
        const gameScreen = document.getElementById('game-screen');
        if (gameScreen) gameScreen.style.display = 'none';

        if (rewardSection && rewardPoints && rewardCoupon) {
            // Update points display
            rewardPoints.textContent = apiResult.additional_info.points_collected;

            // Update coupon data based on reward type
            if (apiResult.reward_type === 'static_offer' && apiResult.data) {
                const data = apiResult.data;
                // Update coupon box content
                const couponTitle = rewardSection.querySelector('.coupon-title');
                if (couponTitle) {
                    couponTitle.innerHTML = data.reward_title;
                }
                // Update coupon code
                rewardCoupon.textContent = data.promo_code;
                // Update coupon description
                const couponDesc = rewardSection.querySelector('.reward-coupon-desc');
                if (couponDesc) {
                    couponDesc.innerHTML = `<span class="terms">T&Cs apply. <a href="${data.terms_conditions_url ? data.terms_conditions_url : '#'}" target="_blank">Click here to read T&Cs.</a></span>`;
                }
                // Update claim button to link to merchant
                const claimBtn = rewardSection.querySelector('.reward-claim-btn');
                if (claimBtn && data.cta_url) {
                    claimBtn.onclick = () => {
                        window.open(data.cta_url, '_blank');
                    };
                }
            } else if ((apiResult.reward_type == 'lazada_5' || apiResult.reward_type === 'lazada_20') && apiResult.data) {
                // Handle Wink coupon format
                const data = apiResult.data;
                rewardCoupon.textContent = data.promo_code;
                const couponTitle = rewardSection.querySelector('.coupon-title');
                if (couponTitle) {
                    couponTitle.innerHTML = data.reward_title;//`<b>${data.discount_percentage}% OFF</b> Wink Purchase`;
                }

                const couponDesc = rewardSection.querySelector('.reward-coupon-desc');
                if (couponDesc) {
                    couponDesc.innerHTML = `<span class="terms">T&Cs apply. <a href="${data.terms_conditions_url ? data.terms_conditions_url : '#'}" target="_blank">Click here to read T&Cs.</a></span>`;
                }

                const claimBtn = rewardSection.querySelector('.reward-claim-btn');
                if (claimBtn && data.cta_url) {
                    claimBtn.onclick = () => {
                        window.open(data.cta_url, '_blank');
                    };
                }
            }
            // Show the reward section
            rewardSection.style.display = 'block';
            document.body.style.overflow = 'auto';
            window.scrollTo(0, 0); // Reset scroll for reward overlay
        }
    }

    // Add fallback method for when API fails
    displayFallbackReward(points) {
        const rewardSection = document.getElementById('reward-section');
        const rewardPoints = document.getElementById('rewardPointsSection');
        // Hide the game screen when showing the reward section (fallback)
        const gameScreen = document.getElementById('game-screen');
        if (gameScreen) gameScreen.style.display = 'none';

        if (rewardSection && rewardPoints) {
            rewardPoints.textContent = points;
            rewardSection.style.display = 'block';
            document.body.style.overflow = 'auto';
            window.scrollTo(0, 0); // Reset scroll for reward overlay (fallback)
        }
    }

    reset() {
        // STEP 1: Clear ALL timers and intervals
        if (typeof clearAllTimers === 'function') {
            clearAllTimers();
        }

        // STEP 2: Reset all game state
        this.gameTimer = null;
        this.moveInterval = null;
        this.autoMoveInterval = null;
        this.coinCheckInterval = null;
        this.gameRunning = false;
        this.timeLeft = 60;
        this.score = 0;
        this.points = 0;

        // STEP 2.5: Reset movement and direction state
        this.isMoving = false;
        this.currentDirection = 'right';
        this.pendingDirection = null;
        this.targetDirection = 'right';
        this.moveSpeed = 0.6; // Reset to constructor default (not 0.8)
        this.moveInterval = 14; // Reset to constructor default
        this.autoMoveSpeed = 1; // Reset to constructor default
        this.autoMoveTimeoutId = null; // Reset auto-move timeout

        // STEP 2.6: Clear visited paths and caches
        this.visitedPaths.clear();
        this.coinRespawnQueue.clear();
        this.intersectionCache.clear();

        // STEP 2.7: Reset camera system - FIXED: Reset before player position changes
        this.smoothCamera = null; // Reset smooth camera tracking

        // STEP 2.8: Clear all coin respawn timeouts
        if (this.coinRespawnTimeouts) {
            this.coinRespawnTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
            this.coinRespawnTimeouts = [];
        }

        // STEP 3: Reset player state to exact initial values
        this.player = { x: 128, y: 132 }; // Reset to exact starting position
        this.currentRotation = -90;
        this.lastValidRotation = -90;
        this.moveDirection = 'right';
        this.nextTurn = null;
        this.currentPath = null;
        this.isTurning = false;
        this.stepCount = 0;
        this.lastSpriteStep = -1;
        this.isFirstSprite = true;

        // STEP 3.5: Clean up DOM elements before recreating
        const gameBoard = document.getElementById('gameBoard');
        if (gameBoard) {
            // CRITICAL: Reset game board transform IMMEDIATELY
            gameBoard.style.transform = 'translate3d(0px, 0px, 0px)';

            // Remove all existing coin elements
            const existingCoins = gameBoard.querySelectorAll('.coin');
            existingCoins.forEach(coin => {
                if (coin.parentNode) {
                    coin.parentNode.removeChild(coin);
                }
            });

            // Remove all points animation elements
            const pointsAnimations = gameBoard.querySelectorAll('.points-animation');
            pointsAnimations.forEach(animation => {
                if (animation.parentNode) {
                    animation.parentNode.removeChild(animation);
                }
            });
        }

        // STEP 3.6: Re-initialize path data to ensure coins are placed on valid paths
        this.setupPathData();

        // STEP 4: Clear and recreate coins
        this.coins = [];
        this.setupCoins();

        // Force-reset collected flags for the new round
        this.coins.forEach(c => c.collected = false);

        // STEP 5: Ensure player starts at a valid path intersection with precise positioning
        const startingPaths = this.getPathsAtPosition(this.player.x, this.player.y);
        if (startingPaths.length === 0) {
            // If not on a path, find the nearest valid intersection
            const snapped = this.snapToNearestPathAnchor(this.player.x, this.player.y);
            if (!snapped) {
                // Fallback: use a known valid starting position
                this.player = { x: 128, y: 132 };
                this.snapToNearestPath();
            }
        } else {
            // Player is on a path, but ensure they're exactly on the centerline
            // Find the primary path (horizontal takes precedence for right-facing start)
            const horizontalPath = startingPaths.find(p => p.type === 'horizontal');
            const verticalPath = startingPaths.find(p => p.type === 'vertical');

            if (horizontalPath) {
                // Align to horizontal path centerline
                this.player.y = horizontalPath.y;
            }
            if (verticalPath) {
                // Align to vertical path centerline
                this.player.x = verticalPath.x;
            }
        }

        // STEP 5.1: FIXED - Complete camera reset and initialization
        if (this.camera) {
            // Reset camera's internal state completely
            this.camera.player = this.player; // Update camera's player reference
            this.camera.smoothCamera = null; // Force complete reset
            this.camera.lastTransformX = null; // Reset cached transform values
            this.camera.lastTransformY = null;

            // Force immediate camera initialization with current player position
            this.camera.initializeCamera();

            // Apply initial camera position immediately (synchronously)
            this.camera.updateCameraPosition();

            // CRITICAL: Force DOM update to happen immediately
            if (gameBoard) {
                const transform = gameBoard.style.transform;
                gameBoard.style.transform = transform; // Force style recalculation
            }
        } else {
            // If camera doesn't exist, reinitialize it completely
            this.initializeCamera();
        }

        // STEP 6: Reset DOM elements (player position)
        const playerElement = document.getElementById('player');
        if (playerElement) {
            // Update player element position directly
            let left = this.player.x - 16;
            let top = this.player.y - 32;
            if (this.currentDirection === 'left' || this.currentDirection === 'right') {
                top -= 2;
            }
            playerElement.style.left = left + 'px';
            playerElement.style.top = top + 'px';
            playerElement.style.transform = '';
        }

        // STEP 7: Final camera position update with double-check
        // Use requestAnimationFrame to ensure all DOM updates are complete
        requestAnimationFrame(() => {
            if (this.camera) {
                // Force one more camera update after all DOM changes
                this.camera.initializeCamera(); // Re-initialize with final positions
                this.camera.updateCameraPosition(); // Apply the position
            }

            // Additional safety check - ensure game board is at correct position
            requestAnimationFrame(() => {
                if (this.camera && gameBoard) {
                    // Final verification that camera is properly positioned
                    const currentTransform = gameBoard.style.transform;
                    if (currentTransform === 'translate3d(0px, 0px, 0px)' ||
                        !currentTransform || currentTransform === 'none') {
                        // Camera might not have initialized properly, force it
                        this.camera.initializeCamera();
                        this.camera.updateCameraPosition();
                    }
                }
            });
        });

        // STEP 8: Update sprites and display
        this.updatePlayerSprite('right');
        this.updateDisplay();
    }

    // New method to track visited paths
    updateVisitedPaths(coin) {
        // Create a path section identifier based on coin position
        const pathSection = `${Math.floor(coin.x / 50)}-${Math.floor(coin.y / 50)}`;
        this.visitedPaths.add(pathSection);
    }

    // New method to queue coin respawn
    queueCoinRespawn(coin) {
        const timeoutId = setTimeout(() => {
            if (coin.element && coin.element.parentNode) {
                coin.element.remove();
            }
            const respawnPosition = this.findRespawnPosition();
            if (respawnPosition) {
                const newCoin = {
                    x: respawnPosition.x,
                    y: respawnPosition.y,
                    id: coin.id,
                    collected: false,
                    imgNum: coin.imgNum
                };

                const coinElement = document.createElement('div');
                coinElement.className = 'coin';
                coinElement.style.left = newCoin.x + 'px';
                coinElement.style.top = newCoin.y + 'px';
                coinElement.id = `coin-${newCoin.id}`;
                const img = document.createElement('img');
                img.src = `images/0${newCoin.imgNum}-icon.png`;
                img.alt = `Points ${newCoin.imgNum}`;
                img.style.width = '100%';
                img.style.height = '100%';
                img.draggable = false;
                coinElement.appendChild(img);
                coinElement.style.transform = 'translate(-50%, -50%)';
                const gameBoard = document.getElementById('gameBoard');
                if (gameBoard) {
                    gameBoard.appendChild(coinElement);
                }
                newCoin.element = coinElement;
                const index = this.coins.findIndex(c => c.id === coin.id);
                if (index !== -1) {
                    this.coins[index] = newCoin;
                }
            }
        }, this.coinRespawnDelay);
        this.coinRespawnTimeouts.push(timeoutId); // Track timeout
    }

    findRespawnPosition() {
        // Get all valid path positions
        const validPositions = [];

        this.validPaths.forEach(path => {
            if (path.type === 'horizontal') {
                // Add positions along horizontal path
                for (let x = path.xStart + 20; x <= path.xEnd - 20; x += 40) {
                    validPositions.push({ x, y: path.y });
                }
            } else {
                // Add positions along vertical path
                for (let y = path.yStart + 20; y <= path.yEnd - 20; y += 40) {
                    validPositions.push({ x: path.x, y });
                }
            }
        });

        // Filter out positions that are too close to existing coins
        const availablePositions = validPositions.filter(pos => {
            return !this.coins.some(coin => {
                if (coin.collected) return false;
                const distance = Math.sqrt(
                    Math.pow(pos.x - coin.x, 2) +
                    Math.pow(pos.y - coin.y, 2)
                );
                return distance < 30; // Minimum distance between coins
            });
        });

        // Return a random position from available positions
        if (availablePositions.length > 0) {
            const randomIndex = Math.floor(Math.random() * availablePositions.length);
            return availablePositions[randomIndex];
        }

        return null;
    }

    // Modified startAutoMove to ensure continuous movement along paths
    startAutoMove() {
        if (this.autoMoving) return;
        this.autoMoving = true;

        const doMove = () => {
            if (!this.gameRunning || !this.autoMoving) {
                this.autoMoving = false;
                return;
            }

            const direction = this.moveDirection;
            const nextPoint = this.findNextStopPoint(this.player.x, this.player.y, direction);

            // If no next point found, we've reached the end of the path - STOP
            if (!nextPoint) {
                this.autoMoving = false;
                return;
            }

            // Check if we're at a junction and need to turn
            if (this.isAtJunction() && this.nextTurn && this.nextTurn !== this.moveDirection && !this.isTurning) {
                const fromDir = this.moveDirection;
                const toDir = this.nextTurn;
                this.nextTurn = null;
                this.isTurning = true;

                this.animateCurveTurn(fromDir, toDir, () => {
                    this.moveDirection = toDir;
                    this.isTurning = false;
                    // Continue movement after turn
                    if (this.autoMoving && this.gameRunning) {
                        this.autoMoveTimeoutId = setTimeout(doMove, 100);
                    }
                });
                return;
            }

            // Move to the next point along the path
            this.moveToNextPoint(nextPoint, () => {
                // Continue movement automatically
                if (this.autoMoving && this.gameRunning) {
                    this.autoMoveTimeoutId = setTimeout(doMove, 100);
                }
            }, 600); // Slightly faster movement for better flow
        };

        // Start the movement cycle
        doMove();
    }

    stopAutoMove() {
        this.autoMoving = false;
        if (this.autoMoveInterval) {
            clearInterval(this.autoMoveInterval);
            this.autoMoveInterval = null;
        }
        if (this.moveInterval) {
            clearInterval(this.moveInterval);
            this.moveInterval = null;
        }
        if (this.autoMoveTimeoutId) {
            clearTimeout(this.autoMoveTimeoutId);
            this.autoMoveTimeoutId = null;
        }
    }

    moveToNextPoint(targetPoint, onComplete, duration = 600) {
        if (!targetPoint) {
            if (onComplete) onComplete();
            return;
        }

        const startX = this.player.x;
        const startY = this.player.y;
        const targetX = targetPoint.x;
        const targetY = targetPoint.y;

        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Use ease-in-out for smooth movement
            const easeProgress = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            // Interpolate position
            this.player.x = startX + (targetX - startX) * easeProgress;
            this.player.y = startY + (targetY - startY) * easeProgress;

            // Update player position and camera
            this.maintainPathAlignment();
            this.updatePlayerPosition(this.currentRotation);
            if (this.camera) {
                this.camera.updateCameraPosition();
            }

            // Check for coin collection during movement
            this.checkCoinCollection();

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Ensure we end up exactly at the target
                this.player.x = targetX;
                this.player.y = targetY;
                this.maintainPathAlignment();
                this.updatePlayerPosition(this.currentRotation);
                if (this.camera) {
                    this.camera.updateCameraPosition();
                }

                if (onComplete) onComplete();
            }
        };

        requestAnimationFrame(animate);
    }

    // Improved path detection - find all paths at current position
    getPathsAtPosition(x, y) {
        // Remove the aggressive pre-snap logic that was causing teleporting
        const tolerance = this.pathAlignmentTolerance;
        const paths = this.validPaths.filter(path => {
            const eps = 0.5; // tiny cushion to defeat float steps

            if (path.type === 'horizontal') {
                const withinY = Math.abs(y - path.y) <= tolerance;
                const withinX = (x >= path.xStart - tolerance - eps) && (x <= path.xEnd + tolerance + eps);
                return withinY && withinX;
            } else {
                const withinX = Math.abs(x - path.x) <= tolerance;
                const withinY = (y >= path.yStart - tolerance - eps) && (y <= path.yEnd + tolerance + eps);
                return withinX && withinY;
            }
        });

        return paths;
    }

    // Check if position is on any valid path
    isOnPath(x, y) {
        return this.getPathsAtPosition(x, y).length > 0;
    }

    // Get available directions at current position
    getAvailableDirections() {
        const directions = [];

        // Use larger step size for better direction detection
        const stepSize = Math.max(this.gridSize, this.moveSpeed * 6); // At least 12 pixels

        // Check each direction
        const directionsToCheck = [
            { dir: 'up', dx: 0, dy: -stepSize },
            { dir: 'down', dx: 0, dy: stepSize },
            { dir: 'left', dx: -stepSize, dy: 0 },
            { dir: 'right', dx: stepSize, dy: 0 }
        ];

        directionsToCheck.forEach(({ dir, dx, dy }) => {
            const newX = this.player.x + dx;
            const newY = this.player.y + dy;

            if (this.isValidMove(this.player.x, this.player.y, newX, newY)) {
                directions.push(dir);
            }
        });

        return directions;
    }

    // Continuous movement method
    continuousMove() {
        // This method is now only used for legacy auto-move, but we want all auto-move to stop at intersections
        // so we keep the logic for smooth turns, but main auto-move is handled in handleInput now
        if (this.nextTurn && this.isAtJunction() && !this.isTurning) {
            if (this.isCenteredAtJunction()) {
                const fromDir = this.moveDirection;
                const toDir = this.nextTurn;
                this.nextTurn = null;
                this.animateCurveTurn(fromDir, toDir, () => {
                    this.moveDirection = toDir;
                });
                return;
            } else {
                return;
            }
        }
        if (this.isTurning) return;
        if (this.isAtJunction() && !this.isCenteredAtJunction()) {
            return;
        }
        this.moveInDirection(this.moveDirection);
        this.checkCoinCollection();
        if (this.isAtJunction()) {
            const availableDirections = this.getAvailableDirections();
            const oppositeDir = this.getOppositeDirection(this.moveDirection);
            const choices = availableDirections.filter(dir => dir !== oppositeDir);
            if (choices.length > 1) {
                if (this.moveInterval) {
                    clearInterval(this.moveInterval);
                    this.moveInterval = null;
                }
            }
        }
    }

    isValidPosition(x, y) {
        // Use larger tolerance for more forgiving line detection
        const tolerance = this.pathAlignmentTolerance * 1.5; // 18 pixels total
        return this.validPaths.some(path => {
            if (path.type === 'horizontal') {
                return Math.abs(y - path.y) <= tolerance &&
                    x >= path.xStart - tolerance &&
                    x <= path.xEnd + tolerance;
            } else {
                return Math.abs(x - path.x) <= tolerance &&
                    y >= path.yStart - tolerance &&
                    y <= path.yEnd + tolerance;
            }
        });
    }

    // Improved junction detection method
    isAtJunction() {
        const tolerance = this.pathAlignmentTolerance;
        const currentPaths = this.validPaths.filter(path => {
            if (path.type === 'horizontal') {
                return Math.abs(this.player.y - path.y) <= tolerance &&
                    this.player.x >= path.xStart - tolerance &&
                    this.player.x <= path.xEnd + tolerance;
            } else {
                return Math.abs(this.player.x - path.x) <= tolerance &&
                    this.player.y >= path.yStart - tolerance &&
                    this.player.y <= path.yEnd + tolerance;
            }
        });

        // Check if we're at an intersection (multiple paths)
        return currentPaths.length > 1;
    }

    // Helper to get the opposite direction
    getOppositeDirection(direction) {
        switch (direction) {
            case 'up': return 'down';
            case 'down': return 'up';
            case 'left': return 'right';
            case 'right': return 'left';
            default: return null;
        }
    }


    buildCurvedPath(points, radius = 32) {
        if (points.length < 2) return '';
        let d = `M${points[0].x},${points[0].y}`;

        for (let i = 1; i < points.length - 1; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const next = points[i + 1];

            const v1 = { x: curr.x - prev.x, y: curr.y - prev.y };
            const v2 = { x: next.x - curr.x, y: next.y - curr.y };

            const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
            const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

            // If segments are 0 length, just draw a line to the corner
            if (len1 === 0 || len2 === 0) {
                d += ` L${curr.x},${curr.y}`;
                continue;
            }

            // Dynamically adjust radius to prevent curve overlap
            const effectiveRadius = Math.min(radius, len1 / 2, len2 / 2);

            const v1n = { x: v1.x / len1, y: v1.y / len1 };
            const v2n = { x: v2.x / len2, y: v2.y / len2 };

            const start = { x: curr.x - v1n.x * effectiveRadius, y: curr.y - v1n.y * effectiveRadius };
            const end = { x: curr.x + v2n.x * effectiveRadius, y: curr.y + v2n.y * effectiveRadius };

            d += ` L${start.x},${start.y} Q${curr.x},${curr.y} ${end.x},${end.y}`;
        }

        const last = points[points.length - 1];
        d += ` L${last.x},${last.y}`;
        return d;
    }



    // In your MetroMazeGame class:
    drawAllMetroLines() {
        const greenLine = [
            { x: 30, y: 100 },
            { x: 120, y: 100 },
            { x: 120, y: 200 },
            { x: 220, y: 200 },
            { x: 220, y: 300 }
        ];
        this.drawMetroLine(greenLine, '#4CAF50', 2.25, 32);
        // Add more lines as needed
    }

    setupTapToStart() {
        const tapOverlay = document.getElementById('tapToStart');
        if (!tapOverlay) return;

        // CRITICAL: Remove ALL existing listeners first
        tapOverlay.replaceWith(tapOverlay.cloneNode(true));
        const freshOverlay = document.getElementById('tapToStart');

        // Use single handler with once:true to prevent accumulation
        const handleTap = (event) => {
            event.preventDefault();
            event.stopPropagation();

            freshOverlay.style.display = 'none';

            // Clear ALL timers before starting
            if (typeof clearAllTimers === 'function') {
                clearAllTimers();
            }

            this.startTimer();
            this.gameRunning = true;
        };

        // Use once:true to auto-remove listeners
        freshOverlay.addEventListener('pointerup', handleTap, { once: true });
        freshOverlay.addEventListener('click', handleTap, { once: true });
    }

    // Smooth cubic Bezier arc for all curve transitions
    animateCurveTurn(fromDir, toDir, onComplete) {
        if (this.isTurning) return;
        this.isTurning = true;
        const grid = 20;
        const { x: startX, y: startY } = this.player;
        // Find intersection center (end point)
        let cx = startX, cy = startY;
        const paths = this.getPathsAtPosition(startX, startY);
        if (paths.length >= 2) {
            for (let i = 0; i < paths.length; i++) {
                for (let j = i + 1; j < paths.length; j++) {
                    const p1 = paths[i], p2 = paths[j];
                    if (p1.type !== p2.type) {
                        cx = p1.type === 'vertical' ? p1.x : p2.x;
                        cy = p1.type === 'horizontal' ? p1.y : p2.y;
                    }
                }
            }
        }
        // Direction vectors
        const dirVec = {
            up: { x: 0, y: -1 },
            down: { x: 0, y: 1 },
            left: { x: -1, y: 0 },
            right: { x: 1, y: 0 }
        };
        // Control points for cubic Bezier
        const p0 = { x: startX, y: startY };
        const p3 = { x: cx, y: cy };
        // Control point 1: in the direction of fromDir
        const p1 = {
            x: p0.x + dirVec[fromDir].x * grid,
            y: p0.y + dirVec[fromDir].y * grid
        };
        // Control point 2: in the direction of toDir
        const p2 = {
            x: p3.x + dirVec[toDir].x * grid,
            y: p3.y + dirVec[toDir].y * grid
        };
        const duration = 400; // ms, slightly less than straight for snappier feel
        // Target rotation
        let endRotation = 0;
        switch (toDir) {
            case 'up': endRotation = 180; break;
            case 'down': endRotation = 0; break;
            case 'left': endRotation = 90; break;
            case 'right': endRotation = -90; break;
        }
        const animate = () => {
            const now = Date.now();
            const t = Math.min((now - startTime) / duration, 1);
            // Ease-in/ease-out
            const easeT = t < 0.5
                ? 2 * t * t
                : 1 - Math.pow(-2 * t + 2, 2) / 2;
            // Cubic Bezier interpolation
            const bezier = (a, b, c, d, t) =>
                Math.pow(1 - t, 3) * a +
                3 * Math.pow(1 - t, 2) * t * b +
                3 * (1 - t) * t * t * c +
                t * t * t * d;
            this.player.x = bezier(p0.x, p1.x, p2.x, p3.x, easeT);
            this.player.y = bezier(p0.y, p1.y, p2.y, p3.y, easeT);
            // Rotation tangent to curve
            // Derivative of cubic Bezier
            const dx =
                3 * Math.pow(1 - easeT, 2) * (p1.x - p0.x) +
                6 * (1 - easeT) * easeT * (p2.x - p1.x) +
                3 * easeT * easeT * (p3.x - p2.x);
            const dy =
                3 * Math.pow(1 - easeT, 2) * (p1.y - p0.y) +
                6 * (1 - easeT) * easeT * (p2.y - p1.y) +
                3 * easeT * easeT * (p3.y - p2.y);
            this.currentRotation = Math.atan2(dy, dx) * 180 / Math.PI - 90;
            this.updatePlayerPosition(this.currentRotation);

            // Update camera during animation
            if (this.camera) {
                this.camera.updateCameraPosition();
            }

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                // Target rotation first
                this.currentRotation = endRotation;

                // Snap to intersection centerline
                this.player.x = p3.x;
                this.player.y = p3.y;

                // If we finished near an anchor, snap to it to avoid subpixel drift
                this.snapToNearestPathAnchor(this.player.x, this.player.y);

                // Final align to centerline and paint
                this.maintainPathAlignment();
                this.updatePlayerPosition(this.currentRotation);

                // Update camera after final position
                if (this.camera) {
                    this.camera.updateCameraPosition();
                }

                this.isTurning = false;
                if (onComplete) onComplete();
            }
        };
        const startTime = Date.now();
        animate();
    }

    createArrow() {
        const playerElement = document.getElementById('player');
        if (!playerElement) return;

        let arrow = document.getElementById('player-arrow');
        if (!arrow) {
            arrow = document.createElement('img');
            arrow.id = 'player-arrow';
            arrow.src = 'images/Pointing-Arrow.png';
            arrow.style.position = 'absolute';
            arrow.style.width = '34px'; // Slightly increased size
            arrow.style.height = '34px';
            arrow.style.left = '49%';
            arrow.style.top = '-28px'; // Move closer to player
            arrow.style.transform = 'translateX(-50%)';
            arrow.classList.add('blinking');
            playerElement.appendChild(arrow);
        } else {
            // Reset to big and blinking on game start
            arrow.style.width = '34px';
            arrow.style.height = '34px';
            arrow.classList.add('blinking');
        }
    }

    // Show the reward popup modal
    showRewardPopup() {
        document.getElementById('rewardPoints').textContent = this.points;
        document.getElementById('rewardPopup').style.display = 'flex';
        this.gameRunning = false;
    }

    // Add this method to check if the player is exactly centered at a junction
    isCenteredAtJunction() {
        const paths = this.getPathsAtPosition(this.player.x, this.player.y);
        if (paths.length < 2) return false; // Not a junction
        for (let i = 0; i < paths.length; i++) {
            for (let j = i + 1; j < paths.length; j++) {
                const p1 = paths[i], p2 = paths[j];
                let cx = null, cy = null;
                if (p1.type === 'horizontal' && p2.type === 'vertical') {
                    cx = p2.x;
                    cy = p1.y;
                } else if (p1.type === 'vertical' && p2.type === 'horizontal') {
                    cx = p1.x;
                    cy = p2.y;
                }
                if (cx !== null && cy !== null) {
                    if (Math.abs(this.player.x - cx) <= 1 && Math.abs(this.player.y - cy) <= 1) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // Helper to check if a position is inside a building
    isInBlockedArea() {
        // Check if position is in the blocked area where movement is restricted
        // Block the area around x=12 to x=100 at y=450
        // if (y === 450 && x >= 12 && x <= 100) {
        //     return true;
        // }
        return false;
    }

    isInBuilding(x, y) {
        // Use the same buildingBlocks as in setupCoins
        const buildingBlocks = [
            { x: 18, y: 20, w: 32, h: 22 },
            { x: 54, y: 20, w: 32, h: 22 },
            { x: 88, y: 20, w: 32, h: 22 },
            { x: 18, y: 60, w: 32, h: 22 },
            { x: 54, y: 60, w: 32, h: 22 },
            { x: 88, y: 60, w: 32, h: 22 },
            { x: 138, y: 20, w: 60, h: 50 },
            { x: 138, y: 75, w: 30, h: 45 },
            { x: 218, y: 20, w: 98, h: 45 },
            { x: 10, y: 105, w: 46, h: 30 },
            { x: 186, y: 96, w: 30, h: 28 },
            { x: 222, y: 82, w: 30, w: 70 },
            { x: 72, y: 98, w: 48, h: 24 },
            { x: 72, y: 126, w: 24, h: 26 },
            { x: 166, y: 140, w: 40, h: 35 },
            { x: 166, y: 180, w: 40, h: 50 },
            { x: 268, y: 82, w: 50, h: 32 },
            { x: 270, y: 130, w: 50, h: 22 },
            { x: 10, y: 172, w: 46, h: 90 },
            { x: 72, y: 172, w: 24, h: 90 },
            { x: 114, y: 140, w: 44, h: 52 },
            { x: 114, y: 198, w: 44, h: 32 },
            { x: 225, y: 168, w: 26, h: 60 },
            { x: 268, y: 168, w: 54, h: 60 },
            { x: 200, y: 282, w: 45, h: 60 },
            { x: 20, y: 278, w: 75, h: 36 },
            { x: 20, y: 320, w: 75, h: 22 },
            { x: 114, y: 245, w: 66, h: 60 },
            { x: 200, y: 245, w: 70, h: 20 },
            { x: 275, y: 245, w: 45, h: 20 },
            // No building blocks at or near (250, 430+) or (328, 394+)
            { x: 16, y: 356, w: 70, h: 32 },
            { x: 108, y: 356, w: 70, h: 32 },
            { x: 16, y: 400, w: 70, h: 44 },
            { x: 106, y: 400, w: 74, h: 44 },
            { x: 196, y: 356, w: 54, h: 32 },
            { x: 196, y: 400, w: 54, h: 44 },
            { x: 262, y: 326, w: 58, h: 63 },
            { x: 20, y: 460, w: 20, h: 30 },
            { x: 60, y: 448, w: 26, h: 46 },
            { x: 104, y: 456, w: 50, h: 40 },
            { x: 166, y: 456, w: 78, h: 40 },
            { x: 262, y: 400, w: 66, h: 24 },
            { x: 262, y: 435, w: 59, h: 16 },
            { x: 260, y: 456, w: 62, h: 40 }
        ];
        return buildingBlocks.some(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
    }

    // Helper method to check if we're at a valid intersection
    isAtIntersection(x, y) {
        const tolerance = this.pathAlignmentTolerance;
        const paths = this.getPathsAtPosition(x, y);

        if (paths.length < 2) return false;

        // Check if we have different types of paths
        const horizontalPaths = paths.filter(p => p.type === 'horizontal');
        const verticalPaths = paths.filter(p => p.type === 'vertical');

        if (horizontalPaths.length === 0 || verticalPaths.length === 0) return false;

        // Find exact intersection point
        let intersectionPoint = null;
        for (const hPath of horizontalPaths) {
            for (const vPath of verticalPaths) {
                if (vPath.x >= hPath.xStart - tolerance &&
                    vPath.x <= hPath.xEnd + tolerance &&
                    hPath.y >= vPath.yStart - tolerance &&
                    hPath.y <= vPath.yEnd + tolerance) {
                    intersectionPoint = { x: vPath.x, y: hPath.y };
                    break;
                }
            }
            if (intersectionPoint) break;
        }

        if (!intersectionPoint) return false;

        // Check if we're close enough to the intersection point
        const distance = Math.hypot(x - intersectionPoint.x, y - intersectionPoint.y);



        return distance <= tolerance;
    }

    // Enhanced findNextStopPoint to better handle path ends
    findNextStopPoint(x, y, direction) {
        const currentPaths = this.getPathsAtPosition(x, y);
        if (currentPaths.length === 0) return null;

        const nextPoints = [];

        // Reference point for distance sorting; may be updated after snapping
        let refX = x;
        let refY = y;

        if (currentPaths.length === 1) {
            const path = currentPaths[0];
            const near = this.pathAlignmentTolerance;

            if (path.type === 'vertical') {
                if (Math.abs(y - path.yStart) <= near) y = path.yStart;
                if (Math.abs(y - path.yEnd) <= near) y = path.yEnd;
            } else {
                if (Math.abs(x - path.xStart) <= near) x = path.xStart;
                if (Math.abs(x - path.xEnd) <= near) x = path.xEnd;
            }

            const atPathEnd = (
                (path.type === 'vertical' && (y === path.yStart || y === path.yEnd)) ||
                (path.type === 'horizontal' && (x === path.xStart || x === path.xEnd))
            );

            // Use snapped coordinates as distance reference
            refX = x;
            refY = y;

            if (atPathEnd) {
                // At path end - look for intersecting paths in the desired direction
                this.validPaths.forEach(otherPath => {
                    if (otherPath !== path && this.pathsIntersect(path, otherPath)) {
                        const intersection = this.findIntersectionPoint(path, otherPath);
                        if (intersection && this.isInMovementDirection(x, y, intersection.x, intersection.y, direction)) {
                            nextPoints.push({ ...intersection, type: 'intersection' });
                        }
                    }
                });

                // If no intersection found in desired direction, return null (stop movement)
                return nextPoints.length > 0 ? nextPoints[0] : null;
            } else {
                // Continue along the current path
                if (path.type === 'vertical') {
                    let targetY = direction === 'up'
                        ? Math.max(path.yStart, y - 50)
                        : Math.min(path.yEnd, y + 50);

                    // if we're very close to ends, snap
                    if (Math.abs(targetY - path.yStart) <= near) targetY = path.yStart;
                    if (Math.abs(targetY - path.yEnd) <= near) targetY = path.yEnd;

                    if (targetY !== y) nextPoints.push({ x: path.x, y: targetY, type: 'pathContinuation' });
                } else {
                    let targetX = direction === 'left'
                        ? Math.max(path.xStart, x - 50)
                        : Math.min(path.xEnd, x + 50);

                    if (Math.abs(targetX - path.xStart) <= near) targetX = path.xStart;
                    if (Math.abs(targetX - path.xEnd) <= near) targetX = path.xEnd;

                    if (targetX !== x) nextPoints.push({ x: targetX, y: path.y, type: 'pathContinuation' });
                }

                // Also check for intersections along the way
                this.validPaths.forEach(otherPath => {
                    if (otherPath !== path && this.pathsIntersect(path, otherPath)) {
                        const intersection = this.findIntersectionPoint(path, otherPath);
                        if (intersection && this.isInMovementDirection(x, y, intersection.x, intersection.y, direction)) {
                            nextPoints.push({ ...intersection, type: 'intersection' });
                        }
                    }
                });
            }
        } else {
            // Multiple paths at current position (junction)
            currentPaths.forEach(path => {
                if ((direction === 'up' || direction === 'down') && path.type === 'vertical') {
                    // Move to the end of the vertical path
                    const targetY = direction === 'up' ? path.yStart : path.yEnd;
                    if ((direction === 'up' && targetY < y) || (direction === 'down' && targetY > y)) {
                        nextPoints.push({ x: path.x, y: targetY, type: 'pathEnd' });
                    }

                    // Find intersections along this path
                    this.validPaths.forEach(otherPath => {
                        if (otherPath.type === 'horizontal' && this.pathsIntersect(path, otherPath)) {
                            const intersection = this.findIntersectionPoint(path, otherPath);
                            if (intersection && this.isInMovementDirection(x, y, intersection.x, intersection.y, direction)) {
                                nextPoints.push({ ...intersection, type: 'intersection' });
                            }
                        }
                    });
                }

                if ((direction === 'left' || direction === 'right') && path.type === 'horizontal') {
                    // Move to the end of the horizontal path
                    const targetX = direction === 'left' ? path.xStart : path.xEnd;
                    if ((direction === 'left' && targetX < x) || (direction === 'right' && targetX > x)) {
                        nextPoints.push({ x: targetX, y: path.y, type: 'pathEnd' });
                    }

                    // Find intersections along this path
                    this.validPaths.forEach(otherPath => {
                        if (otherPath.type === 'vertical' && this.pathsIntersect(path, otherPath)) {
                            const intersection = this.findIntersectionPoint(path, otherPath);
                            if (intersection && this.isInMovementDirection(x, y, intersection.x, intersection.y, direction)) {
                                nextPoints.push({ ...intersection, type: 'intersection' });
                            }
                        }
                    });
                }
            });
        }

        // Return the closest point in the desired direction
        if (nextPoints.length > 0) {
            // Sort by distance and return the closest
            nextPoints.sort((a, b) => {
                const distA = Math.hypot(a.x - refX, a.y - refY);
                const distB = Math.hypot(b.x - refX, b.y - refY);
                return distA - distB;
            });
            return nextPoints[0];
        }

        return null; // No valid next point - end of path
    }

    isInMovementDirection(fromX, fromY, toX, toY, direction) {
        switch (direction) {
            case 'up': return toY < fromY;
            case 'down': return toY > fromY;
            case 'left': return toX < fromX;
            case 'right': return toX > fromX;
            default: return false;
        }
    }

    pathsIntersect(path1, path2) {
        // Check if two paths intersect
        if (path1.type === path2.type) {
            return false; // Same type paths don't intersect
        }

        const tolerance = this.pathAlignmentTolerance;

        if (path1.type === 'horizontal' && path2.type === 'vertical') {
            // Check if vertical path x is within horizontal path x range
            const xIntersects = path2.x >= path1.xStart - tolerance &&
                path2.x <= path1.xEnd + tolerance;

            // Check if horizontal path y is within vertical path y range
            const yIntersects = path1.y >= path2.yStart - tolerance &&
                path1.y <= path2.yEnd + tolerance;

            return xIntersects && yIntersects;
        } else if (path1.type === 'vertical' && path2.type === 'horizontal') {
            // Check if horizontal path y is within vertical path y range
            const yIntersects = path2.y >= path1.yStart - tolerance &&
                path2.y <= path1.yEnd + tolerance;

            // Check if vertical path x is within horizontal path x range
            const xIntersects = path1.x >= path2.xStart - tolerance &&
                path1.x <= path2.xEnd + tolerance;

            return xIntersects && yIntersects;
        }

        return false;
    }

    findIntersectionPoint(path1, path2) {
        // Find the exact intersection point between two paths
        if (!this.pathsIntersect(path1, path2)) {
            return null;
        }

        if (path1.type === 'horizontal' && path2.type === 'vertical') {
            return {
                x: path2.x,
                y: path1.y
            };
        } else if (path1.type === 'vertical' && path2.type === 'horizontal') {
            return {
                x: path1.x,
                y: path2.y
            };
        }

        return null;
    }

    isNearJunction(toleranceMultiplier = 2) {
        const tolerance = this.pathAlignmentTolerance * toleranceMultiplier;
        const currentPaths = this.validPaths.filter(path => {
            if (path.type === 'horizontal') {
                return Math.abs(this.player.y - path.y) <= tolerance &&
                    this.player.x >= path.xStart - tolerance &&
                    this.player.x <= path.xEnd + tolerance;
            } else {
                return Math.abs(this.player.x - path.x) <= tolerance &&
                    this.player.y >= path.yStart - tolerance &&
                    this.player.y <= path.yEnd + tolerance;
            }
        });
        return currentPaths.length > 1;
    }

    // Enhanced method to check if a direction is valid at intersections
    canTurnAtIntersection(direction) {
        // If we're near a junction, be more forgiving about turns
        if (this.isNearJunction(3)) {
            // Check if there's a path in the requested direction
            const stepSize = this.moveSpeed * 6; // Even larger step for intersection detection
            let testX = this.player.x;
            let testY = this.player.y;

            switch (direction) {
                case 'up': testY -= stepSize; break;
                case 'down': testY += stepSize; break;
                case 'left': testX -= stepSize; break;
                case 'right': testX += stepSize; break;
            }

            // Check if the test position is on any path
            return this.isValidPosition(testX, testY);
        }

        // Fall back to normal direction checking
        return this.canMoveInDirection(direction);
    }

    // New method to check if player is at a path end
    isAtPathEnd(x, y) {
        const paths = this.getPathsAtPosition(x, y);
        if (paths.length === 0) return false;

        const tolerance = this.pathAlignmentTolerance;

        return paths.some(path => {
            if (path.type === 'horizontal') {
                return (Math.abs(x - path.xStart) <= tolerance) || (Math.abs(x - path.xEnd) <= tolerance);
            } else {
                return (Math.abs(y - path.yStart) <= tolerance) || (Math.abs(y - path.yEnd) <= tolerance);
            }
        });
    }

    // New method to check if player can turn at a path end
    canTurnAtPathEnd(direction) {
        const oppositeDirection = this.getOppositeDirection(this.currentDirection);

        // Only allow turning to the opposite direction at path ends
        if (direction !== oppositeDirection) {
            return false;
        }

        // Check if the opposite direction is valid
        const oppositeX = this.player.x + (oppositeDirection === 'left' ? -this.moveSpeed :
            oppositeDirection === 'right' ? this.moveSpeed : 0);
        const oppositeY = this.player.y + (oppositeDirection === 'up' ? -this.moveSpeed :
            oppositeDirection === 'down' ? this.moveSpeed : 0);

        return this.isValidMove(this.player.x, this.player.y, oppositeX, oppositeY);
    }
}

let game;

function startGame() {
    if (!game) { game = new MetroMazeGame(); }
    game.updatePlayerPosition();
}

// Door animation function
function animateDoors() {
    setTimeout(() => {
        // Check if door elements exist before trying to animate them
        const leftDoor = document.querySelector('.door.left');
        const rightDoor = document.querySelector('.door.right');
        const doorOverlay = document.querySelector('.door-overlay');
        const doorLight = document.querySelector('.door-light');
        const doorContainer = document.querySelector('.door-container');

        // Only animate if elements exist
        if (leftDoor && rightDoor) {
            leftDoor.style.transform = 'rotateY(-105deg)';
            rightDoor.style.transform = 'rotateY(105deg)';
        }

        if (doorOverlay) {
            doorOverlay.style.opacity = '0';
        }

        if (doorLight) {
            doorLight.style.opacity = '1';
        }

        // Remove the doors after animation if they exist
        setTimeout(() => {
            if (doorContainer && doorOverlay) {
                doorContainer.style.display = 'none';
                doorOverlay.style.display = 'none';
            }
            // Show tap-to-start overlay after doors close
            if (typeof showTapToStart === 'function') {
                showTapToStart();
            } else if (window.showTapToStart) {
                window.showTapToStart();
            }
        }, 1000);
    }, 1500); // Wait 1.5 seconds before starting animation
}

// Update setupRefreshButton to properly restart auto movement
function setupRefreshButton() {
    const refreshBtn = document.querySelector('.refresh-btn');
    if (refreshBtn) {
        // Remove existing listeners first
        refreshBtn.replaceWith(refreshBtn.cloneNode(true));
        const freshBtn = document.querySelector('.refresh-btn');

        // iPhone-compatible refresh function
        const handleRefresh = (event) => {
            // Prevent default to avoid any browser interference
            event.preventDefault();
            event.stopPropagation();



            // CRITICAL: Complete cleanup sequence
            if (typeof clearAllTimers === 'function') {
                clearAllTimers();
            }

            if (window.game) {
                window.game.reset();
            } else {
                window.game = new MetroMazeGame();
            }

            // FIXED: Call the function directly
            if (typeof showTapToStart === 'function') {
                showTapToStart();
            }
        };

        // Add multiple event listeners for better iPhone compatibility
        freshBtn.addEventListener('click', handleRefresh, { passive: false });
        freshBtn.addEventListener('touchstart', handleRefresh, { passive: false });

        // Add visual feedback for touch devices
        freshBtn.addEventListener('touchstart', () => {
            freshBtn.style.transform = 'translateY(-50%) scale(0.95)';
        }, { passive: true });

        freshBtn.addEventListener('touchend', () => {
            freshBtn.style.transform = 'translateY(-50%) scale(1)';
        }, { passive: true });

        freshBtn.addEventListener('touchcancel', () => {
            freshBtn.style.transform = 'translateY(-50%) scale(1)';
        }, { passive: true });
    }
}

// Example:
const coin = { x: 30, y: 12 };

function clearAllTimers() {
    // Clear the main game timer
    if (window.game && window.game.gameTimer) {
        clearInterval(window.game.gameTimer);
        window.game.gameTimer = null;
    }

    // Clear any movement intervals
    if (window.game && window.game.moveInterval) {
        clearInterval(window.game.moveInterval);
        window.game.moveInterval = null;
    }

    // Clear any auto-move intervals
    if (window.game && window.game.autoMoveInterval) {
        clearInterval(window.game.autoMoveInterval);
        window.game.autoMoveInterval = null;
    }

    // Clear coin check interval
    if (window.game && window.game.coinCheckInterval) {
        clearInterval(window.game.coinCheckInterval);
        window.game.coinCheckInterval = null;
    }

    // Clear ALL intervals in the page (nuclear option)
    const highestIntervalId = setInterval(() => { }, 0);
    for (let i = 1; i <= highestIntervalId; i++) {
        clearInterval(i);
    }
    clearInterval(highestIntervalId);

    // Clear ALL timeouts as well
    const highestTimeoutId = setTimeout(() => { }, 0);
    for (let i = 1; i <= highestTimeoutId; i++) {
        clearTimeout(i);
    }
    clearTimeout(highestTimeoutId);


}

// Make clearAllTimers globally accessible
window.clearAllTimers = clearAllTimers;

// Make MetroMazeGame globally accessible
window.MetroMazeGame = MetroMazeGame;

// Make other functions globally accessible
window.startGame = startGame;
window.animateDoors = animateDoors;
window.setupRefreshButton = setupRefreshButton;
window.setupPlayAgainButton = setupPlayAgainButton;


// Global functions for popup actions
window.closeRewardPopup = function () {
    document.getElementById('rewardPopup').style.display = 'none';
    // Optionally resume the game if needed
};
window.copyRewardCoupon = function () {
    const coupon = document.getElementById('rewardCoupon').textContent;
    if (coupon && coupon.trim() !== '') {
        navigator.clipboard.writeText(coupon).then(() => {
            // Show success feedback
            const copyBtn = document.querySelector('.reward-copy-btn');
            if (copyBtn) {
                const originalContent = copyBtn.innerHTML;
                copyBtn.innerHTML = '<span style="color: green;">✓</span>';
                setTimeout(() => {
                    copyBtn.innerHTML = originalContent;
                }, 2000);
            }
        }).catch(err => {
            console.error('Failed to copy coupon:', err);
            alert('Failed to copy coupon code. Please copy manually.');
        });
    } else {
        alert('No coupon code available to copy.');
    }
};

// Enhanced Play Again Button
function setupPlayAgainButton() {
    const playAgainBtn = document.getElementById('play-again-btn');
    if (playAgainBtn) {
        // Remove existing listeners first to prevent duplicates
        const newBtn = playAgainBtn.cloneNode(true);
        playAgainBtn.parentNode.replaceChild(newBtn, playAgainBtn);

        newBtn.addEventListener('click', () => {


            // CRITICAL: Complete cleanup sequence
            if (typeof clearAllTimers === 'function') {
                clearAllTimers();
            }

            // Hide all game over screens
            const tryAgain = document.getElementById('try-again');
            const gameOver = document.getElementById('gameOver');
            const rewardPopup = document.getElementById('rewardPopup');
            const rewardSection = document.getElementById('reward-section');

            if (tryAgain) tryAgain.style.display = 'none';
            if (gameOver) gameOver.style.display = 'none';
            if (rewardPopup) rewardPopup.style.display = 'none';
            if (rewardSection) rewardSection.style.display = 'none';
            document.body.style.overflow = 'auto';

            // Show game screen elements
            const gameScreen = document.getElementById('game-screen');
            if (gameScreen) gameScreen.style.display = 'block';

            // Reset the game completely
            if (window.game) {
                window.game.reset();
            } else {
                window.game = new MetroMazeGame();
            }

            // Show tap-to-start for clean restart
            if (typeof showTapToStart === 'function') {
                showTapToStart();
            } else if (window.showTapToStart) {
                window.showTapToStart();
            }
        });
    }
}
