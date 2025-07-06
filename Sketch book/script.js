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
        
        // Fill with white background
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    bindEvents() {
        // Tool selection
        document.querySelectorAll('.tool-item').forEach(tool => {
            tool.addEventListener('click', (e) => {
                document.querySelectorAll('.tool-item').forEach(t => t.classList.remove('active'));
                tool.classList.add('active');
                this.currentTool = tool.dataset.tool;
                this.updateCursor();
                this.updateStatus(`${tool.dataset.tool} tool selected`);
            });
        });

        // Feature toggles
        document.querySelectorAll('.feature-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const feature = toggle.dataset.feature;
                const toggleSwitch = toggle.querySelector('.toggle-switch');
                
                this.features[feature] = !this.features[feature];
                toggleSwitch.classList.toggle('active', this.features[feature]);
                
                this.updateStatus(`${feature} ${this.features[feature] ? 'enabled' : 'disabled'}`);
            });
        });

        // Color picker
        document.getElementById('colorPicker').addEventListener('change', (e) => {
            this.currentColor = e.target.value;
            this.updateActiveColor();
        });
        // Preset colors
        document.querySelectorAll('.preset-color').forEach(color => {
            color.addEventListener('click', (e) => {
                document.querySelectorAll('.preset-color').forEach(c => c.classList.remove('active'));
                color.classList.add('active');
                this.currentColor = color.dataset.color;
                document.getElementById('colorPicker').value = this.currentColor;
            });
        });

        // Sliders
        this.bindSlider('sizeSlider', 'sizeValue', (value) => {
            this.currentSize = parseInt(value);
        });

        this.bindSlider('opacitySlider', 'opacityValue', (value) => {
            this.currentOpacity = parseInt(value);
        });

        this.bindSlider('smoothingSlider', 'smoothingValue', (value) => {
            this.currentSmoothing = parseInt(value);
        });

        // Canvas events
        this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
        this.canvas.addEventListener('mousemove', this.draw.bind(this));
        this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
        this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));

        // Touch events
        this.canvas.addEventListener('touchstart', this.handleTouch.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouch.bind(this));
        this.canvas.addEventListener('touchend', this.stopDrawing.bind(this));

        // Control buttons
        document.getElementById('undoBtn').addEventListener('click', this.undo.bind(this));
        document.getElementById('redoBtn').addEventListener('click', this.redo.bind(this));
        document.getElementById('clearBtn').addEventListener('click', this.clearCanvas.bind(this));
        document.getElementById('saveBtn').addEventListener('click', this.saveImage.bind(this));
        document.getElementById('exportBtn').addEventListener('click', this.exportImage.bind(this));
        document.getElementById('newCanvas').addEventListener('click', this.newCanvas.bind(this));

        // Sidebar toggle
        document.getElementById('toggleSidebar').addEventListener('click', this.toggleSidebar.bind(this));
                
        // Zoom controls
        document.getElementById('zoomIn').addEventListener('click', () => this.zoom(1.2));
        document.getElementById('zoomOut').addEventListener('click', () => this.zoom(0.8));
        document.getElementById('fitToScreen').addEventListener('click', this.fitToScreen.bind(this));
    }

    bindSlider(sliderId, valueId, callback) {
        const slider = document.getElementById(sliderId);
        const valueDisplay = document.getElementById(valueId);
        
        slider.addEventListener('input', (e) => {
            const value = e.target.value;
            valueDisplay.textContent = value + (sliderId === 'opacitySlider' ? '%' : '');
            callback(value);
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
        document.getElementById('statusText').textContent = message;
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
        
        const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 'mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
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
                this.drawLine(pos);
                break;
            case 'rectangle':
                this.drawRectangle(pos);
                break;
            case 'circle':
                this.drawCircle(pos);
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

    drawLine(pos) {
        this.redrawCanvas();
        
        let endX = pos.x;
        let endY = pos.y;
        
        if (this.features.magneticLine) {
            const angle = Math.atan2(pos.y - this.startY, pos.x - this.startX);
            const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
            const distance = Math.sqrt(Math.pow(pos.x - this.startX, 2) + Math.pow(pos.y - this.startY, 2));
            
            endX = this.startX + Math.cos(snapAngle) * distance;
            endY = this.startY + Math.sin(snapAngle) * distance;
        }
        
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.beginPath();
        this.ctx.moveTo(this.startX, this.startY);
        this.ctx.lineTo(endX, endY);
        this.ctx.stroke();
    }

    drawRectangle(pos) {
        this.redrawCanvas();
        
        let width = pos.x - this.startX;
        let height = pos.y - this.startY;
        
        if (this.features.shapeAssist) {
            // Make perfect square if shift is held or feature is enabled
            const size = Math.min(Math.abs(width), Math.abs(height));
            width = width < 0 ? -size : size;
            height = height < 0 ? -size : size;
        }
        
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.strokeRect(this.startX, this.startY, width, height);
    }

    drawCircle(pos) {
        this.redrawCanvas();
        
        const radius = Math.sqrt(Math.pow(pos.x - this.startX, 2) + Math.pow(pos.y - this.startY, 2));
        
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.beginPath();
        this.ctx.arc(this.startX, this.startY, radius, 0, 2 * Math.PI);
        this.ctx.stroke();
    }

    drawSpray(pos) {
        this.ctx.globalCompositeOperation = 'source-over';
        
        const density = this.currentSize;
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
        // Simple flood fill implementation
        const targetColor = this.getPixelColor(x, y);
        const fillColor = this.hexToRgb(this.currentColor);
        
        if (this.colorsEqual(targetColor, fillColor)) return;
        
        this.showAutoIndicator();
        
        setTimeout(() => {
            this.floodFillRecursive(Math.floor(x), Math.floor(y), targetColor, fillColor);
            this.hideAutoIndicator();
        }, 100);
    }

    floodFillRecursive(x, y, targetColor, fillColor) {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        const stack = [{x, y}];
        
        while (stack.length > 0) {
            const {x: currentX, y: currentY} = stack.pop();
            
            if (currentX < 0 || currentX >= this.canvas.width || 
                currentY < 0 || currentY >= this.canvas.height) continue;
            
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
        





