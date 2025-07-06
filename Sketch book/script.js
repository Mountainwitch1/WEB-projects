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





