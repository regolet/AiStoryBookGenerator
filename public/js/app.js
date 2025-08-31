class StoryBookApp {
    constructor() {
        this.apiUrl = '/api';
        this.currentTab = 'generate';
        this.uploadedReferenceImagePath = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAPIStatus();
        this.loadStoryBooks();
    }

    setupEventListeners() {
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        document.querySelector('.toggle-advanced').addEventListener('click', () => {
            const content = document.querySelector('.advanced-content');
            content.style.display = content.style.display === 'none' ? 'block' : 'none';
        });

        document.getElementById('generate-btn').addEventListener('click', () => {
            this.generateStoryBook();
        });

        document.getElementById('new-story').addEventListener('click', () => {
            this.resetForm();
        });

        // Style selection change handler
        document.getElementById('style-select').addEventListener('change', (e) => {
            this.handleStyleChange(e.target.value);
        });

        // File upload handler
        document.getElementById('reference-upload').addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files[0]);
        });
    }

    switchTab(tab) {
        this.currentTab = tab;
        
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.toggle('active', button.dataset.tab === tab);
        });

        document.querySelectorAll('.tab-content').forEach(content => {
            content.style.display = 'none';
        });

        document.getElementById(`${tab}-tab`).style.display = 'block';

        if (tab === 'library') {
            this.loadStoryBooks();
        }
    }

    async checkAPIStatus() {
        try {
            const response = await fetch(`${this.apiUrl}/health`);
            const data = await response.json();

            const statusHTML = `
                <div class="api-item">
                    <span>Google AI Studio (Story Analysis & References)</span>
                    <span class="api-status-icon ${data.apiKeys.google ? 'success' : 'error'}">
                        ${data.apiKeys.google ? '✓' : '✗'}
                    </span>
                </div>
                <div class="api-item">
                    <span>Replicate API (Final Images)</span>
                    <span class="api-status-icon ${data.apiKeys.replicate ? 'success' : 'error'}">
                        ${data.apiKeys.replicate ? '✓' : '✗'}
                    </span>
                </div>
                <div class="api-item">
                    <span>System Status</span>
                    <span class="api-status-icon ${data.ready ? 'success' : 'error'}">
                        ${data.ready ? 'Ready' : 'Not Ready'}
                    </span>
                </div>
            `;

            document.getElementById('api-status').innerHTML = statusHTML;

            if (!data.ready) {
                this.showError('Please configure your API keys in the .env file to use the generator.');
            }
        } catch (error) {
            console.error('Error checking API status:', error);
            document.getElementById('api-status').innerHTML = '<p>Error checking API status</p>';
        }
    }

    async loadStoryBooks() {
        try {
            const response = await fetch(`${this.apiUrl}/storybooks`);
            const data = await response.json();

            const container = document.getElementById('storybooks-container');

            if (data.storyBooks && data.storyBooks.length > 0) {
                container.innerHTML = data.storyBooks.map(book => `
                    <div class="storybook-card" onclick="window.open('/output/${book.id}/storybook.html', '_blank')">
                        <div class="storybook-card-image">📚</div>
                        <div class="storybook-card-content">
                            <h3>${book.title}</h3>
                            <p>Created: ${new Date(book.createdAt).toLocaleDateString()}</p>
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<p>No storybooks created yet. Generate your first one!</p>';
            }
        } catch (error) {
            console.error('Error loading storybooks:', error);
            document.getElementById('storybooks-container').innerHTML = '<p>Error loading storybooks</p>';
        }
    }

    async generateStoryBook() {
        const story = document.getElementById('story-input').value.trim();
        
        if (!story) {
            this.showError('Please enter a story to generate');
            return;
        }

        const button = document.getElementById('generate-btn');
        const buttonText = button.querySelector('.button-text');
        const loader = button.querySelector('.loader');
        const progressContainer = document.getElementById('progress-container');
        const progressFill = document.querySelector('.progress-fill');
        const progressText = document.querySelector('.progress-text');

        button.disabled = true;
        buttonText.style.display = 'none';
        loader.style.display = 'inline-block';
        progressContainer.style.display = 'block';

        const updateProgress = (percent, text) => {
            progressFill.style.width = `${percent}%`;
            progressText.textContent = text;
        };

        try {
            updateProgress(10, 'Analyzing story structure...');

            const requestData = {
                story: story,
                style: document.getElementById('style-select').value,
                targetAudience: document.getElementById('audience-select').value,
                useGoogleReference: document.getElementById('use-google-ref').checked,
                imageWidth: parseInt(document.getElementById('width-input').value),
                imageHeight: parseInt(document.getElementById('height-input').value),
                numInferenceSteps: parseInt(document.getElementById('steps-input').value),
                guidanceScale: parseFloat(document.getElementById('guidance-input').value),
                replicateModel: document.getElementById('model-select').value,
                aspectRatio: document.getElementById('aspect-ratio-select').value,
                referenceImagePath: this.uploadedReferenceImagePath
            };

            updateProgress(30, 'Breaking story into scenes...');

            const response = await fetch(`${this.apiUrl}/generate-storybook`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            updateProgress(60, 'Generating illustrations...');

            const data = await response.json();

            if (data.success) {
                updateProgress(100, 'StoryBook complete!');
                
                setTimeout(() => {
                    this.showResult(data);
                }, 500);
            } else {
                throw new Error(data.error || 'Failed to generate storybook');
            }
        } catch (error) {
            console.error('Error generating storybook:', error);
            this.showError(error.message || 'Failed to generate storybook. Please try again.');
        } finally {
            button.disabled = false;
            buttonText.style.display = 'inline';
            loader.style.display = 'none';
            progressContainer.style.display = 'none';
        }
    }

    showResult(data) {
        document.getElementById('result-container').style.display = 'block';
        document.getElementById('view-storybook').href = data.htmlUrl;
        
        const previewContainer = document.getElementById('preview-container');
        
        if (data.storyBook && data.storyBook.scenes) {
            const firstScenes = data.storyBook.scenes.slice(0, 3);
            previewContainer.innerHTML = `
                <h3>Preview</h3>
                ${firstScenes.map((scene, index) => `
                    <div class="scene-preview">
                        ${scene.generatedImage 
                            ? `<img src="/output/${data.storyBook.id}/images/scene_${index + 1}.png" alt="Scene ${index + 1}">`
                            : '<div>Image generation failed</div>'
                        }
                        <div class="scene-preview-text">
                            <h4>Scene ${index + 1}</h4>
                            <p>${scene.text}</p>
                        </div>
                    </div>
                `).join('')}
            `;
        }

        document.querySelector('.form-container').style.display = 'none';
    }

    resetForm() {
        document.getElementById('story-input').value = '';
        document.getElementById('result-container').style.display = 'none';
        document.querySelector('.form-container').style.display = 'block';
        document.getElementById('preview-container').innerHTML = '';
    }

    handleStyleChange(style) {
        const uploadSection = document.getElementById('upload-section');
        if (style === 'upload') {
            uploadSection.style.display = 'block';
        } else {
            uploadSection.style.display = 'none';
            this.uploadedReferenceImagePath = null;
        }
    }

    async handleFileUpload(file) {
        if (!file) return;

        const uploadStatus = document.getElementById('upload-status');
        const uploadPreview = document.getElementById('upload-preview');
        const previewImage = document.getElementById('preview-image');

        try {
            uploadStatus.textContent = 'Uploading...';
            uploadPreview.style.display = 'block';

            // Show preview
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImage.src = e.target.result;
            };
            reader.readAsDataURL(file);

            // Upload file
            const formData = new FormData();
            formData.append('referenceImage', file);

            const response = await fetch(`${this.apiUrl}/upload-reference`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.uploadedReferenceImagePath = result.filePath;
                uploadStatus.textContent = `✅ Uploaded: ${result.originalName}`;
                uploadStatus.style.color = '#28a745';
            } else {
                throw new Error(result.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            uploadStatus.textContent = `❌ Upload failed: ${error.message}`;
            uploadStatus.style.color = '#dc3545';
        }
    }

    showError(message) {
        alert(message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new StoryBookApp();
});