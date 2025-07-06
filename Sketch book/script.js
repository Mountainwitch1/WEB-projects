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
