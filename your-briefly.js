// Your Briefly Page JavaScript
class YourBrieflyApp {
    constructor() {
        this.selectedTopics = new Set(); // stores selected topic names
        this.selectedHeadlines = new Map(); // Now stores arrays of selected headlines per topic
        this.customTopics = new Set(); // For storing custom topics
        this.realHeadlines = null; // For storing real headlines from CSV
        this.isPlaying = false;
        this.currentTime = 0;
        this.totalTime = 420; // 7 minutes in seconds
        this.playbackSpeed = 1.0;
        this.developerMode = this.checkDeveloperMode(); // Check for developer mode
        this.audioElement = null; // For real audio playback
        this.audioLoaded = false;
        
        // New properties for section navigation
        this.topicList = []; // Array of topic names in order
        this.currentTopicIndex = 0;
        this.topicData = {}; // Stores headlines data for each topic
        
        this.init();
    }
    
    // Check if developer mode is enabled via URL parameter or localStorage
    checkDeveloperMode() {
        const urlParams = new URLSearchParams(window.location.search);
        const urlDevMode = urlParams.get('dev') === 'true';
        const storageDevMode = localStorage.getItem('developerMode') === 'true';
        
        const devMode = urlDevMode || storageDevMode;
        
        if (devMode) {
            console.log('🔧 Developer Mode ENABLED - Will skip article generation and load from existing CSV');
            // Show developer mode indicator
            this.showDeveloperModeIndicator();
        }
        
        return devMode;
    }
    
    // Show a visual indicator that developer mode is active
    showDeveloperModeIndicator() {
        // Remove any existing indicator first
        const existingIndicator = document.getElementById('dev-mode-indicator');
        if (existingIndicator) existingIndicator.remove();
        
        const indicator = document.createElement('div');
        indicator.id = 'dev-mode-indicator';
        indicator.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: #f97316;
                color: white;
                padding: 8px 16px;
                border-radius: 8px;
                font-size: 12px;
                font-weight: bold;
                z-index: 9999;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            ">
                🔧 DEV MODE
                <button onclick="window.yourBrieflyApp.toggleDeveloperMode()" style="
                    margin-left: 8px;
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: white;
                    padding: 2px 6px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 10px;
                ">${this.developerMode ? 'OFF' : 'ON'}</button>
            </div>
        `;
        document.body.appendChild(indicator);
    }
    
    // Toggle developer mode on/off
    toggleDeveloperMode() {
        this.developerMode = !this.developerMode;
        localStorage.setItem('developerMode', this.developerMode.toString());
        
        if (this.developerMode) {
            console.log('🔧 Developer Mode ENABLED');
            this.showDeveloperModeIndicator();
        } else {
            console.log('🔧 Developer Mode DISABLED');
            const indicator = document.getElementById('dev-mode-indicator');
            if (indicator) indicator.remove();
            localStorage.removeItem('developerMode');
        }
    }
    
    init() {
        this.setupTopicSelection();
        this.setupCustomTopics();
        this.setupBriefingConfig();
        this.setupPlayer();
        this.loadMockHeadlines();
        this.updateLengthDisplay();
        
        // Log developer mode info
        console.log('%c🔧 Developer Mode Available', 'color: #f97316; font-weight: bold; font-size: 14px;');
        console.log('Enable with: ?dev=true in URL or yourBrieflyApp.toggleDeveloperMode()');
        console.log('When enabled, headlines load directly from existing articles.csv');
    }

    setupCustomTopics() {
        const customTopicInput = document.getElementById('customTopicInput');
        const addTopicBtn = document.getElementById('addCustomTopic');

        addTopicBtn.addEventListener('click', () => {
            this.addCustomTopic();
        });

        customTopicInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addCustomTopic();
            }
        });

    }

    addCustomTopic() {
        const customTopicInput = document.getElementById('customTopicInput');
        const customTopicDisplay = document.getElementById('customTopicsDisplay');
        const customTopicsList = document.getElementById('customTopicsList');

        const topicName = customTopicInput.value.trim();

        if (!topicName) {
            showNotification('Please enter a topic name', 'warning');
            return;
        }

        if (this.customTopics.has(topicName.toLowerCase())) {
            showNotification('This topic already exists', 'warning');
            return;
        }

        this.customTopics.add(topicName.toLowerCase());

        const topicItem = document.createElement('div');
        topicItem.className = 'custom-topic-item';
        topicItem.dataset.topic = topicName.toLowerCase();

        topicItem.innerHTML = `
        <input type="checkbox" id="custom-${topicName.toLowerCase()}" style="display: none;">
        <span class="custom-topic-name">${topicName}</span>
        <button class="remove-topic-btn" onclick="yourBrieflyApp.removeCustomTopic('${topicName.toLowerCase()}')">❌</button>`;

        topicItem.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-topic-btn')) return;
            
            const topic = topicItem.dataset.topic;
            const checkbox = topicItem.querySelector('input[type="checkbox"]');

            checkbox.checked = !checkbox.checked;
            topicItem.classList.toggle('selected', checkbox.checked);

            if (checkbox.checked) {
                this.selectedTopics.add(topic);
            } else {
                this.selectedTopics.delete(topic);
                this.selectedHeadlines.delete(topic);
            }

            this.updateContinueButton();
        });

        customTopicsList.appendChild(topicItem);
        customTopicsDisplay.style.display = 'block';

        customTopicInput.value = ''; // Clear input field
        showNotification(`"Custom topic "${topicName}" added!`, 'success');
    }

    removeCustomTopic(topicName) {
        const customTopicsList = document.getElementById('customTopicsList');
        const customTopicsDisplay = document.getElementById('customTopicsDisplay');
        
        this.customTopics.delete(topicName);
        this.selectedTopics.delete(topicName);
        this.selectedHeadlines.delete(topicName);

        const topicItem = customTopicsList.querySelector(`"[data-topic="${topicName}"]`);
        if (topicItem) {
            topicItem.remove();
        }
        if (this.customTopics.size == 0) {
            customTopicsDisplay.style.display = 'none';
        }

        this.updateContinueButton();
        showNotification('Custom topic removed', 'info');
    }

    getCustomTopicInfo(topic) {
        return {
            name: topic.charAt(0).toUpperCase() + topic.slice(1),
            icon: '🔖'
        };
    }
    
    setupTopicSelection() {
        const topicCards = document.querySelectorAll('.topic-card');
        const continueBtn = document.getElementById('continueBtn');
        const selectionCount = document.querySelector('.selection-count');

        // Handle regular topic cards (pre-defined topics)
        topicCards.forEach(card => {
            card.addEventListener('click', () => {
                const topic = card.dataset.topic;
                const checkbox = card.querySelector('input[type="checkbox"]');
                
                // Only process if checkbox exists (regular topic cards)
                if (!checkbox) {
                    // This is likely a custom topic item, skip processing here
                    return;
                }
                
                // Toggle selection
                checkbox.checked = !checkbox.checked;
                card.classList.toggle('selected', checkbox.checked);
                
                if (checkbox.checked) {
                    this.selectedTopics.add(topic);
                } else {
                    this.selectedTopics.delete(topic);
                    this.selectedHeadlines.delete(topic);
                }
                
                this.updateContinueButton();
            });
        });
        
        this.updateContinueButton();
    }
    
    updateContinueButton() {
        const continueBtn = document.getElementById('continueBtn');
        const selectionCount = document.querySelector('.selection-count');
        const count = this.selectedTopics.size;
        
        if (count >= 2) {
            continueBtn.classList.add('enabled');
            selectionCount.textContent = `${count} topics selected - Ready to continue!`;
        } else {
            continueBtn.classList.remove('enabled');
            selectionCount.textContent = count === 1 ? 
                'Select at least 1 more topic to continue' : 
                'Select at least 2 topics to continue';
        }
    }
    
    setupBriefingConfig() {
        const lengthSlider = document.getElementById('briefingLength');
        const lengthValue = document.getElementById('lengthValue');
        const apiKeyInput = document.getElementById('geminiApiKey');
        const toggleKeyBtn = document.getElementById('toggleApiKey');
        
        // Length slider functionality
        lengthSlider.addEventListener('input', () => {
            lengthValue.textContent = lengthSlider.value;
            this.totalTime = parseInt(lengthSlider.value) * 60; // Convert to seconds
            this.updateTotalTimeDisplay();
        });
        
        // API key toggle visibility
        if (toggleKeyBtn && apiKeyInput) {
            toggleKeyBtn.addEventListener('click', () => {
                if (apiKeyInput.type === 'password') {
                    apiKeyInput.type = 'text';
                    toggleKeyBtn.textContent = '👁️';
                } else {
                    apiKeyInput.type = 'password';
                    toggleKeyBtn.textContent = '🙈';
                }
            });
        }
        
        // API key validation and storage
        if (apiKeyInput) {
            // Load saved API key from localStorage
            const savedApiKey = localStorage.getItem('gemini_api_key');
            if (savedApiKey) {
                apiKeyInput.value = savedApiKey;
                this.validateApiKey(savedApiKey);
            }
            
            // Save API key on input
            apiKeyInput.addEventListener('input', () => {
                const apiKey = apiKeyInput.value.trim();
                if (apiKey) {
                    localStorage.setItem('gemini_api_key', apiKey);
                    this.validateApiKey(apiKey);
                } else {
                    localStorage.removeItem('gemini_api_key');
                    this.clearApiKeyStatus();
                }
            });
        }
    }
    
    validateApiKey(apiKey) {
        // Basic validation - check if it looks like a valid Google API key
        const apiKeyPattern = /^AIza[0-9A-Za-z-_]{35}$/;
        const container = document.querySelector('.api-key-input-container');
        
        // Remove existing status indicators
        const existingStatus = container.querySelector('.api-key-status');
        if (existingStatus) {
            existingStatus.remove();
        }
        
        if (apiKeyPattern.test(apiKey)) {
            // Add valid indicator
            const statusIndicator = document.createElement('span');
            statusIndicator.className = 'api-key-status api-key-valid';
            statusIndicator.textContent = '✓';
            statusIndicator.title = 'API key format looks valid';
            container.appendChild(statusIndicator);
            return true;
        } else if (apiKey.length > 0) {
            // Add invalid indicator
            const statusIndicator = document.createElement('span');
            statusIndicator.className = 'api-key-status api-key-invalid';
            statusIndicator.textContent = '✗';
            statusIndicator.title = 'API key format appears invalid';
            container.appendChild(statusIndicator);
            return false;
        }
        return false;
    }
    
    clearApiKeyStatus() {
        const container = document.querySelector('.api-key-input-container');
        const existingStatus = container.querySelector('.api-key-status');
        if (existingStatus) {
            existingStatus.remove();
        }
    }
    
    getApiKey() {
        const apiKeyInput = document.getElementById('geminiApiKey');
        return apiKeyInput ? apiKeyInput.value.trim() : '';
    }
    
    updateLengthDisplay() {
        const lengthSlider = document.getElementById('briefingLength');
        const lengthValue = document.getElementById('lengthValue');
        lengthValue.textContent = lengthSlider.value;
    }
    
    updateTotalTimeDisplay() {
        const totalTimeElement = document.getElementById('totalTime');
        if (totalTimeElement) {
            totalTimeElement.textContent = this.formatTime(this.totalTime);
        }
    }
    
    loadMockHeadlines() {
        this.mockHeadlines = {
            technology: [
                { title: "OpenAI Releases GPT-5 with Revolutionary Reasoning Capabilities", source: "TechCrunch", url: "https://techcrunch.com/gpt-5-release" },
                { title: "Apple Vision Pro 2 Features Mind-Control Interface Technology", source: "The Verge", url: "https://theverge.com/apple-vision-pro-2" },
                { title: "Meta's New AI Chip Promises 10x Performance Improvement", source: "Wired", url: "https://wired.com/meta-ai-chip" },
                { title: "Google Quantum Computer Solves Climate Modeling in Minutes", source: "MIT Technology Review", url: "https://technologyreview.com/google-quantum" },
                { title: "Tesla's Neural Implant Enables Paralyzed Patients to Walk Again", source: "Reuters", url: "https://reuters.com/tesla-neural-implant" }
            ],
            business: [
                { title: "Bitcoin Reaches $150,000 as Institutional Adoption Accelerates", source: "Financial Times", url: "https://ft.com/bitcoin-150k" },
                { title: "Amazon's Drone Delivery Network Now Covers 80% of US Cities", source: "Bloomberg", url: "https://bloomberg.com/amazon-drone-delivery" },
                { title: "Netflix Subscriber Growth Surges 40% with AI-Personalized Content", source: "Wall Street Journal", url: "https://wsj.com/netflix-ai-growth" },
                { title: "Microsoft's AI Revenue Exceeds $50 Billion, Overtaking Cloud Services", source: "Forbes", url: "https://forbes.com/microsoft-ai-revenue" },
                { title: "Uber's Autonomous Fleet Completes 1 Million Safe Rides This Month", source: "Business Insider", url: "https://businessinsider.com/uber-autonomous-million" }
            ],
            science: [
                { title: "CRISPR Gene Therapy Successfully Cures Type 1 Diabetes in Trials", source: "Nature", url: "https://nature.com/crispr-diabetes-cure" },
                { title: "NASA's Europa Mission Discovers Potential Signs of Microbial Life", source: "Science Magazine", url: "https://science.org/nasa-europa-life" },
                { title: "Fusion Reactor Achieves Net Energy Gain for 30 Consecutive Days", source: "Physics Today", url: "https://physicstoday.org/fusion-breakthrough" },
                { title: "AI Model Predicts Alzheimer's Disease 10 Years Before Symptoms", source: "New England Journal", url: "https://nejm.org/ai-alzheimers-prediction" },
                { title: "Antarctic Ice Sheet Collapse Could Raise Sea Levels by 15 Feet", source: "Climate Science", url: "https://climatescience.org/antarctic-collapse" }
            ],
            health: [
                { title: "New mRNA Vaccine Shows 95% Effectiveness Against All Cancer Types", source: "The Lancet", url: "https://thelancet.com/mrna-cancer-vaccine" },
                { title: "AI-Powered Drug Discovery Reduces Development Time to 6 Months", source: "Health Affairs", url: "https://healthaffairs.org/ai-drug-discovery" },
                { title: "Longevity Treatment Extends Human Lifespan by 20 Years in Trials", source: "JAMA", url: "https://jamanetwork.com/longevity-treatment" },
                { title: "Virtual Reality Therapy Cures 80% of Chronic Pain Cases", source: "Mayo Clinic Proceedings", url: "https://mayoclinicproceedings.org/vr-pain-therapy" },
                { title: "Robotic Surgery Success Rate Reaches 99.9% with New AI System", source: "Medical News Today", url: "https://medicalnewstoday.com/robotic-surgery-ai" }
            ],
            politics: [
                { title: "Global Climate Accord Mandates Carbon Neutrality by 2035", source: "Associated Press", url: "https://apnews.com/climate-accord-2035" },
                { title: "US Congress Passes Universal Basic Income Pilot Program", source: "Washington Post", url: "https://washingtonpost.com/ubi-pilot-program" },
                { title: "EU Announces Digital Currency to Replace Traditional Banking", source: "Politico", url: "https://politico.eu/digital-currency-banking" },
                { title: "International AI Governance Treaty Signed by 150 Nations", source: "Reuters", url: "https://reuters.com/ai-governance-treaty" },
                { title: "Space Mining Rights Agreement Reached Between Major Powers", source: "BBC News", url: "https://bbc.com/space-mining-agreement" }
            ],
            sports: [
                { title: "AI-Enhanced Athletes Break 3 World Records at Tokyo Olympics", source: "ESPN", url: "https://espn.com/ai-athletes-olympics" },
                { title: "Virtual Reality Sports Leagues Attract 500M Global Viewers", source: "Sports Illustrated", url: "https://si.com/vr-sports-leagues" },
                { title: "Biometric Monitoring Prevents 90% of Sports Injuries This Season", source: "Athletic Business", url: "https://athleticbusiness.com/biometric-monitoring" },
                { title: "Sustainable Sports Venues Powered Entirely by Renewable Energy", source: "Green Sports Alliance", url: "https://greensportsalliance.org/renewable-venues" },
                { title: "Neural Interface Allows Paralyzed Athletes to Compete Virtually", source: "Paralympic News", url: "https://paralympic.org/neural-interface-athletes" }
            ]

            
        };
        this.generateMockHeadlinesForCustomTopic = (topic) => {
            return [
                { title: `Latest developments in ${topic}`, source: "News Source", url: "#" },
                { title: `${topic} industry update`, source: "Industry Today", url: "#" },
                { title: `Breaking: ${topic} news`, source: "Breaking News", url: "#" },
                { title: `${topic} market analysis`, source: "Market Watch", url: "#" },
                { title: `${topic} trends and insights`, source: "Trend Report", url: "#" }
            ];
        };
    }
    
    setupPlayer() {
        const playBtn = document.getElementById('playBtn');
        const progressBar = document.querySelector('.progress-bar');
        
        // Initialize audio element
        this.audioElement = new Audio();
        this.audioElement.preload = 'auto';
        
        // Audio event listeners
        this.audioElement.addEventListener('loadedmetadata', () => {
            this.totalTime = this.audioElement.duration;
            this.updateTotalTimeDisplay();
            this.audioLoaded = true;
            console.log(`Audio loaded: ${this.formatTime(this.totalTime)}`);
        });
        
        this.audioElement.addEventListener('timeupdate', () => {
            if (this.audioLoaded && this.isPlaying) {
                this.currentTime = this.audioElement.currentTime;
                this.updateProgress();
            }
        });
        
        this.audioElement.addEventListener('ended', () => {
            this.pausePlayback();
            this.currentTime = 0;
            this.updateProgress();
        });
        
        this.audioElement.addEventListener('error', (e) => {
            console.error('Audio error:', e);
            showNotification('Error playing audio file', 'warning');
        });
        
        if (playBtn) {
            playBtn.addEventListener('click', () => this.togglePlayback());
        }
        
        if (progressBar) {
            progressBar.addEventListener('click', (e) => {
                const rect = progressBar.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                if (this.audioLoaded && this.audioElement) {
                    this.audioElement.currentTime = percent * this.totalTime;
                } else {
                    this.currentTime = percent * this.totalTime;
                    this.updateProgress();
                }
            });
        }
    }
    
    loadAudioFile(audioUrl) {
        if (this.audioElement) {
            this.audioElement.src = audioUrl;
            this.audioElement.load();
            console.log('Loading audio from:', audioUrl);
        }
    }
    
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    updateProgress() {
        const progressFill = document.getElementById('progressFill');
        const currentTimeElement = document.getElementById('currentTime');
        
        if (progressFill) {
            const percent = (this.currentTime / this.totalTime) * 100;
            progressFill.style.width = `${percent}%`;
        }
        
        if (currentTimeElement) {
            currentTimeElement.textContent = this.formatTime(this.currentTime);
        }
    }
    
    startProgressTimer() {
        this.progressInterval = setInterval(() => {
            if (this.isPlaying && this.currentTime < this.totalTime) {
                this.currentTime += this.playbackSpeed;
                this.updateProgress();
                
                if (this.currentTime >= this.totalTime) {
                    this.pausePlayback();
                }
            }
        }, 1000);
    }
    
    stopProgressTimer() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }
    
    // New methods for section navigation
    initializeTopicNavigation() {
        this.topicList = Array.from(this.selectedTopics);
        this.currentTopicIndex = 0;
        
        // Initialize selected headlines map with empty arrays
        this.topicList.forEach(topic => {
            if (!this.selectedHeadlines.has(topic)) {
                this.selectedHeadlines.set(topic, []);
            }
        });
        
        this.updateNavigationDisplay();
        this.displayCurrentTopic();
    }
    
    navigateToTopic(direction) {
        const newIndex = this.currentTopicIndex + direction;
        
        if (newIndex >= 0 && newIndex < this.topicList.length) {
            this.currentTopicIndex = newIndex;
            this.updateNavigationDisplay();
            this.displayCurrentTopic();
        }
    }
    
    updateNavigationDisplay() {
        const currentTopicIndex = document.getElementById('currentTopicIndex');
        const totalTopics = document.getElementById('totalTopics');
        const currentTopicName = document.getElementById('currentTopicName');
        const prevBtn = document.getElementById('prevTopicBtn');
        const nextBtn = document.getElementById('nextTopicBtn');
        const selectionStatus = document.getElementById('selectionStatus');
        
        if (currentTopicIndex) currentTopicIndex.textContent = this.currentTopicIndex + 1;
        if (totalTopics) totalTopics.textContent = this.topicList.length;
        
        const currentTopic = this.topicList[this.currentTopicIndex];
        const topicInfo = getTopicInfo(currentTopic);
        if (currentTopicName) {
            currentTopicName.innerHTML = `${topicInfo.icon} ${topicInfo.name}`;
        }
        
        // Update navigation buttons
        if (prevBtn) prevBtn.disabled = this.currentTopicIndex === 0;
        if (nextBtn) nextBtn.disabled = this.currentTopicIndex === this.topicList.length - 1;
        
        // Update selection status
        if (selectionStatus) {
            const selectedCount = this.selectedHeadlines.get(currentTopic)?.length || 0;
            const totalCount = this.topicData[currentTopic]?.length || 0;
            selectionStatus.textContent = `${selectedCount} of ${Math.min(totalCount, 5)} articles selected`;
        }
    }
    
    displayCurrentTopic() {
        const headlinesContainer = document.getElementById('headlinesContainer');
        const currentTopic = this.topicList[this.currentTopicIndex];
        const articles = this.topicData[currentTopic] || [];
        const topicInfo = getTopicInfo(currentTopic);
        
        // Determine if this is live or cached data
        const isLive = this.realHeadlines && this.realHeadlines[currentTopic];
        
        headlinesContainer.innerHTML = `
            <div class="single-topic-container">
                <div class="single-topic-header">
                    <div class="single-topic-icon">${topicInfo.icon}</div>
                    <h3 class="single-topic-title">${topicInfo.name}</h3>
                    <div class="single-topic-indicator ${isLive ? 'live-indicator' : 'cached-indicator'}">
                        ${isLive ? '🔴 LIVE' : '📦 CACHED'}
                    </div>
                </div>
                <div class="headlines-grid">
                    ${articles.slice(0, 5).map((article, index) => `
                        <div class="headline-item" data-topic="${currentTopic}" data-index="${index}">
                            <div class="headline-title">${article.title}</div>
                            <div class="headline-source">${article.source}</div>
                            ${article.url && article.url !== '#' ? `<div class="headline-url"><a href="${article.url}" target="_blank" style="color: #3b82f6; text-decoration: none; font-size: 0.85rem;">${article.url}</a></div>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        // Restore previous selections for this topic
        const selectedIndices = this.selectedHeadlines.get(currentTopic) || [];
        selectedIndices.forEach(index => {
            const item = headlinesContainer.querySelector(`[data-topic="${currentTopic}"][data-index="${index}"]`);
            if (item) item.classList.add('selected');
        });
        
        // Add click handlers
        this.setupCurrentTopicSelection();
    }
    
    setupCurrentTopicSelection() {
        const headlineItems = document.querySelectorAll('.headline-item');
        const currentTopic = this.topicList[this.currentTopicIndex];
        
        headlineItems.forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                const selectedIndices = this.selectedHeadlines.get(currentTopic) || [];
                
                if (item.classList.contains('selected')) {
                    // Deselect
                    item.classList.remove('selected');
                    const newIndices = selectedIndices.filter(i => i !== index);
                    this.selectedHeadlines.set(currentTopic, newIndices);
                } else {
                    // Select (allow multiple selections)
                    item.classList.add('selected');
                    if (!selectedIndices.includes(index)) {
                        selectedIndices.push(index);
                        this.selectedHeadlines.set(currentTopic, selectedIndices);
                    }
                }
                
                this.updateNavigationDisplay();
                this.updateGenerateButton();
            });
        });
    }
    
    updateGenerateButton() {
        // Call the global updateGenerateButton function
        updateGenerateButton();
    }

    getBriefingLength() {
        const lengthSlider = document.getElementById('briefingLength');
        return lengthSlider ? parseInt(lengthSlider.value) : 5; // Default to 5 minutes
    }
}

// Developer mode function to load articles directly from CSV
function loadHeadlinesFromExistingCSV() {
    const app = window.yourBrieflyApp;
    const headlinesContainer = document.getElementById('headlinesContainer');
    
    console.log('🔧 Developer Mode: Loading headlines directly from existing CSV...');
    
    // Show loading message
    headlinesContainer.innerHTML = '<div class="headlines-loading">🔧 Dev Mode: Loading from existing CSV...</div>';
    
    // Load articles directly from CSV
    loadArticlesFromCSV().then(articles => {
        // Show processing message
        headlinesContainer.innerHTML = '<div class="headlines-loading">🔧 Dev Mode: Processing articles...</div>';
        
        console.log(`📊 Loaded ${articles.length} articles from existing CSV`);
        
        if (articles.length === 0) {
            console.warn('⚠️ No articles found in CSV, falling back to mock headlines');
            generateMockHeadlinesForTopics();
            showNotification('⚠️ No articles found in CSV. Using mock headlines.', 'warning');
            return;
        }
        
        // Process articles with a small delay to allow UI update
        setTimeout(() => {
            // Clear processing message
            headlinesContainer.innerHTML = '';
            
            // Group articles by topic
            const articlesByTopic = {};
            
            articles.forEach(article => {
            const topic = article.topic ? article.topic.toLowerCase() : 'unknown';
            if (!articlesByTopic[topic]) {
                articlesByTopic[topic] = [];
            }
            
            // Handle publisher field which might be a JSON string
            let source = 'Unknown source';
            if (article.publisher) {
                const publisherStr = article.publisher.trim();
                try {
                    // More robust JSON validation - check if it starts and ends properly
                    if (publisherStr.startsWith('{') && publisherStr.endsWith('}')) {
                        // Convert single quotes to double quotes for valid JSON parsing
                        const jsonStr = publisherStr.replace(/'/g, '"');
                        const publisherObj = JSON.parse(jsonStr);
                        source = publisherObj.title || 'Unknown source';
                    } else {
                        source = article.publisher;
                    }
                } catch (e) {
                    console.warn('⚠️ Invalid publisher format, using raw string:', e.message);
                    source = article.publisher;
                }
            }
            
            // Optimized title cleaning - only if title contains potential source patterns
            let cleanTitle = article.title || 'No title';
            if (cleanTitle && (cleanTitle.includes(' - ') || cleanTitle.includes(' | '))) {
                cleanTitle = cleanTitle.replace(/\s*[-|]\s*[^-|]+$/, '').trim();
            }
            
            articlesByTopic[topic].push({
                title: cleanTitle,
                source: source,
                url: article.url || '#',
                summary: article.description || (article.text ? article.text.substring(0, 150) + '...' : '')
            });
        });
        
        // Log article headlines grouped by topic (reduced logging for performance)
        console.log('📰 Article Headlines by Topic (from existing CSV):');
        console.log('=====================================');
        
        Object.keys(articlesByTopic).forEach(topic => {
            const topicArticles = articlesByTopic[topic];
            console.log(`🏷️ ${topic.toUpperCase()}: ${topicArticles.length} articles`);
            // Only log first 2 articles per topic to reduce console spam
            topicArticles.slice(0, 2).forEach((article, index) => {
                console.log(`  ${index + 1}. ${article.title}`);
            });
            if (topicArticles.length > 2) {
                console.log(`  ... and ${topicArticles.length - 2} more articles`);
            }
        });
        
        console.log('\n=====================================');
        console.log(`📈 Total articles across all topics: ${articles.length}`);
        
        // Prepare topics data for section navigation
        const topicsData = {};
        Array.from(app.selectedTopics).forEach(topic => {
            const topicArticles = articlesByTopic[topic] || [];
            
            if (topicArticles.length === 0) {
                console.warn(`No articles found for topic: ${topic}`);
                // Fallback to mock headlines for this topic
                const mockHeadlines = app.mockHeadlines[topic] || [];
                topicsData[topic] = mockHeadlines;
            } else {
                topicsData[topic] = topicArticles;
            }
        });
        
        // Update the app's headlines data with articles from CSV
        app.realHeadlines = articlesByTopic;
        
        // Create section navigation
        createTopicSections(topicsData, false); // false = cached/not live
        
        updateGenerateButton();
        
        showNotification('🔧 Developer Mode: Headlines loaded from existing CSV!', 'success');
        
        }, 100); // Small delay to allow UI update
        
    }).catch(error => {
        console.error('Error loading articles from existing CSV:', error);
        showNotification('⚠️ Error loading existing CSV. Using mock headlines.', 'warning');
        // Fallback to mock headlines
        generateMockHeadlinesForTopics();
    });
}

// Global functions called by HTML onclick handlers
function proceedToHeadlines() {
    const app = window.yourBrieflyApp;
    
    if (app.selectedTopics.size < 2) {
        showNotification('Please select at least 2 topics to continue', 'warning');
        return;
    }
    
    const continueBtn = document.getElementById('continueBtn');
    const originalText = continueBtn.innerHTML;
    
    // Show loading state
    continueBtn.innerHTML = `
        <span style="display: inline-block; animation: spin 1s linear infinite;">⏳</span>
        Loading Headlines...
    `;
    continueBtn.disabled = true;
    
    // Simulate headline loading
    setTimeout(() => {
        // Hide topic selection and show headlines
        document.querySelector('.topic-selection').style.display = 'none';
        document.getElementById('headlinesSection').style.display = 'block';
        
        // Show loading state for headlines
        const headlinesContainer = document.getElementById('headlinesContainer');
        headlinesContainer.innerHTML = '<div class="headlines-loading">Fetching latest headlines from live sources...</div>';
        
        // Generate headlines for selected topics after a brief delay
        setTimeout(() => {
            generateHeadlinesForTopics();
            
            // Reset button
            continueBtn.innerHTML = originalText;
            continueBtn.disabled = false;
        }, 1500);
        
        // Smooth scroll to headlines section
        document.getElementById('headlinesSection').scrollIntoView({ 
            behavior: 'smooth' 
        });
    }, 800);
}

async function fetchRealArticles(topics) {
    try {
        // Check for API key first
        const app = window.yourBrieflyApp;
        const apiKey = app.getApiKey();
        console.log('🔑 API Key check:', apiKey ? `Key found (${apiKey.length} chars)` : 'No API key found - will use cached headlines');
        
        // If no API key, just throw an error to fall back to cached headlines
        if (!apiKey) {
            console.log('📦 No API key provided, falling back to cached headlines');
            throw new Error('No API key provided: using cached headlines');
        }
        
        const validation = app.validateApiKey(apiKey);
        if (!validation) {
            console.log('📦 Invalid API key format, falling back to cached headlines');
            throw new Error('Invalid API key format: using cached headlines');
        }
        
        showNotification('🔍 Searching for latest articles...', 'info');
        
        // Create a longer timeout promise (25 minutes to match server)
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout after 25 minutes')), 1500000); // 25 minutes
        });
        
        // Create the fetch promise with longer timeout
        const fetchPromise = fetch('http://localhost:5001/api/fetch-articles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                topics: topics,
                api_key: apiKey
            })
        });
        
        // Race between fetch and timeout
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        
        if (!response.ok) {
            // Log the full error response for debugging
            const errorText = await response.text();
            console.error(`Server error (${response.status}):`, errorText);
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Unknown error occurred');
        }
        
        showNotification('📊 Processing article data...', 'info');
        
        return result;
    } catch (error) {
        console.error('Error calling Python script:', error);
        
        // Enhanced error handling with specific messages
        if (error.message.includes('No API key provided') || error.message.includes('Invalid API key format')) {
            console.log('📦 Falling back to cached headlines due to API key issue');
            // Don't show error notification for expected API key fallback
        } else if (error.message.includes('Developer mode')) {
            console.log('🔧 Developer mode: falling back to cached headlines');
            // Don't show error notification for developer mode fallback
        } else if (error.message.includes('Request timeout')) {
            showNotification('⚠️ Article service is taking longer than expected. Using cached headlines.', 'warning');
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            showNotification('⚠️ Unable to connect to article service. Using cached headlines.', 'warning');
        } else if (error.message.includes('504')) {
            showNotification('⚠️ Article fetching timed out after 25 minutes. Using cached headlines.', 'warning');
        } else if (error.message.includes('500')) {
            showNotification('⚠️ Article service error. Using cached headlines.', 'warning');
        } else if (error.message.includes('Script execution timed out')) {
            showNotification('⚠️ Article fetching timed out after 25 minutes. Using cached headlines.', 'warning');
        } else {
            showNotification('⚠️ Unable to fetch live articles. Using cached headlines.', 'warning');
        }
        
        throw error;
    }
}

function generateHeadlinesForTopics() {
    const app = window.yourBrieflyApp;
    const headlinesContainer = document.getElementById('headlinesContainer');
    
    // Check if developer mode is enabled
    if (app.developerMode) {
        console.log('🔧 Developer Mode: Skipping article generation, loading from existing CSV');
        loadHeadlinesFromExistingCSV();
        return;
    }
    
    console.log('🔍 Production Mode: Generating fresh headlines...');
    
    // Show initial loading with progress updates
    let progressStep = 0;
    const progressMessages = [
        'Connecting to article sources...',
        'Searching for latest articles...',
        'Processing article data...',
        'Filtering relevant content...',
        'Organizing by topics...',
        'Finalizing your headlines...'
    ];
    
    function updateProgress() {
        if (progressStep < progressMessages.length) {
            headlinesContainer.innerHTML = `
                <div class="headlines-loading">
                    ${progressMessages[progressStep]}
                    <div class="progress-dots">
                        ${'.'.repeat((progressStep % 3) + 1)}
                    </div>
                </div>
            `;
            progressStep++;
            setTimeout(updateProgress, 8000); // Update every 8 seconds
        }
    }
    
    updateProgress();
    
    // Set a much longer timeout for the entire process (25 minutes)
    const processTimeout = setTimeout(() => {
        console.log('Process timeout reached after 25 minutes, falling back to mock headlines');
        // Only clear and show mock headlines if no headlines are currently displayed
        if (headlinesContainer.innerHTML.includes('headlines-loading')) {
            headlinesContainer.innerHTML = '';
            generateMockHeadlinesForTopics();
            showNotification('📦 Process took too long. Using cached headlines for faster experience.', 'info');
        } else {
            console.log('Headlines already loaded, skipping timeout fallback');
        }
    }, 1500000); // 25 minutes
    
    // Call Python script to find articles for selected topics
    fetchRealArticles(Array.from(app.selectedTopics))
        .then(() => {
            clearTimeout(processTimeout); // Clear timeout if successful
            console.log('Article fetching completed successfully');
            
            // Show completion message
            headlinesContainer.innerHTML = '<div class="headlines-loading">Processing articles...</div>';
            
            // Add delay as requested (reduced to 1 second for better UX)
            setTimeout(() => {
                // Clear loading message
                headlinesContainer.innerHTML = '';
                
                // Read articles from CSV and populate headlines
                loadArticlesFromCSV().then(articles => {
                    // Log the total number of articles loaded
                    console.log(`📊 Loaded ${articles.length} articles from CSV`);
                    
                    // Group articles by topic
                    const articlesByTopic = {};
                    
                    articles.forEach(article => {
                        const topic = article.topic ? article.topic.toLowerCase() : 'unknown';
                        if (!articlesByTopic[topic]) {
                            articlesByTopic[topic] = [];
                        }
                        
                        // Handle publisher field which might be a JSON string
                        let source = 'Unknown source';
                        if (article.source) {
                            source = article.source;
                        } else if (article.publisher) {
                            const publisherStr = article.publisher.trim();
                            try {
                                // More robust JSON validation - check if it starts and ends properly
                                if (publisherStr.startsWith('{') && publisherStr.endsWith('}')) {
                                    const publisherObj = JSON.parse(publisherStr);
                                    source = publisherObj.title || 'Unknown source';
                                } else {
                                    source = article.publisher;
                                }
                            } catch (e) {
                                // Silent fallback - don't log every parsing error to reduce console spam
                                source = article.publisher;
                            }
                        }
                        
                        articlesByTopic[topic].push({
                            title: article.title || 'No title',
                            source: source,
                            url: article.url || '#',
                            summary: article.summary || article.text ? article.text.substring(0, 150) + '...' : ''
                        });
                    });
                    
                    // Log article headlines grouped by topic
                    console.log('📰 Article Headlines by Topic:');
                    console.log('=====================================');
                    
                    Object.keys(articlesByTopic).forEach(topic => {
                        const topicArticles = articlesByTopic[topic];
                        console.log(`\n🏷️ ${topic.toUpperCase()} (${topicArticles.length} articles):`);
                        topicArticles.forEach((article, index) => {
                            console.log(`  ${index + 1}. ${article.title}`);
                            console.log(`     Source: ${article.source}`);
                            if (article.url && article.url !== '#') {
                                console.log(`     URL: ${article.url}`);
                            }
                        });
                    });
                    
                    console.log('\n=====================================');
                    console.log(`📈 Total articles across all topics: ${articles.length}`);
                    
                    // Prepare topics data for section navigation
                    const topicsData = {};
                    Array.from(app.selectedTopics).forEach(topic => {
                        const topicArticles = articlesByTopic[topic] || [];
                        
                        if (topicArticles.length === 0) {
                            console.warn(`No articles found for topic: ${topic}`);
                            // Fallback to mock headlines for this topic
                            const mockHeadlines = app.mockHeadlines[topic] || [];
                            topicsData[topic] = mockHeadlines;
                        } else {
                            topicsData[topic] = topicArticles;
                        }
                    });
                    
                    // Update the app's headlines data with real articles
                    app.realHeadlines = articlesByTopic;
                    
                    // Create section navigation
                    createTopicSections(topicsData, true); // true = live data
                    
                    updateGenerateButton();
                    
                    showNotification('✅ Latest headlines loaded successfully!', 'success');
                }).catch(error => {
                    console.error('Error loading articles from CSV:', error);
                    showNotification('⚠️ Error loading articles. Using cached headlines.', 'warning');
                    // Fallback to mock headlines
                    generateMockHeadlinesForTopics();
                });
            }, 1000);
        })
        .catch(error => {
            clearTimeout(processTimeout); // Clear timeout on error
            console.error('Error fetching articles:', error);
            
            // Always fall back to mock headlines with shorter delay
            setTimeout(() => {
                headlinesContainer.innerHTML = '';
                generateMockHeadlinesForTopics();
                showNotification('📦 Showing cached headlines while article service is processing.', 'info');
            }, 500);
        });
}

// Global navigation function for topic sections
function navigateToTopic(direction) {
    const app = window.yourBrieflyApp;
    app.navigateToTopic(direction);
}

// Update the existing createTopicSection function for the new system
function createTopicSections(topicsData, isLive = true) {
    const app = window.yourBrieflyApp;
    const headlinesContainer = document.getElementById('headlinesContainer');
    const topicNavigation = document.getElementById('topicNavigation');
    
    // Store topic data
    app.topicData = topicsData;
    
    // Show navigation and initialize
    topicNavigation.style.display = 'block';
    app.initializeTopicNavigation();
    
    console.log('🎯 Initialized section-by-section navigation for topics:', app.topicList);
}

// Function to create a topic section in the headlines container
function createTopicSection(topic, articles, isLive = true) {
    const headlinesContainer = document.getElementById('headlinesContainer');
    const topicSection = document.createElement('div');
    topicSection.className = 'topic-headlines';
    
    const topicInfo = getTopicInfo(topic);
    
    topicSection.innerHTML = `
        <h3>
            <span class="topic-headlines-icon">${topicInfo.icon}</span>
            ${topicInfo.name}
            <span class="${isLive ? 'live-indicator' : 'cached-indicator'}">
                ${isLive ? '🔴 LIVE' : '📦 CACHED'}
            </span>
        </h3>
        <div class="headlines-list" data-topic="${topic}">
            ${articles.slice(0, 5).map((article, index) => `
                <div class="headline-item" data-topic="${topic}" data-index="${index}">
                    <div class="headline-title">${article.title}</div>
                    <div class="headline-source">${article.source}</div>
                    ${article.url && article.url !== '#' ? `<div class="headline-url"><a href="${article.url}" target="_blank" style="color: #3b82f6; text-decoration: none; font-size: 0.85rem;">${article.url}</a></div>` : ''}
                </div>
            `).join('')}
        </div>
    `;
    
    headlinesContainer.appendChild(topicSection);
}

// Function to read articles from CSV file
async function loadArticlesFromCSV() {
    try {
        // Read the CSV file from the Flask server
        const response = await fetch('http://localhost:5001/articles.csv');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvText = await response.text();
        
        // Parse CSV data
        const articles = parseCSV(csvText);
        
        console.log(`Loaded ${articles.length} articles from CSV`);
        return articles;
    } catch (error) {
        console.error('Error loading CSV file:', error);
        throw error;
    }
}

// Robust CSV parser function that handles multi-line fields
function parseCSV(csvText) {
    const rows = parseCSVRows(csvText);
    
    if (rows.length === 0) {
        console.warn('No rows found in CSV');
        return [];
    }
    
    const headers = rows[0].map(h => h.trim().toLowerCase());
    console.log("Headers:", headers);
    
    const articles = [];
    
    for (let i = 1; i < rows.length; i++) {
        const values = rows[i];
        
        if (values.length >= headers.length) {
            const article = {};
            headers.forEach((header, index) => {
                article[header] = values[index] || '';
            });
            articles.push(article);
        }
    }
    
    console.log(`Parsed ${articles.length} articles from CSV`);
    return articles;
}

// Parse CSV rows handling multi-line quoted fields
function parseCSVRows(csvText) {
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < csvText.length) {
        const char = csvText[i];
        const nextChar = i + 1 < csvText.length ? csvText[i + 1] : null;
        
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Escaped quote within quoted field
                currentField += '"';
                i += 2; // Skip both quotes
                continue;
            } else if (inQuotes) {
                // End of quoted field
                inQuotes = false;
            } else {
                // Start of quoted field
                inQuotes = true;
            }
        } else if (char === ',' && !inQuotes) {
            // Field separator
            currentRow.push(currentField);
            currentField = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            // Row separator (only when not inside quotes)
            if (currentField || currentRow.length > 0) {
                currentRow.push(currentField);
                if (currentRow.some(field => field.length > 0)) {
                    rows.push(currentRow);
                }
                currentRow = [];
                currentField = '';
            }
            // Skip \r\n combination
            if (char === '\r' && nextChar === '\n') {
                i++;
            }
        } else {
            // Regular character
            currentField += char;
        }
        
        i++;
    }
    
    // Add the last field and row if there's content
    if (currentField || currentRow.length > 0) {
        currentRow.push(currentField);
        if (currentRow.some(field => field.length > 0)) {
            rows.push(currentRow);
        }
    }
    
    console.log(`Parsed ${rows.length} rows from CSV`);
    return rows;
}

// Fallback function for mock headlines (updated for section navigation)
function generateMockHeadlinesForTopics() {
    const app = window.yourBrieflyApp;
    const headlinesContainer = document.getElementById('headlinesContainer');
    
    // Prepare topics data for section navigation
    const topicsData = {};
    Array.from(app.selectedTopics).forEach(topic => {
        if (app.customTopics.has(topic)) {
            topicsData[topic] = app.generateMockHeadlinesForCustomTopic(topic);
        } else {
            const topicHeadlines = app.mockHeadlines[topic];
            if (topicHeadlines) {
                topicsData[topic] = topicHeadlines;
            }
        }
    });
    
    // Create section navigation
    createTopicSections(topicsData, false); // false = cached data
    
    updateGenerateButton();
}

function getTopicInfo(topic) {

    const app = window.yourBrieflyApp;

    const topicMap = {
        technology: { name: 'Technology', icon: '💻' },
        business: { name: 'Business', icon: '📈' },
        science: { name: 'Science', icon: '🔬' },
        health: { name: 'Health', icon: '🏥' },
        politics: { name: 'Politics', icon: '🏛️' },
        sports: { name: 'Sports', icon: '⚽' }
    };

    // Check if the topic is custom and exists in the app's custom topics
    if (app && app.customTopics.has(topic)) {
        return app.getCustomTopicInfo(topic);
    }

    return topicMap[topic] || { name: topic, icon: '📰' };
}

// Update the headline selection setup to handle both real and mock headlines
function setupHeadlineSelection() {
    const headlineItems = document.querySelectorAll('.headline-item');
    const app = window.yourBrieflyApp;
    
    headlineItems.forEach(item => {
        item.addEventListener('click', () => {
            const topic = item.dataset.topic;
            const index = parseInt(item.dataset.index);
            
            // Deselect other headlines in this topic
            const topicHeadlines = document.querySelectorAll(`.headline-item[data-topic="${topic}"]`);
            topicHeadlines.forEach(h => h.classList.remove('selected'));
            
            // Select this headline
            item.classList.add('selected');
            
            // Store selection (use real headlines if available, otherwise mock)
            const headlineData = app.realHeadlines && app.realHeadlines[topic] 
                ? app.realHeadlines[topic][index]
                : app.mockHeadlines[topic][index];
            
            app.selectedHeadlines.set(topic, {
                index: index,
                headline: headlineData
            });
            
            updateGenerateButton();
        });
    });
}

function updateGenerateButton() {
    const app = window.yourBrieflyApp;
    const generateBtn = document.getElementById('generateBtn');
    
    // Check if at least one headline is selected from each topic
    let hasSelectionsFromAllTopics = true;
    let totalSelections = 0;
    
    for (const topic of app.selectedTopics) {
        const selectedIndices = app.selectedHeadlines.get(topic) || [];
        if (selectedIndices.length === 0) {
            hasSelectionsFromAllTopics = false;
        }
        totalSelections += selectedIndices.length;
    }
    
    const generateNote = document.querySelector('.generate-note');
    if (generateBtn) {
        if (hasSelectionsFromAllTopics && totalSelections > 0) {
            generateBtn.classList.add('enabled');
            if (generateNote) {
                generateNote.textContent = `Ready to generate with ${totalSelections} selected articles`;
            }
        } else {
            generateBtn.classList.remove('enabled');
            if (generateNote) {
                generateNote.textContent = 'Select at least one article from each topic to continue';
            }
        }
    }
}

function generateBriefly() {
    const app = window.yourBrieflyApp;
    
    // Check if at least one headline is selected from each topic
    let hasSelectionsFromAllTopics = true;
    let totalSelections = 0;
    
    for (const topic of app.selectedTopics) {
        const selectedIndices = app.selectedHeadlines.get(topic) || [];
        if (selectedIndices.length === 0) {
            hasSelectionsFromAllTopics = false;
        }
        totalSelections += selectedIndices.length;
    }
    
    if (!hasSelectionsFromAllTopics) {
        showNotification('Please select at least one article from each topic', 'warning');
        return;
    }
    
    if (totalSelections === 0) {
        showNotification('Please select at least one article to generate your briefing', 'warning');
        return;
    }
    
    // Collect URLs from selected headlines
    const selectedUrls = [];
    for (const topic of app.selectedTopics) {
        const selectedIndices = app.selectedHeadlines.get(topic) || [];
        const topicData = app.topicData[topic] || [];
        
        selectedIndices.forEach(index => {
            const headline = topicData[index];
            if (headline && headline.url && headline.url !== '#') {
                selectedUrls.push(headline.url);
            }
        });
    }
    
    console.log('📋 Selected URLs for broadcast generation:', selectedUrls);
    
    const generateBtn = document.getElementById('generateBtn');
    const originalText = generateBtn.innerHTML;
    
    // Show progressive loading states
    const loadingStates = [
        { text: 'Analyzing your selections...', icon: '🔍' },
        { text: 'Gathering latest information...', icon: '📡' },
        { text: 'Crafting your personalized script...', icon: '✍️' },
        { text: 'Preparing AI narration...', icon: '🎙️' },
        { text: 'Generating audio broadcast...', icon: '🎧' }
    ];
    
    let currentState = 0;
    
    function updateLoadingState() {
        if (currentState < loadingStates.length) {
            const state = loadingStates[currentState];
            generateBtn.innerHTML = `
                <span class="btn-icon">${state.icon}</span>
                ${state.text}
                <span class="btn-shimmer"></span>
            `;
            currentState++;
            setTimeout(updateLoadingState, 750);
        } else {
            // Run the broadcast generation after all loading states
            runBroadcastGeneration(selectedUrls, originalText);
        }
    }
    
    function completeGeneration() {
        // Hide headlines section
        document.getElementById('headlinesSection').style.display = 'none';
        
        // Show generated briefing
        document.getElementById('generatedSection').style.display = 'block';
        
        // Update briefing metadata
        updateBriefingMetadata();
        
        // Populate summary
        populateBriefingSummary();
        
        // Update player status based on audio availability
        const app = window.yourBrieflyApp;
        const statusBadge = document.querySelector('.status-badge');
        if (statusBadge) {
            if (app.audioLoaded && app.audioElement) {
                statusBadge.textContent = 'Ready to Play';
                statusBadge.style.background = 'rgba(16, 185, 129, 0.2)';
                statusBadge.style.color = '#10b981';
            } else {
                statusBadge.textContent = 'Demo Mode';
                statusBadge.style.background = 'rgba(245, 158, 11, 0.2)';
                statusBadge.style.color = '#f59e0b';
            }
        }
        
        // Reset generate button
        generateBtn.innerHTML = originalText;
        generateBtn.disabled = false;
        
        // Scroll to generated section
        document.getElementById('generatedSection').scrollIntoView({ 
            behavior: 'smooth' 
        });
        
        // Show success with celebration
        showNotification('🎉 Your personalized briefing has been generated!', 'success');
        
        // Add celebration effect
        const successBadge = document.querySelector('.success-badge');
        if (successBadge) {
            successBadge.style.animation = 'celebrate 0.6s ease-out';
        }
    }
    
    async function runBroadcastGeneration(urls, originalButtonText) {
        try {
            if (urls.length === 0) {
                showNotification('⚠️ No valid URLs found. Using mock content for demo.', 'warning');
                completeGeneration();
                return;
            }
            
            // Check for API key before generating broadcast
            const app = window.yourBrieflyApp;
            const apiKey = app.getApiKey();
            
            if (!apiKey) {
                showNotification('⚠️ Gemini API key is required for broadcast generation. Please enter your API key in the configuration section.', 'warning');
                generateBtn.innerHTML = originalButtonText;
                generateBtn.disabled = false;
                return;
            }
            
            const validation = app.validateApiKey(apiKey);
            if (!validation) {
                showNotification('⚠️ Please enter a valid Gemini API key in the configuration section.', 'warning');
                generateBtn.innerHTML = originalButtonText;
                generateBtn.disabled = false;
                return;
            }
            
            // Update button to show broadcast generation
            generateBtn.innerHTML = `
                <span class="btn-icon">🎧</span>
                Generating audio broadcast...
                <span class="btn-shimmer"></span>
            `;
            
            showNotification('🎙️ Generating your personalized audio broadcast...', 'info');

            const briefingLength = app.getBriefingLength();
            
            // Call the broadcast generation API
            const response = await fetch('http://localhost:5001/api/generate-broadcast', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    urls: urls,
                    api_key: apiKey,
                    duration: briefingLength,
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Broadcast generation error:', errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                showNotification('✅ Audio broadcast generated successfully!', 'success');
                
                // Load the generated audio file
                const app = window.yourBrieflyApp;
                const audioUrl = 'http://localhost:5001/Broadcast.wav?t=' + Date.now(); // Add timestamp to prevent caching
                app.loadAudioFile(audioUrl);
                
                completeGeneration();
            } else {
                throw new Error(result.error || 'Unknown error occurred');
            }
            
        } catch (error) {
            console.error('Error generating broadcast:', error);
            showNotification('⚠️ Error generating audio broadcast. Showing demo interface.', 'warning');
            
            // Reset button
            generateBtn.innerHTML = originalButtonText;
            generateBtn.disabled = false;
            
            // Still show the generated section for demo purposes
            completeGeneration();
        }
    }
    
    generateBtn.disabled = true;
    updateLoadingState();
}

function updateBriefingMetadata() {
    const app = window.yourBrieflyApp;
    const titleElement = document.getElementById('briefingTitle');
    const metaElement = document.getElementById('briefingMeta');
    const lengthSlider = document.getElementById('briefingLength');
    const voiceSelect = document.getElementById('voiceStyle');
    
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    if (titleElement) {
        titleElement.textContent = `Daily Briefly - ${dateStr}`;
    }
    
    if (metaElement) {
        const duration = lengthSlider.value;
        const voice = voiceSelect.options[voiceSelect.selectedIndex].text;
        const topicCount = app.selectedTopics.size;
        
        metaElement.textContent = `${duration} minutes • ${voice} • ${topicCount} topics`;
    }
    
    // Update total time display
    app.totalTime = parseInt(lengthSlider.value) * 60;
    app.updateTotalTimeDisplay();
}

function populateBriefingSummary() {
    const app = window.yourBrieflyApp;
    const summaryContainer = document.getElementById('summaryTopics');
    
    if (!summaryContainer) return;
    
    summaryContainer.innerHTML = '';
    
    // Iterate through each selected topic
    app.selectedTopics.forEach(topic => {
        const selectedIndices = app.selectedHeadlines.get(topic) || [];
        
        if (selectedIndices.length === 0) return;
        
        const topicInfo = getTopicInfo(topic);
        const topicData = app.topicData[topic] || [];
        
        const summaryItem = document.createElement('div');
        summaryItem.className = 'summary-topic';
        
        // Create headlines list for this topic
        const headlinesList = selectedIndices.map(index => {
            const headline = topicData[index];
            return headline ? `<li>${headline.title}</li>` : '';
        }).filter(html => html).join('');
        
        summaryItem.innerHTML = `
            <h4>${topicInfo.icon} ${topicInfo.name}</h4>
            <div class="selected-headlines">
                <p class="selection-count">${selectedIndices.length} article${selectedIndices.length > 1 ? 's' : ''} selected:</p>
                <ul class="headlines-list">
                    ${headlinesList}
                </ul>
            </div>
        `;
        
        summaryContainer.appendChild(summaryItem);
    });
}

// Player control functions
function togglePlayback() {
    const app = window.yourBrieflyApp;
    const playBtn = document.getElementById('playBtn');
    const playIcon = playBtn.querySelector('.play-icon');
    
    if (app.isPlaying) {
        app.pausePlayback();
    } else {
        app.playBriefly();
    }
}

function seekBackward() {
    const app = window.yourBrieflyApp;
    
    if (app.audioLoaded && app.audioElement) {
        app.audioElement.currentTime = Math.max(0, app.audioElement.currentTime - 15);
    } else {
        app.currentTime = Math.max(0, app.currentTime - 15);
        app.updateProgress();
    }
}

function seekForward() {
    const app = window.yourBrieflyApp;
    
    if (app.audioLoaded && app.audioElement) {
        app.audioElement.currentTime = Math.min(app.audioElement.duration, app.audioElement.currentTime + 15);
    } else {
        app.currentTime = Math.min(app.totalTime, app.currentTime + 15);
        app.updateProgress();
    }
}

function adjustSpeed() {
    const app = window.yourBrieflyApp;
    const speedBtn = event.target;
    
    const speeds = [1.0, 1.25, 1.5, 2.0];
    const currentIndex = speeds.indexOf(app.playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    
    app.playbackSpeed = speeds[nextIndex];
    speedBtn.textContent = `${app.playbackSpeed}x`;
    
    // Apply speed to real audio element if loaded
    if (app.audioLoaded && app.audioElement) {
        app.audioElement.playbackRate = app.playbackSpeed;
    }
}

// Feature button functions
function downloadBriefly() {
    const app = window.yourBrieflyApp;
    
    if (app.audioLoaded && app.audioElement && app.audioElement.src) {
        // Download the actual audio file
        const link = document.createElement('a');
        link.href = app.audioElement.src;
        link.download = 'Briefly_AI_Broadcast.wav';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification('📱 Audio file downloaded!', 'success');
    } else {
        showNotification('Download feature coming soon! Audio file not available.', 'info');
    }
}

function shareBriefly() {
    if (navigator.share) {
        navigator.share({
            title: 'My Briefly.AI Briefing',
            text: 'Check out my personalized news briefing!',
            url: window.location.href
        });
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(window.location.href);
        showNotification('Link copied to clipboard!', 'success');
    }
}

function addToPlaylist() {
    showNotification('Saved to your playlist!', 'success');
}

function regenerateBriefly() {
    const confirmRegen = confirm('Are you sure you want to regenerate your briefing? This will create a new version.');
    if (confirmRegen) {
        showNotification('Regenerating your briefing...', 'info');
        setTimeout(() => {
            showNotification('Your briefing has been regenerated!', 'success');
        }, 2000);
    }
}

function createAnother() {
    // Reset the app state and go back to topic selection
    const app = window.yourBrieflyApp;
    
    // Clear selections
    app.selectedTopics.clear();
    app.selectedHeadlines.clear();
    app.currentTime = 0;
    app.isPlaying = false;
    
    // Reset UI
    document.querySelectorAll('.topic-card').forEach(card => {
        card.classList.remove('selected');
        card.querySelector('input[type="checkbox"]').checked = false;
    });
    
    // Show topic selection, hide others
    document.querySelector('.topic-selection').style.display = 'block';
    document.getElementById('headlinesSection').style.display = 'none';
    document.getElementById('generatedSection').style.display = 'none';
    
    // Update buttons
    app.updateContinueButton();
    
    // Scroll to top
    document.querySelector('.topic-selection').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

function scheduleBriefly() {
    showNotification('Scheduling feature coming soon! You\'ll be able to set up automatic daily briefings.', 'info');
}

// Extend the YourBrieflyApp class with player methods
YourBrieflyApp.prototype.playBriefly = function() {
    this.isPlaying = true;
    const playBtn = document.getElementById('playBtn');
    const playIcon = playBtn.querySelector('.play-icon');
    
    playIcon.textContent = '⏸️';
    
    // Use real audio if loaded, otherwise fall back to mock timer
    if (this.audioLoaded && this.audioElement) {
        this.audioElement.play().catch(error => {
            console.error('Error playing audio:', error);
            showNotification('Error playing audio', 'warning');
            this.pausePlayback();
        });
    } else {
        // Fallback to mock timer for demo purposes
        this.startProgressTimer();
        showNotification('Playing demo briefing (no audio file loaded)...', 'info');
    }
};

YourBrieflyApp.prototype.pausePlayback = function() {
    this.isPlaying = false;
    const playBtn = document.getElementById('playBtn');
    const playIcon = playBtn.querySelector('.play-icon');
    
    playIcon.textContent = '▶️';
    
    // Pause real audio if loaded, otherwise stop mock timer
    if (this.audioLoaded && this.audioElement) {
        this.audioElement.pause();
    } else {
        this.stopProgressTimer();
    }
};

// Add this function to check if the Flask server is running
async function checkServerHealth() {
    try {
        const response = await fetch('http://localhost:5001/health', {
            method: 'GET',
            timeout: 5000 // 5 second timeout
        });
        return response.ok;
    } catch (error) {
        console.log('Flask server is not running:', error.message);
        return false;
    }
}

// Utility function for notifications
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notif => notif.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Different styles for different types
    if (type === 'success') {
        notification.style.background = 'linear-gradient(45deg, #10b981, #3b82f6)';
    } else if (type === 'warning') {
        notification.style.background = 'linear-gradient(45deg, #f59e0b, #ef4444)';
    } else if (type === 'info') {
        notification.style.background = 'linear-gradient(45deg, #3b82f6, #8b5cf6)';
    }
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// Add CSS for live and cached indicators
const additionalStyles = `
    .live-indicator {
        font-size: 0.8rem;
        color: #ef4444;
        margin-left: 10px;
        animation: pulse 2s infinite;
    }
    
    .cached-indicator {
        font-size: 0.8rem;
        color: #f59e0b;
        margin-left: 10px;
    }
    
    .headline-summary {
        font-size: 0.9rem;
        color: #94a3b8;
        margin-top: 5px;
        font-style: italic;
    }
    
    .headlines-loading {
        text-align: center;
        padding: 40px;
        color: #cbd5e1;
        font-size: 1.1rem;
    }
    
    .headlines-loading::after {
        content: '⏳';
        animation: spin 1s linear infinite;
        margin-left: 10px;
    }
    
    .cancel-btn {
        margin-top: 20px;
        padding: 10px 20px;
        background: linear-gradient(45deg, #f59e0b, #ef4444);
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.9rem;
        transition: transform 0.2s ease;
    }
    
    .cancel-btn:hover {
        transform: translateY(-2px);
    }
    
    .progress-dots {
        margin-top: 10px;
        font-size: 1.5rem;
        color: #3b82f6;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }
`;

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// Add smooth transitions and enhanced user experience
document.addEventListener('DOMContentLoaded', function() {
    // Add fade-in animation for page sections
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe all sections for fade-in animation
    document.querySelectorAll('section').forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(section);
    });
    
    // Add loading animation to topic cards
    document.querySelectorAll('.topic-card').forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        card.classList.add('animate-in');
    });
});

// Enhance the page with some additional interactive features
function addInteractiveFeatures() {
    // Add hover sound effects (visual feedback)
    document.querySelectorAll('.topic-card, .headline-item, .control-btn').forEach(element => {
        element.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-3px) scale(1.02)';
        });
        
        element.addEventListener('mouseleave', function() {
            this.style.transform = '';
        });
    });
    
    // Add keyboard navigation support
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            // Only handle escape if user is not interacting with the player
            const generateSection = document.getElementById('generatedSection');
            const headlinesSection = document.getElementById('headlinesSection');
            
            // Check if user is currently playing audio - don't interrupt
            const app = window.yourBrieflyApp;
            if (app && app.isPlaying) {
                return; // Don't handle escape while audio is playing
            }
            
            // If audio is loaded but not playing, be extra careful about navigation
            if (generateSection && generateSection.style.display !== 'none') {
                // If audio is loaded, make confirmation more explicit and harder to accidentally trigger
                if (app && app.audioLoaded) {
                    // Double confirmation for loaded audio to prevent accidental navigation
                    const firstConfirm = confirm('⚠️ You have generated audio ready to play.\n\nAre you sure you want to go back to topic selection?\nThis will reset your briefing and you\'ll lose your generated audio.');
                    if (firstConfirm) {
                        const secondConfirm = confirm('🔄 Final confirmation:\n\nThis will permanently reset your briefing.\nClick OK only if you really want to start over.');
                        if (secondConfirm) {
                            createAnother();
                        }
                    }
                } else {
                    // Standard confirmation for non-audio content
                    if (confirm('Are you sure you want to go back to topic selection? This will reset your briefing.')) {
                        createAnother();
                    }
                }
            } else if (headlinesSection && headlinesSection.style.display !== 'none') {
                document.querySelector('.topic-selection').style.display = 'block';
                headlinesSection.style.display = 'none';
            }
        }
        
        if (e.key === ' ' || e.key === 'Spacebar') {
            // Space bar to play/pause if on player section
            const playerSection = document.getElementById('generatedSection');
            if (playerSection && playerSection.style.display !== 'none') {
                e.preventDefault();
                togglePlayback();
            }
        }
    });
}

// Call the enhancement function after DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addInteractiveFeatures);
} else {
    addInteractiveFeatures();
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', function() {
    window.yourBrieflyApp = new YourBrieflyApp();
});
