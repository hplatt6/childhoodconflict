(function() {
    function initCanvas() {
        const canvas = document.getElementById('drawingCanvas');
        if (!canvas) {
            console.error("Canvas element not found!");
            return;
        }

        let uniqueId = null;
        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'setUniqueId') {
                console.log("Received uniqueId from parent:", event.data.uniqueId);
                uniqueId = event.data.uniqueId;
            }
        }, false);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error("Canvas context not available!");
            return;
        }

        ctx.imageSmoothingEnabled = true;

        let isDrawing = false;
        let brushColor = '#000000';
        let brushSize = 5;

        function setCanvasSize() {
            const container = document.getElementById('canvasContainer');
            const displayWidth = container.offsetWidth;
            const displayHeight = displayWidth * 3 / 5;

            const resolutionMultiplier = 3;

            canvas.width = displayWidth * resolutionMultiplier;
            canvas.height = displayHeight * resolutionMultiplier;

            canvas.style.width = `${displayWidth}px`;
            canvas.style.height = `${displayHeight}px`;

            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(resolutionMultiplier, resolutionMultiplier);

            ctx.lineCap = "round";
            ctx.lineJoin = "round";
        }

        setCanvasSize();
        window.addEventListener('resize', setCanvasSize);

        function clearCanvas() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        function setBrushColor(color) {
            brushColor = color;
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
        }

        function setBrushSize(size) {
            brushSize = size;
            ctx.lineWidth = size;
        }

        setBrushColor(brushColor);
        setBrushSize(brushSize);

        function getMousePos(canvas, e) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            return {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY
            };
        }

        canvas.addEventListener('mousedown', function(e) {
            isDrawing = true;
            ctx.beginPath();
            const pos = getMousePos(canvas, e);
            ctx.moveTo(pos.x, pos.y);
            e.preventDefault();
        });

        canvas.addEventListener('mousemove', function(e) {
            if (isDrawing) {
                const pos = getMousePos(canvas, e);
                ctx.lineTo(pos.x, pos.y);
                ctx.stroke();
            }
        });

        canvas.addEventListener('mouseup', () => isDrawing = false);
        canvas.addEventListener('mouseout', () => isDrawing = false);

        function handleTouchStart(e) {
            e.preventDefault();
            isDrawing = true;
            ctx.beginPath();
            const rect = canvas.getBoundingClientRect();
            const touch = e.touches[0];
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            ctx.moveTo(
                (touch.clientX - rect.left) * scaleX,
                (touch.clientY - rect.top) * scaleY
            );
        }

        function handleTouchMove(e) {
            e.preventDefault();
            if (isDrawing) {
                const rect = canvas.getBoundingClientRect();
                const touch = e.touches[0];
                const scaleX = canvas.width / rect.width;
                const scaleY = canvas.height / rect.height;
                ctx.lineTo(
                    (touch.clientX - rect.left) * scaleX,
                    (touch.clientY - rect.top) * scaleY
                );
                ctx.stroke();
            }
        }

        function handleTouchEnd() {
            isDrawing = false;
        }

        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
        canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

        document.getElementById('colorPicker').addEventListener('input', function() {
            setBrushColor(this.value);
        });

        document.getElementById('colorButtons').addEventListener('click', function(e) {
            if (e.target.tagName === 'BUTTON') {
                setBrushColor(e.target.dataset.color);
            }
        });

        document.getElementById('brushSizeSlider').addEventListener('input', function() {
            setBrushSize(this.value);
        });

        document.getElementById('clearButton').addEventListener('click', function(e) {
            e.preventDefault();
            clearCanvas();
        });

        let qualtricsId = "unknown";
        if (typeof Qualtrics !== 'undefined' && typeof Qualtrics.SurveyEngine !== 'undefined') {
            qualtricsId = Qualtrics.SurveyEngine.getEmbeddedData('qualtricsID');
            console.log("Qualtrics ID: ", qualtricsId);
        }

        function sendBase64ToPipedream() {
            const myCanvas = document.getElementById('drawingCanvas');
            if (myCanvas) {
                const dataURL = myCanvas.toDataURL('image/png');
                const base64Data = dataURL.replace(/^data:image\/(png|jpeg);base64,/, '');
                const pipedreamEndpoint = 'https://eoei8lx0gt8zd0l.m.pipedream.net';

                console.log("Sending to Pipedream with uniqueId:", uniqueId);

                fetch(pipedreamEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        imageData: base64Data,
                        uniqueId: uniqueId || "missing-id"
                    })
                })
                .then(response => {
                    if (response.ok) {
                        console.log('Base64 data sent to Pipedream successfully!');
                        const msg = document.getElementById('saveMessage');
                        if (msg) {
                            msg.style.display = 'block';
                            msg.style.opacity = '1';
                            setTimeout(() => {
                                msg.style.opacity = '0';
                                setTimeout(() => {
                                    msg.style.display = 'none';
                                }, 500);
                            }, 2000);
                        }
                    } else {
                        console.error('Failed to send Base64 data to Pipedream.');
                    }
                })
                .catch(error => {
                    console.error('Error sending Base64 data to Pipedream:', error);
                });
            } else {
                console.error('Canvas element not found.');
            }
        }

        const saveButton = document.getElementById("saveButton");
        if (saveButton) {
            saveButton.addEventListener("click", sendBase64ToPipedream);
        } else {
            console.error("Save button not found");
        }

        function handleOrientationChange() {
            console.log("Orientation change detected");
            if (localStorage.getItem('canvasData')) {
                const savedData = JSON.parse(localStorage.getItem('canvasData'));
                const img = new Image();
                img.onload = function() {
                    setTimeout(() => {
                        setCanvasSize();
                        ctx.drawImage(img, 0, 0, savedData.width, savedData.height, 0, 0, canvas.width, canvas.height);
                    }, 100);
                };
                img.src = savedData.data;
            } else {
                setCanvasSize();
            }
        }

        window.addEventListener('orientationchange', function() {
            localStorage.setItem('canvasData', JSON.stringify({
                data: canvas.toDataURL(),
                width: canvas.width,
                height: canvas.height
            }));
            handleOrientationChange();
        });

        if (localStorage.getItem('canvasData')) {
            handleOrientationChange();
        }
    }

    initCanvas();
})();
