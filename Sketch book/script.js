class AdvancedDrawingApp {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.isDrawing = false;
        this.currentTool = 'brush';
        this.currentColor = '#000000';
        this.currentSize = 5;
        this.currentOpacity = 100;
        this.currentSmoothing = 50;
        this.history = [];
        this.historyStep = -1;
        this.strokeCount = 0;
        this.zoomLevel = 1;
        
        // Auto features
        this.features = {
            smoothing: true,
            shapeAssist: true,
            symmetry: false,
            magneticLine: false
        };
        
        // Drawing state
        this.startX = 0;
        this.startY = 0;
        this.lastX = 0;
        this.lastY = 0;
        this.smoothPoints = [];
        this.tempCanvas = document.createElement('canvas');
        this.tempCtx = this.tempCanvas.getContext('2d');
        this.previewCanvas = document.createElement('canvas');
        this.previewCtx = this.previewCanvas.getContext('2d');
        
        this.initializeCanvas();
        this.bindEvents();
        this.saveState();
        this.updateStatus('Ready to draw');
    }

    initializeCanvas() {
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';

        // Set temp canvas size
        this.tempCanvas.width = this.canvas.width;
        this.tempCanvas.height = this.canvas.height;
        this.previewCanvas.width = this.canvas.width;
        this.previewCanvas.height = this.canvas.height;
        
        // Fill with white background
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Copy to temp canvas
        this.tempCtx.drawImage(this.canvas, 0, 0);
    }

    bindEvents() {
        // Tool selection
        document.querySelectorAll('.tool-item').forEach(tool => {
            tool.addEventListener('click', (e) => {
                document.querySelectorAll('.tool-item').forEach(t => t.classList.remove('active'));
                tool.classList.add('active');
                this.currentTool = tool.dataset.tool;
                this.updateCursor();
                this.updateStatus(`${this.currentTool} tool selected`);
            });
        });

        // Feature toggles
        document.querySelectorAll('.toggle-switch').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const feature = toggle.dataset.toggle;
                this.features[feature] = !this.features[feature];
                toggle.classList.toggle('active', this.features[feature]);
                this.updateStatus(`${feature} ${this.features[feature] ? 'enabled' : 'disabled'}`);
            });
        });

        // Color picker
        const colorPicker = document.getElementById('colorPicker');
        if (colorPicker) {
            colorPicker.addEventListener('change', (e) => {
                this.currentColor = e.target.value;
                this.updateActiveColor();
            });
        }

        // Preset colors
        document.querySelectorAll('.preset-color').forEach(color => {
            color.addEventListener('click', (e) => {
                document.querySelectorAll('.preset-color').forEach(c => c.classList.remove('active'));
                color.classList.add('active');
                this.currentColor = color.dataset.color;
                if (colorPicker) {
                    colorPicker.value = this.currentColor;
                }
                this.updateStatus(`Color changed to ${this.currentColor}`);
            });
        });

        // Sliders
        this.bindSlider('sizeSlider', 'sizeValue', (value) => {
            this.currentSize = parseInt(value);
        });

        this.bindSlider('opacitySlider', 'opacityValue', (value) => {
            this.currentOpacity = parseInt(value);
        }, '%');

        this.bindSlider('smoothingSlider', 'smoothingValue', (value) => {
            this.currentSmoothing = parseInt(value);
        });

        // Canvas events
        this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
        this.canvas.addEventListener('mousemove', this.draw.bind(this));
        this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
        this.canvas.addEventListener('mouseleave', this.stopDrawing.bind(this));

        // Touch events
        this.canvas.addEventListener('touchstart', this.handleTouch.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouch.bind(this));
        this.canvas.addEventListener('touchend', this.stopDrawing.bind(this));

        // Control buttons
        this.bindButton('undoBtn', this.undo.bind(this));
        this.bindButton('redoBtn', this.redo.bind(this));
        this.bindButton('clearBtn', this.clearCanvas.bind(this));
        this.bindButton('saveBtn', this.saveImage.bind(this));
        this.bindButton('exportBtn', this.exportImage.bind(this));
        this.bindButton('newCanvas', this.newCanvas.bind(this));
        this.bindButton('toggleSidebar', this.toggleSidebar.bind(this));
        this.bindButton('zoomIn', () => this.zoom(1.2));
        this.bindButton('zoomOut', () => this.zoom(0.8));
        this.bindButton('fitToScreen', this.fitToScreen.bind(this));

        // Keyboard shortcuts
        this.bindKeyboardShortcuts();
    }

    bindButton(id, handler) {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('click', handler);
        }
    }

    bindSlider(sliderId, valueId, callback, suffix = '') {
        const slider = document.getElementById(sliderId);
        const valueDisplay = document.getElementById(valueId);
        
        if (slider && valueDisplay) {
            slider.addEventListener('input', (e) => {
                const value = e.target.value;
                valueDisplay.textContent = value + suffix;
                callback(value);
            });
        }
    }

    bindKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'z':
                        e.preventDefault();
                        if (e.shiftKey) {
                            this.redo();
                        } else {
                            this.undo();
                        }
                        break;
                    case 's':
                        e.preventDefault();
                        this.saveImage();
                        break;
                    case 'n':
                        e.preventDefault();
                        this.newCanvas();
                        break;
                }
            }
        });
    }

    updateCursor() {
        const cursors = {
            brush: 'crosshair',
            pencil: 'crosshair',
            eraser: 'grab',
            line: 'crosshair',
            rectangle: 'crosshair',
            circle: 'crosshair',
            spray: 'crosshair',
            fill: 'pointer'
        };
        this.canvas.style.cursor = cursors[this.currentTool] || 'crosshair';
    }

    updateStatus(message) {
        const statusText = document.getElementById('statusText');
        if (statusText) {
            statusText.textContent = message;
        }
    }

    updateActiveColor() {
        document.querySelectorAll('.preset-color').forEach(color => {
            color.classList.toggle('active', color.dataset.color === this.currentColor);
        });
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    handleTouch(e) {
        e.preventDefault();
        const touch = e.touches[0];
        if (!touch) return;
        
        const mouseEvent = new MouseEvent(
            e.type === 'touchstart' ? 'mousedown' : 'mousemove',
            {
                clientX: touch.clientX,
                clientY: touch.clientY
            }
        );
        this.canvas.dispatchEvent(mouseEvent);
    }

    startDrawing(e) {
        this.isDrawing = true;
        const pos = this.getMousePos(e);
        this.startX = pos.x;
        this.startY = pos.y;
        this.lastX = pos.x;
        this.lastY = pos.y;
        
        this.smoothPoints = [{x: pos.x, y: pos.y}];

        // Set drawing properties
        this.ctx.globalAlpha = this.currentOpacity / 100;
        this.ctx.lineWidth = this.currentSize;
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.fillStyle = this.currentColor;

        // Save current state for shape tools
        this.tempCtx.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);
        this.tempCtx.drawImage(this.canvas, 0, 0);

        if (this.currentTool === 'brush' || this.currentTool === 'pencil') {
            this.ctx.beginPath();
            this.ctx.moveTo(pos.x, pos.y);
        } else if (this.currentTool === 'eraser') {
            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.beginPath();
            this.ctx.moveTo(pos.x, pos.y);
        } else if (this.currentTool === 'fill') {
            this.floodFill(pos.x, pos.y);
        }

        this.updateStatus('Drawing...');
    }

    draw(e) {
        if (!this.isDrawing) return;

        const pos = this.getMousePos(e);
        
        switch (this.currentTool) {
            case 'brush':
                this.drawBrush(pos);
                break;
            case 'pencil':
                this.drawPencil(pos);
                break;
            case 'eraser':
                this.drawEraser(pos);
                break;
            case 'line':
                this.drawLinePreview(pos);
                break;
            case 'rectangle':
                this.drawRectanglePreview(pos);
                break;
            case 'circle':
                this.drawCirclePreview(pos);
                break;
            case 'spray':
                this.drawSpray(pos);
                break;
        }
    }

    drawBrush(pos) {
        this.ctx.globalCompositeOperation = 'source-over';
        
        if (this.features.smoothing && this.currentSmoothing > 0) {
            this.smoothPoints.push({x: pos.x, y: pos.y});
            
            if (this.smoothPoints.length > 3) {
                const smoothed = this.smoothStroke(this.smoothPoints);
                this.ctx.quadraticCurveTo(
                    smoothed.x1, smoothed.y1,
                    smoothed.x2, smoothed.y2
                );
                this.ctx.stroke();
                this.smoothPoints = this.smoothPoints.slice(-2);
            }
        } else {
            this.ctx.lineTo(pos.x, pos.y);
            this.ctx.stroke();
        }

        if (this.features.symmetry) {
            this.drawSymmetry(pos);
        }
    }

    drawPencil(pos) {
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.lineWidth = Math.max(1, this.currentSize * 0.5);
        this.ctx.lineTo(pos.x, pos.y);
        this.ctx.stroke();
    }

    drawEraser(pos) {
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.lineTo(pos.x, pos.y);
        this.ctx.stroke();
    }

    drawLinePreview(pos) {
        // Clear canvas and redraw from temp
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.tempCanvas, 0, 0);
        
        let endX = pos.x;
        let endY = pos.y;
        
        if (this.features.magneticLine) {
            const angle = Math.atan2(pos.y - this.startY, pos.x - this.startX);
            const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
            const distance = Math.sqrt(
                Math.pow(pos.x - this.startX, 2) + Math.pow(pos.y - this.startY, 2)
            );
            
            endX = this.startX + Math.cos(snapAngle) * distance;
            endY = this.startY + Math.sin(snapAngle) * distance;
        }
        
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.globalAlpha = this.currentOpacity / 100;
        this.ctx.lineWidth = this.currentSize;
        this.ctx.strokeStyle = this.currentColor;
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.startX, this.startY);
        this.ctx.lineTo(endX, endY);
        this.ctx.stroke();
    }

    drawRectanglePreview(pos) {
        // Clear canvas and redraw from temp
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.tempCanvas, 0, 0);
        
        let width = pos.x - this.startX;
        let height = pos.y - this.startY;
        
        if (this.features.shapeAssist) {
            // Make perfect square
            const size = Math.min(Math.abs(width), Math.abs(height));
            width = width < 0 ? -size : size;
            height = height < 0 ? -size : size;
        }
        
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.globalAlpha = this.currentOpacity / 100;
        this.ctx.lineWidth = this.currentSize;
        this.ctx.strokeStyle = this.currentColor;
        
        this.ctx.strokeRect(this.startX, this.startY, width, height);
    }

    drawCirclePreview(pos) {
        // Clear canvas and redraw from temp
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.tempCanvas, 0, 0);
        
        const radius = Math.sqrt(
            Math.pow(pos.x - this.startX, 2) + Math.pow(pos.y - this.startY, 2)
        );
        
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.globalAlpha = this.currentOpacity / 100;
        this.ctx.lineWidth = this.currentSize;
        this.ctx.strokeStyle = this.currentColor;
        
        this.ctx.beginPath();
        this.ctx.arc(this.startX, this.startY, radius, 0, 2 * Math.PI);
        this.ctx.stroke();
    }

    drawSpray(pos) {
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.globalAlpha = this.currentOpacity / 100;
        this.ctx.fillStyle = this.currentColor;
        
        const density = Math.max(5, this.currentSize);
        const radius = this.currentSize * 2;
        
        for (let i = 0; i < density; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * radius;
            const x = pos.x + Math.cos(angle) * distance;
            const y = pos.y + Math.sin(angle) * distance;
            
            this.ctx.fillRect(x, y, 1, 1);
        }
    }

    drawSymmetry(pos) {
        const centerX = this.canvas.width / 2;
        const mirrorX = centerX + (centerX - pos.x);
        
        this.ctx.lineTo(mirrorX, pos.y);
        this.ctx.stroke();
    }

    smoothStroke(points) {
        const factor = this.currentSmoothing / 100;
        const len = points.length;
        
        if (len < 3) return points[len - 1];
        
        const p1 = points[len - 3];
        const p2 = points[len - 2];
        const p3 = points[len - 1];
        
        return {
            x1: p1.x + (p2.x - p1.x) * factor,
            y1: p1.y + (p2.y - p1.y) * factor,
            x2: p2.x + (p3.x - p2.x) * factor,
            y2: p2.y + (p3.y - p2.y) * factor
        };
    }

    floodFill(x, y) {
        const targetColor = this.getPixelColor(Math.floor(x), Math.floor(y));
        const fillColor = this.hexToRgb(this.currentColor);
        
        if (this.colorsEqual(targetColor, fillColor)) return;
        
        this.showAutoIndicator();
        
        setTimeout(() => {
            this.floodFillStack(Math.floor(x), Math.floor(y), targetColor, fillColor);
            this.hideAutoIndicator();
        }, 100);
    }

    floodFillStack(x, y, targetColor, fillColor) {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        const stack = [{x, y}];
        const visited = new Set();
        
        while (stack.length > 0) {
            const {x: currentX, y: currentY} = stack.pop();
            
            if (currentX < 0 || currentX >= this.canvas.width || 
                currentY < 0 || currentY >= this.canvas.height) continue;
            
            const key = `${currentX},${currentY}`;
            if (visited.has(key)) continue;
            visited.add(key);
            
            const index = (currentY * this.canvas.width + currentX) * 4;
            const currentColor = {
                r: data[index],
                g: data[index + 1],
                b: data[index + 2],
                a: data[index + 3]
            };
            
            if (!this.colorsEqual(currentColor, targetColor)) continue;
            
            data[index] = fillColor.r;
            data[index + 1] = fillColor.g;
            data[index + 2] = fillColor.b;
            data[index + 3] = 255;
            
            stack.push({x: currentX + 1, y: currentY});
            stack.push({x: currentX - 1, y: currentY});
            stack.push({x: currentX, y: currentY + 1});
            stack.push({x: currentX, y: currentY - 1});
        }
        
        this.ctx.putImageData(imageData, 0, 0);
    }

    getPixelColor(x, y) {
        const imageData = this.ctx.getImageData(x, y, 1, 1);
        const data = imageData.data;
        return {
            r: data[0],
            g: data[1],
            b: data[2],
            a: data[3]
        };
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    colorsEqual(color1, color2) {
        return color1.r === color2.r && 
               color1.g === color2.g && 
               color1.b === color2.b;
    }

    showAutoIndicator() {
        const indicator = document.getElementById('autoIndicator');
        if (indicator) {
            indicator.classList.add('show');
        }
    }

    hideAutoIndicator() {
        const indicator = document.getElementById('autoIndicator');
        if (indicator) {
            indicator.classList.remove('show');
        }
    }

    stopDrawing() {
        if (this.isDrawing) {
            this.isDrawing = false;
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.globalAlpha = 1;
            this.ctx.beginPath();
            this.strokeCount++;
            this.updateStrokeCount();
            this.saveState();
            this.updateStatus('Ready to draw');
        }
    }

    saveState() {
        this.historyStep++;
        if (this.historyStep < this.history.length) {
            this.history.length = this.historyStep;
        }
        this.history.push(this.canvas.toDataURL());
        
        // Limit history to 20 steps to prevent memory issues
        if (this.history.length > 20) {
            this.history.shift();
            this.historyStep--;
        }
    }

    undo() {
        if (this.historyStep > 0) {
            this.historyStep--;
            this.restoreState();
            this.updateStatus('Undo');
        }
    }

    redo() {
        if (this.historyStep < this.history.length - 1) {
            this.historyStep++;
            this.restoreState();
            this.updateStatus('Redo');
        }
    }

    restoreState() {
        const img = new Image();
        img.onload = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(img, 0, 0);
        };
        img.src = this.history[this.historyStep];
    }

    clearCanvas() {
        if (confirm('Clear the canvas? This cannot be undone.')) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.strokeCount = 0;
            this.updateStrokeCount();
            this.saveState();
            this.updateStatus('Canvas cleared');
        }
    }

    newCanvas() {
        if (confirm('Create a new canvas? This will clear your current work.')) {
            this.clearCanvas();
            this.updateStatus('New canvas created');
        }
    }

    saveImage() {
        const link = document.createElement('a');
        link.download = 'drawing-' + new Date().getTime() + '.png';
        link.href = this.canvas.toDataURL();
        link.click();
        this.updateStatus('Image saved');
    }

    exportImage() {
        const link = document.createElement('a');
        link.download = 'artwork-' + new Date().getTime() + '.png';
        link.href = this.canvas.toDataURL('image/png', 1.0);
        link.click();
        this.updateStatus('Image exported');
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.toggle('collapsed');
        }
    }

    zoom(factor) {
        this.zoomLevel *= factor;
        this.zoomLevel = Math.max(0.1, Math.min(5, this.zoomLevel));
        this.canvas.style.transform = `scale(${this.zoomLevel})`;
        
        const zoomLevelElement = document.getElementById('zoomLevel');
        if (zoomLevelElement) {
            zoomLevelElement.textContent = Math.round(this.zoomLevel * 100) + '%';
        }
        
        this.updateStatus(`Zoom: ${Math.round(this.zoomLevel * 100)}%`);
    }

    fitToScreen() {
        const container = document.querySelector('.canvas-area');
        if (!container) return;
        
        const containerRect = container.getBoundingClientRect();
        const scaleX = (containerRect.width - 80) / this.canvas.width;
        const scaleY = (containerRect.height - 80) / this.canvas.height;
        
        this.zoomLevel = Math.min(scaleX, scaleY, 1);
        this.canvas.style.transform = `scale(${this.zoomLevel})`;
        
        const zoomLevelElement = document.getElementById('zoomLevel');
        if (zoomLevelElement) {
            zoomLevelElement.textContent = Math.round(this.zoomLevel * 100) + '%';
        }
        
        this.updateStatus('Fit to screen');
    }

    updateStrokeCount() {
        const strokeCountElement = document.getElementById('strokeCount');
        if (strokeCountElement) {
            strokeCountElement.textContent = `${this.strokeCount} strokes`;
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new AdvancedDrawingApp();
    
    // Add window resize handler
    window.addEventListener('resize', () => {
        app.fitToScreen();
    });
    
    // Make app globally accessible for debugging
    window.drawingApp = app;
});

// Add responsive behavior for mobile
window.addEventListener('resize', () => {
    if (window.drawingApp) {
        window.drawingApp.fitToScreen();
    }
});