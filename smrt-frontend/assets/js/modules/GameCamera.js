export class GameCamera {
    constructor(player, gameBoard, settings) {
        this.player = player;
        this.gameBoard = gameBoard;

        // Configurable settings
        this.viewportWidth = settings.viewportWidth || 200;
        this.viewportHeight = settings.viewportHeight || 350;
        this.boardWidth = settings.boardWidth || 320;
        this.boardHeight = settings.boardHeight || 525;

        this.topBias = settings.topBias || 0.25;
        this.topThreshold = settings.topThreshold || 150;
        this.topYOffset = settings.topYOffset || 50;
        this.rightOffset = settings.rightOffset || 16;
        this.bottomOffset = settings.bottomOffset || 5;
        this.browserUIHeight = settings.browserUIHeight || 80;

        this.isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.mobileTopOffset = this.isMobile ? 0 : this.topYOffset;
        this.mobileTopThreshold = this.isMobile ? 50 : this.topThreshold;

        this.smoothCamera = null;
        this.lastTransformX = null;
        this.lastTransformY = null;
    }

    updateSettings(newSettings) {
        // Update camera settings dynamically
        this.viewportWidth = newSettings.viewportWidth || this.viewportWidth;
        this.viewportHeight = newSettings.viewportHeight || this.viewportHeight;
        this.boardWidth = newSettings.boardWidth || this.boardWidth;
        this.boardHeight = newSettings.boardHeight || this.boardHeight;
        this.topBias = newSettings.topBias || this.topBias;
        this.topThreshold = newSettings.topThreshold || this.topThreshold;
        this.topYOffset = newSettings.topYOffset || this.topYOffset;
        this.rightOffset = newSettings.rightOffset || this.rightOffset;
        this.bottomOffset = newSettings.bottomOffset || this.bottomOffset;
        this.browserUIHeight = newSettings.browserUIHeight || this.browserUIHeight;
        
        // Update mobile-specific settings
        this.mobileTopOffset = this.isMobile ? 0 : this.topYOffset;
        this.mobileTopThreshold = this.isMobile ? 50 : this.topThreshold;
        
        // Reset smooth camera for new settings
        this.smoothCamera = null;
    }

    initializeCamera() {
        const effectiveViewportHeight = this.viewportHeight - this.browserUIHeight;
        const playerX = Math.round(this.player.x || 0);
        const playerY = Math.round(this.player.y || 0);

        const offsetX = playerX - (this.viewportWidth / 2);
        const offsetY = playerY - (effectiveViewportHeight * this.topBias);

        const clampedX = Math.max(0, Math.min(offsetX, this.boardWidth - this.viewportWidth - this.rightOffset));

        const maxCameraY = this.boardHeight - effectiveViewportHeight;
        const bottomThreshold = this.boardHeight - effectiveViewportHeight - (this.bottomOffset * 2);

        const clampedY = Math.max(
            effectiveViewportHeight * this.topBias,
            Math.min(offsetY, playerY > bottomThreshold ? maxCameraY : maxCameraY - this.bottomOffset)
        );

        let targetX, targetY;
        // Simplified logic: always position player closer to top
        targetX = -clampedX;
        targetY = -clampedY + (effectiveViewportHeight * 0.1); // Add small offset to keep player visible

        this.smoothCamera = {
            currentX: targetX,
            currentY: targetY,
            targetX,
            targetY,
            initialized: true,
            frameCount: 0
        };
    }

    updateCameraPosition() {
        if (!this.smoothCamera) this.initializeCamera();

        const effectiveViewportHeight = this.viewportHeight - this.browserUIHeight;

        const playerX = Math.round(this.player.x || 0);
        const playerY = Math.round(this.player.y || 0);

        const offsetX = playerX - (this.viewportWidth / 2);
        const offsetY = playerY - (effectiveViewportHeight * this.topBias);

        const clampedX = Math.max(0, Math.min(offsetX, this.boardWidth - this.viewportWidth - this.rightOffset));
        const maxCameraY = this.boardHeight - effectiveViewportHeight;
        const bottomThreshold = this.boardHeight - effectiveViewportHeight - (this.bottomOffset * 2);

        const clampedY = Math.max(
            effectiveViewportHeight * this.topBias,
            Math.min(offsetY, playerY > bottomThreshold ? maxCameraY : maxCameraY - this.bottomOffset)
        );

        // Calculate target camera position
        let targetX, targetY;
        // Simplified logic: always position player closer to top
        targetX = -clampedX;
        targetY = -clampedY + (effectiveViewportHeight * 0.1); // Add small offset to keep player visible

        this.smoothCamera.targetX = targetX;
        this.smoothCamera.targetY = targetY;
        this.smoothCamera.frameCount++;

        // Adaptive smoothing
        const baseFactor = 0.15;
        const startupFrames = 10;
        const factor = this.smoothCamera.frameCount <= startupFrames
            ? baseFactor * (this.smoothCamera.frameCount / startupFrames) * 0.5
            : baseFactor;

        this.smoothCamera.currentX += (targetX - this.smoothCamera.currentX) * factor;
        this.smoothCamera.currentY += (targetY - this.smoothCamera.currentY) * factor;

        const transformX = Math.round(this.smoothCamera.currentX);
        const transformY = Math.round(this.smoothCamera.currentY);

        // Optional: only update DOM if changed
        if (transformX !== this.lastTransformX || transformY !== this.lastTransformY) {
            this.gameBoard.style.transform = `translate3d(${transformX}px, ${transformY}px, 0px)`;
            this.lastTransformX = transformX;
            this.lastTransformY = transformY;
        }
    }
}
