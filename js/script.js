// Get references to DOM elements
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
const startCameraButton = document.getElementById('startCameraButton');
const takePictureButton = document.getElementById('takePictureButton');
const uploadButton = document.getElementById('uploadButton');
const fileInput = document.getElementById('fileInput');
const analyzeButton = document.getElementById('analyzeButton');
const resetButton = document.getElementById('resetButton');
const resultsDiv = document.getElementById('results');
const caloriesSpan = document.getElementById('calories');
const carbohydratesSpan = document.getElementById('carbohydrates');
const proteinsSpan = document.getElementById('proteins');
const loadingSpinner = document.getElementById('loadingSpinner');
const messageBox = document.getElementById('messageBox');

let stream = null; // To hold the camera stream
let imageData = null; // To hold the base64 image data

// --- Utility Functions ---

/**
 * Displays a temporary message box at the top of the screen.
 * @param {string} message - The message to display.
 * @param {'success' | 'error'} type - The type of message (determines color).
 */
function showMessage(message, type = 'error') {
    messageBox.textContent = message;
    const bgColor = type === 'error' ? 'bg-red-500' : 'bg-green-500';
    messageBox.className = `message-box show ${bgColor}`;
    setTimeout(() => {
        messageBox.className = 'message-box'; // Hide after 3 seconds
    }, 3000);
}

/**
 * Draws the initial "Click to begin" message on the canvas,
 * ensuring the canvas internal resolution matches its display size.
 */
function drawInitialCanvasMessage() {
    // Set canvas internal resolution to match its displayed size for responsiveness
    canvas.width = canvas.clientWidth;
    // Maintain a 4:3 aspect ratio for initial placeholder, but cap height if needed
    let calculatedHeight = canvas.width * (3 / 4);
    const maxAllowedHeight = window.innerHeight * 0.6; // Max 60% of viewport height
    if (calculatedHeight > maxAllowedHeight) {
        calculatedHeight = maxAllowedHeight;
        canvas.width = calculatedHeight * (4 / 3); // Adjust width to maintain aspect ratio
    }
    canvas.height = calculatedHeight;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#e2e8f0'; // Light gray background
    context.fillRect(0, 0, canvas.width, canvas.height);
    // Responsive font size: min 16px, scales with canvas width
    context.font = `${Math.max(16, canvas.width / 20)}px Inter`;
    context.fillStyle = '#64748b'; // Slate gray text
    context.textAlign = 'center';
    context.textBaseline = 'middle'; // Center text vertically
    context.fillText('Click "Start Camera" or "Upload Image" to begin.', canvas.width / 2, canvas.height / 2);
}

/**
 * Resizes the canvas and redraws its content (video frame or image)
 * to fit the current display size while maintaining aspect ratio.
 * @param {HTMLVideoElement|HTMLImageElement} source - The video or image element to draw.
 * @param {number} sourceWidth - The original width of the source.
 * @param {number} sourceHeight - The original height of the source.
 */
function resizeCanvasAndDraw(source, sourceWidth, sourceHeight) {
    const aspectRatio = sourceWidth / sourceHeight;

    // Calculate new canvas dimensions based on its current clientWidth
    let newWidth = canvas.clientWidth;
    let newHeight = newWidth / aspectRatio;

    // Adjust if the calculated height exceeds the available clientHeight (e.g., on small screens with limited vertical space)
    if (newHeight > canvas.clientHeight && canvas.clientHeight > 0) {
        newHeight = canvas.clientHeight;
        newWidth = newHeight * aspectRatio;
    }

    canvas.width = newWidth;
    canvas.height = newHeight;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
}


// --- Event Listeners ---

// Start Camera button click handler
startCameraButton.addEventListener('click', async () => {
    try {
        // Request access to the user's camera, preferring the rear camera if available
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = stream;
        video.play();

        // Once video metadata is loaded, set canvas dimensions and draw placeholder
        video.onloadedmetadata = () => {
            // Hide video element and show canvas once stream is ready
            video.classList.add('hidden');
            canvas.classList.remove('hidden');
            resizeCanvasAndDraw(video, video.videoWidth, video.videoHeight); // Initial draw of video frame
            context.font = `${Math.max(16, canvas.width / 20)}px Inter`;
            context.fillStyle = '#64748b';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText('Camera Ready! Take a picture.', canvas.width / 2, canvas.height / 2);
        };

        // Update button states
        takePictureButton.disabled = false;
        startCameraButton.disabled = true;
        uploadButton.disabled = true; // Disable upload when camera is active
        analyzeButton.disabled = true; // Disable analyze until picture is taken
        resetButton.disabled = false;
        showMessage('Camera started successfully!', 'success');

    } catch (err) {
        console.error('Error accessing camera:', err);
        showMessage('Error accessing camera. Please ensure camera permissions are granted.', 'error');
        // Re-enable start camera if it failed
        startCameraButton.disabled = false;
    }
});

// Take Picture button click handler
takePictureButton.addEventListener('click', () => {
    if (stream) {
        // Draw the current frame from the video onto the canvas
        resizeCanvasAndDraw(video, video.videoWidth, video.videoHeight);

        // Stop the video stream after taking a picture
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
        stream = null; // Clear stream reference

        // Get the image data as a Base64 string (JPEG with 90% quality for smaller size)
        imageData = canvas.toDataURL('image/jpeg', 0.9);

        // Update button states
        analyzeButton.disabled = false;
        takePictureButton.disabled = true;
        startCameraButton.disabled = false; // Allow starting camera again
        uploadButton.disabled = false; // Re-enable upload
        showMessage('Picture taken!', 'success');
    } else {
        showMessage('Please start the camera first.', 'error');
    }
});

// Upload Button click handler (triggers hidden file input)
uploadButton.addEventListener('click', () => {
    fileInput.click();
});

// File Input change handler (when a file is selected)
fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            showMessage('Please upload an image file.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Resize canvas and draw the uploaded image
                resizeCanvasAndDraw(img, img.width, img.height);
                imageData = e.target.result; // Store base64 image data

                // Update button states
                analyzeButton.disabled = false;
                startCameraButton.disabled = false; // Allow starting camera again
                takePictureButton.disabled = true; // Disable take picture if image uploaded
                uploadButton.disabled = true; // Disable upload until reset or new action
                resetButton.disabled = false; // Enable reset button after upload
                showMessage('Image uploaded successfully!', 'success');
            };
            img.src = e.target.result; // Set image source from FileReader result
        };
        reader.readAsDataURL(file); // Read file as Base64 data URL
    } else {
        showMessage('No file selected.', 'error');
    }
});

// Analyze Food button click handler
analyzeButton.addEventListener('click', async () => {
    if (!imageData) {
        showMessage('No picture or image uploaded yet. Please take a picture or upload an image first.', 'error');
        return;
    }

    // Show loading spinner and disable buttons during analysis
    loadingSpinner.classList.remove('hidden');
    analyzeButton.disabled = true;
    resetButton.disabled = true;
    startCameraButton.disabled = true;
    uploadButton.disabled = true;
    takePictureButton.disabled = true;
    resultsDiv.classList.add('hidden'); // Hide previous results

    try {
        // Extract base64 data and mime type from imageData URL
        const base64ImageData = imageData.split(',')[1];
        const mimeType = imageData.split(',')[0].split(':')[1].split(';')[0];

        let chatHistory = [];
        const prompt = "Analyze the food in this image and provide its estimated calorie, carbohydrate, and protein content. Please provide the response in JSON format with keys 'calories', 'carbohydrates', and 'proteins'. If you cannot identify the food or its nutritional content, return 0 for all values. Provide only the JSON object.";

        chatHistory.push({ role: "user", parts: [{ text: prompt }] });

        const payload = {
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: base64ImageData
                            }
                        }
                    ]
                }
            ],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        "calories": { "type": "NUMBER" },
                        "carbohydrates": { "type": "NUMBER" },
                        "proteins": { "type": "NUMBER" }
                    },
                    "propertyOrdering": ["calories", "carbohydrates", "proteins"]
                }
            }
        };

        // IMPORTANT: For local hosting, replace "" with your actual Google Cloud API key.
        // In the Canvas environment, this is automatically provided.
        const apiKey = "AIzaSyAQ2vEP2grCxRH6V_tQCnL8GztYxjuaKwU"; // <--- REPLACE THIS WITH YOUR GOOGLE CLOUD API KEY FOR LOCAL HOSTING
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        console.log('Gemini API Raw Response:', result);

        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {

            // The API is configured to return JSON directly, so parse it.
            const jsonResponseText = result.candidates[0].content.parts[0].text;
            const parsedJson = JSON.parse(jsonResponseText);

            // Update results display with formatted values
            caloriesSpan.textContent = parsedJson.calories !== undefined ? `${parsedJson.calories.toFixed(2)} kcal` : 'N/A';
            carbohydratesSpan.textContent = parsedJson.carbohydrates !== undefined ? `${parsedJson.carbohydrates.toFixed(2)} g` : 'N/A';
            proteinsSpan.textContent = parsedJson.proteins !== undefined ? `${parsedJson.proteins.toFixed(2)} g` : 'N/A';
            resultsDiv.classList.remove('hidden'); // Show results box
            showMessage('Analysis complete!', 'success');

        } else {
            showMessage('Could not get a valid response from AI. Please try again.', 'error');
            // Reset results display
            caloriesSpan.textContent = '--';
            carbohydratesSpan.textContent = '--';
            proteinsSpan.textContent = '--';
            resultsDiv.classList.remove('hidden'); // Still show box with default values
        }

    } catch (error) {
        console.error('Error analyzing food:', error);
        showMessage(`Error analyzing food: ${error.message || 'Network error or invalid response.'}`, 'error');
        // Reset results display
        caloriesSpan.textContent = '--';
        carbohydratesSpan.textContent = '--';
        proteinsSpan.textContent = '--';
        resultsDiv.classList.remove('hidden');
    } finally {
        // Hide loading spinner and re-enable appropriate buttons
        loadingSpinner.classList.add('hidden');
        analyzeButton.disabled = false; // Re-enable for another try if needed
        resetButton.disabled = false;
        startCameraButton.disabled = false;
        uploadButton.disabled = false;
        // takePictureButton remains disabled unless camera is restarted
    }
});

// Reset button click handler
resetButton.addEventListener('click', () => {
    // Stop camera stream if active
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
        stream = null;
    }
    imageData = null; // Clear image data
    drawInitialCanvasMessage(); // Redraw initial message on canvas

    // Reset button states
    startCameraButton.disabled = false;
    takePictureButton.disabled = true;
    uploadButton.disabled = false;
    analyzeButton.disabled = true;
    resetButton.disabled = true;

    // Hide results and clear content
    resultsDiv.classList.add('hidden');
    caloriesSpan.textContent = '--';
    carbohydratesSpan.textContent = '--';
    proteinsSpan.textContent = '--';
    showMessage('App reset. Ready to start again.', 'success');
});

// --- Initial Setup and Responsiveness ---

// Initial setup when the window loads
window.onload = drawInitialCanvasMessage;

// Handle canvas resizing when the window is resized
window.addEventListener('resize', () => {
    if (video.srcObject) { // If camera is active, redraw video frame
        resizeCanvasAndDraw(video, video.videoWidth, video.videoHeight);
    } else if (imageData) { // If an image is already captured/uploaded, redraw it
        const img = new Image();
        img.onload = () => {
            resizeCanvasAndDraw(img, img.width, img.height);
        };
        img.src = imageData;
    } else { // If no camera or image, show initial message
        drawInitialCanvasMessage();
    }
});

