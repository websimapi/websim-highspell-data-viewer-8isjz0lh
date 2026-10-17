// Data store to hold all loaded JSON data
const dataStore = {
    specialcoordinatesdefs: null,
    pickpocketdefs: null,
    worldentitylootdefs: null,
    spelldefs: null,
    questdefs: null,
    npcentitydefs: null,
    npcloot: null,
    shopdefs: null,
    currentSource: null,
    currentData: null,
    currentView: 'table',
    selectedItem: null
};

// Make dataStore globally accessible to fix the reference error in npcRenderer.js
window.dataStore = dataStore;

// AI Assistant
const aiAssistant = {
    conversationHistory: [],
    isProcessing: false,
    
    async processQuery(query) {
        this.isProcessing = true;
        
        const newMessage = {
            role: "user",
            content: query
        };
        
        this.conversationHistory.push(newMessage);
        this.conversationHistory = this.conversationHistory.slice(-10);
        
        try {
            const completion = await websim.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `You are an AI assistant specializing in game data analysis. Help users understand and strategize based on the game data.
                        The following JSON data structures are available:
                        - specialcoordinatesdefs: Special locations in the game world
                        - pickpocketdefs: Items that can be pickpocketed
                        - worldentitylootdefs: Loot from world entities
                        - spelldefs: Information about spells and their effects
                        - questdefs: Quest information
                        - npcentitydefs: NPC information
                        - npcloot: Loot tables for NPCs
                        - shopdefs: Items available in shops
                        
                        When asked a question, use your knowledge of RPG games to provide insights, suggest strategies, or analyze relationships between game elements.
                        If asked to perform analysis on specific data, explain how you would approach it.
                        Always provide specific, actionable advice when possible.`
                    },
                    ...this.conversationHistory
                ]
            });
            
            this.conversationHistory.push(completion);
            this.isProcessing = false;
            return completion.content;
        } catch (error) {
            console.error("Error processing query:", error);
            this.isProcessing = false;
            return "Sorry, I encountered an error processing your request. Please try again.";
        }
    },
    
    async analyzeData(dataSource, filter = null) {
        try {
            let dataToAnalyze = dataStore[dataSource];
            if (!dataToAnalyze) {
                return "No data available for analysis.";
            }
            
            if (filter) {
                // Apply filter if provided
                dataToAnalyze = this.filterData(dataToAnalyze, filter);
            }
            
            // Create a stringified version of the data with size limits
            const dataSample = JSON.stringify(
                Array.isArray(dataToAnalyze) 
                    ? dataToAnalyze.slice(0, 10) 
                    : dataToAnalyze
            ).substring(0, 4000) + "...";
            
            const prompt = `Analyze this ${dataSource} data and provide insights: ${dataSample}`;
            
            const completion = await websim.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `You are a data analysis assistant. Examine the provided game data sample and identify patterns, strategies, or interesting insights. Focus on what would be most valuable to a player.`
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            });
            
            return completion.content;
        } catch (error) {
            console.error("Error analyzing data:", error);
            return "Sorry, I encountered an error analyzing this data. Please try with a smaller dataset or a different query.";
        }
    },
    
    async suggestStrategies(dataSource, item) {
        // Enhanced analysis for pickpocket items
        if (dataSource === 'pickpocketdefs' && item._id) {
            try {
                const prompt = `
Analyze this pickpocketing target data from an RPG game and suggest optimal strategies:
${JSON.stringify(item)}

Consider:
1. Required crime level vs potential rewards
2. Risk/reward ratio (stun damage vs loot value)
3. Tips for optimizing pickpocketing this target
4. Comparison to other similar level targets if relevant
5. Any rare loot worth targeting
`;
                
                const completion = await websim.chat.completions.create({
                    messages: [
                        {
                            role: "system",
                            content: `You are a game strategy advisor specializing in RPG mechanics. Provide specific, actionable advice for pickpocketing in games, focusing on efficiency, risk management, and optimal progression. Format your response with clear headings and bullet points.`
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ]
                });
                
                return completion.content;
            } catch (error) {
                console.error("Error suggesting pickpocket strategies:", error);
                return "Sorry, I couldn't generate strategies for this item. Please try with a different item.";
            }
        }
        
        // For other data types, use the original logic
        try {
            const prompt = `Suggest strategies for a player related to this ${dataSource} item: ${JSON.stringify(item)}`;
            
            const completion = await websim.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `You are a game strategy advisor. Provide specific, actionable advice for players based on the given game item data. Consider optimal usage, combinations with other game elements, and potential pitfalls.`
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            });
            
            return completion.content;
        } catch (error) {
            console.error("Error suggesting strategies:", error);
            return "Sorry, I couldn't generate strategies for this item. Please try with a different item.";
        }
    },
    
    // Added missing filterData function
    filterData(data, filter) {
        if (!Array.isArray(data)) return data;
        
        return data.filter(item => {
            for (const key in filter) {
                if (item[key] !== filter[key]) {
                    return false;
                }
            }
            return true;
        });
    }
};

// Make aiAssistant globally accessible
window.aiAssistant = aiAssistant;

// Import the spell renderer module
import { initSpellRenderer, renderSpells } from './spellRenderer.js';

// Import the NPC renderer module
import { initNpcRenderer, renderNpcs } from './npcRenderer.js';

// Import the new loot renderer module
import { initLootRenderer, renderLootTables } from './lootRenderer.js';

// Import the new shop renderer module
import { initShopRenderer, renderShops } from './shopRenderer.js';

// Add new utility function
function formatPercentage(value, precision = 4) {
    // Convert to percentage by multiplying by 100
    const percentage = value * 100;
    
    // Determine appropriate precision based on value size
    if (percentage < 0.01) {
        return percentage.toFixed(precision) + '%';
    } else if (percentage < 0.1) {
        return percentage.toFixed(3) + '%';
    } else if (percentage < 1) {
        return percentage.toFixed(2) + '%';
    } else if (percentage < 10) {
        return percentage.toFixed(1) + '%';
    } else {
        return Math.round(percentage) + '%';
    }
}

// Initialize the application
async function initApp() {
    setupEventListeners();
    try {
        await loadAllData();
        updateDataSourcesList();
        
        // Initialize with a placeholder
        document.getElementById('resultsContainer').innerHTML = `
            <div class="placeholder-message">
                <i class="bi bi-database-gear"></i>
                <h3>Select a data source or ask a question</h3>
                <p>Use the sidebar to browse data sources or type a query to search across all data.</p>
            </div>
        `;
        
        // Initialize renderers
        initNpcRenderer();
        initSpellRenderer();
        initLootRenderer();
        initShopRenderer();
    } catch (error) {
        console.error("Failed to initialize app:", error);
        showNotification("Failed to load application data. Please refresh the page.", "error");
    }
}

// Set up event listeners
function setupEventListeners() {
    // Initialize the spell renderer
    initSpellRenderer();
    
    // Sidebar toggle
    document.getElementById('toggleSidebar').addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('collapsed');
    });
    
    // Data source selection - FIX: Make the entire li element clickable including the count in parentheses
    document.getElementById('dataSources').addEventListener('click', (e) => {
        // Find the closest li parent element no matter where the user clicked within it
        const listItem = e.target.closest('li');
        if (listItem) {
            const source = listItem.getAttribute('data-source');
            selectDataSource(source);
            
            // Update active class
            document.querySelectorAll('#dataSources li').forEach(li => {
                li.classList.remove('active');
            });
            listItem.classList.add('active');
        }
    });
    
    // View toggles
    document.getElementById('tableView').addEventListener('click', () => setView('table'));
    document.getElementById('cardView').addEventListener('click', () => setView('card'));
    document.getElementById('chartView').addEventListener('click', () => setView('chart'));
    document.getElementById('mapView').addEventListener('click', () => setView('map')); // Add map view toggle
    
    // AI Assistant toggle
    document.getElementById('toggleAIAssistant').addEventListener('click', toggleAIAssistant);
    document.getElementById('closeAssistant').addEventListener('click', toggleAIAssistant);
    
    // Search functionality
    document.getElementById('searchButton').addEventListener('click', performSearch);
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
    
    // AI chat
    document.getElementById('sendToAI').addEventListener('click', sendMessageToAI);
    document.getElementById('assistantInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessageToAI();
    });
    
    // Saved queries
    document.getElementById('saveCurrentQuery').addEventListener('click', saveCurrentQuery);
    
    // Export and Import query buttons
    document.getElementById('exportQueries').addEventListener('click', exportQueriesToFile);
    document.getElementById('importQueries').addEventListener('click', triggerImportQueriesFile);
    document.getElementById('importQueriesFile').addEventListener('change', handleImportQueriesFile);
    
    // Play button functionality
    document.getElementById('playButton').addEventListener('click', function(e) {
        e.preventDefault();
        
        // Check if solo client is already running but hidden
        const gameClient = document.getElementById('gameClientContainer');
        const gameIframe = document.getElementById('gameIframe');
        
        // Check if multi-client is already running but hidden
        const multiClient = document.getElementById('multiClientContainer');
        const hasMultiClientContent = multiClient.querySelector('#iframe-grid') && 
                                      multiClient.querySelector('#iframe-grid').children.length > 0;
        
        // If solo client is already loaded, just show it again
        if (gameIframe.src && gameIframe.src.includes('highspell.com')) {
            gameClient.classList.add('open');
            return;
        }
        
        // If multi-client is already loaded, just show it again
        if (hasMultiClientContent) {
            multiClient.classList.add('open');
            return;
        }
        
        // If no active sessions, show the game mode selector
        document.getElementById('gameModeSelector').style.display = 'flex';
    });

    // Solo mode selection
    document.getElementById('soloMode').addEventListener('click', function() {
        // Hide the game mode selector
        document.getElementById('gameModeSelector').style.display = 'none';
        
        // Open the solo client
        const gameClient = document.getElementById('gameClientContainer');
        gameClient.classList.add('open');
        
        // Set the iframe source
        document.getElementById('gameIframe').src = 'https://highspell.com';
        
        // Add map button if it doesn't exist already
        if (!gameClient.querySelector('.play-mode-map-button')) {
            const mapButton = document.createElement('button');
            mapButton.className = 'play-mode-map-button';
            mapButton.innerHTML = '<i class="bi bi-map"></i>';
            mapButton.title = "Open Map";
            mapButton.addEventListener('click', function() {
                // Remember we were in solo mode
                previousPlayMode = 'solo';
                // Hide the game client
                gameClient.classList.remove('open');
                // Show the map
                document.getElementById('mapIframeContainer').classList.add('open');
            });
            gameClient.appendChild(mapButton);
        }
    });

    // Multi mode selection
    document.getElementById('multiMode').addEventListener('click', function() {
        // Hide the game mode selector
        document.getElementById('gameModeSelector').style.display = 'none';
        
        // Generate and open the multi-client interface
        generateMultiClientInterface();
    });

    // Close buttons
    document.getElementById('closeGameClient').addEventListener('click', function() {
        // Close the solo client
        document.getElementById('gameClientContainer').classList.remove('open');
        
        // DO NOT clear the iframe source to allow session resumption
        // Removed: document.getElementById('gameIframe').src = '';
    });

    document.getElementById('cancelPlayMode').addEventListener('click', function() {
        // Hide the game mode selector
        document.getElementById('gameModeSelector').style.display = 'none';
    });
}

let previousPlayMode = null;

// Load all JSON data
async function loadAllData() {
    try {
        showLoading(true);
        
        const sources = [
            'specialcoordinatesdefs',
            'pickpocketdefs',
            'worldentitylootdefs',
            'spelldefs',
            'questdefs',
            'npcentitydefs',
            'npcloot',
            'shopdefs'
        ];
        
        const promises = sources.map(source => 
            fetch(`./${source}.json`) 
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    dataStore[source] = data;
                    return { source, success: true };
                })
                .catch(error => {
                    console.error(`Error loading ${source}:`, error);
                    return { source, success: false };
                })
        );
        
        const results = await Promise.all(promises);
        
        const failedSources = results
            .filter(result => !result.success)
            .map(result => result.source);
        
        if (failedSources.length > 0) {
            showNotification(`Failed to load: ${failedSources.join(', ')}`, 'error');
        } else {
            showNotification('All data loaded successfully', 'success');
        }
    } catch (error) {
        console.error('Error loading data:', error);
        showNotification('Error loading data', 'error');
        throw error; 
    } finally {
        showLoading(false);
    }
}

// Update the data sources list with loading status
function updateDataSourcesList() {
    const dataSourcesList = document.getElementById('dataSources');
    const sources = dataSourcesList.querySelectorAll('li');
    
    sources.forEach(source => {
        const sourceId = source.getAttribute('data-source');
        if (dataStore[sourceId]) {
            source.classList.add('loaded');
            
            // Add count of items if it's an array
            if (Array.isArray(dataStore[sourceId])) {
                const count = dataStore[sourceId].length;
                source.innerHTML = `${source.textContent.split(' ')[0]} <span class="count">(${count})</span>`;
            }
        } else {
            source.classList.add('error');
        }
    });
}

// Select and display a data source
function selectDataSource(source) {
    if (!dataStore[source]) {
        showNotification(`Data source ${source} is not loaded`, 'error');
        return;
    }
    
    dataStore.currentSource = source;
    dataStore.currentData = dataStore[source];
    
    // Show mapView button only for specialcoordinatesdefs
    if (source === 'specialcoordinatesdefs') {
        document.getElementById('mapView').style.display = 'inline-block';
        // Auto-switch to map view for coordinates
        setView('map');
    } else {
        document.getElementById('mapView').style.display = 'none';
        // Switch to table view for other data types
        if (dataStore.currentView === 'map') {
            setView('table');
        } else {
            renderData();
        }
    }
    
    // Automatically get AI insights for the selected data
    if (document.querySelector('.ai-assistant').classList.contains('open')) {
        getDataInsights(source);
    }
}

// Render data based on the current view
function renderData() {
    const resultsContainer = document.getElementById('resultsContainer');
    resultsContainer.innerHTML = '';
    
    if (!dataStore.currentData) {
        resultsContainer.innerHTML = `
            <div class="placeholder-message">
                <i class="bi bi-database-x"></i>
                <h3>No data selected</h3>
                <p>Please select a data source from the sidebar.</p>
            </div>
        `;
        return;
    }
    
    const data = dataStore.currentData;
    
    // Special handling for quest data
    if (dataStore.currentSource === 'questdefs') {
        renderQuestView(data, resultsContainer);
        return;
    }
    
    // Special handling for spell data
    if (dataStore.currentSource === 'spelldefs') {
        renderSpells(data, resultsContainer);
        return;
    }
    
    // Special handling for NPC data
    if (dataStore.currentSource === 'npcentitydefs') {
        renderNpcView(data, resultsContainer);
        return;
    }
    
    // Special handling for pickpocket data
    if (dataStore.currentSource === 'pickpocketdefs' && data.pickpocketing) {
        renderPickpocketView(data, resultsContainer);
        return;
    }
    
    // Special handling for world entity loot data
    if (dataStore.currentSource === 'worldentitylootdefs') {
        renderWorldEntityLootView(data, resultsContainer);
        return;
    }
    
    // Special handling for NPC loot tables
    if (dataStore.currentSource === 'npcloot') {
        renderLootTables(data, resultsContainer);
        return;
    }
    
    // Special handling for shop data
    if (dataStore.currentSource === 'shopdefs') {
        renderShops(data, resultsContainer);
        return;
    }
    
    switch (dataStore.currentView) {
        case 'table':
            renderTableView(data, resultsContainer);
            break;
        case 'card':
            renderCardView(data, resultsContainer);
            break;
        case 'chart':
            renderChartView(data, resultsContainer);
            break;
        case 'map':
            renderMapView(data, resultsContainer);
            break;
    }
}

// Render the treasure map coordinates on a canvas
function renderMapView(data, container) {
    if (!data || !data.treasureMapCoordinates) {
        container.innerHTML = `
            <div class="placeholder-message">
                <i class="bi bi-exclamation-triangle"></i>
                <h3>Map data not available</h3>
                <p>This data source does not contain mappable coordinates.</p>
            </div>
        `;
        return;
    }
    
    // Create map interface
    const mapInterface = document.createElement('div');
    mapInterface.className = 'map-interface';
    
    // Create map controls
    const mapControls = document.createElement('div');
    mapControls.className = 'map-controls';
    mapControls.innerHTML = `
        <div class="map-selector">
            <label for="mapSelect">Select Treasure Map:</label>
            <select id="mapSelect" class="form-control">
                <option value="treasureMap1">Treasure Map 1</option>
                <option value="treasureMap2">Treasure Map 2</option>
                <option value="treasureMap3">Treasure Map 3</option>
            </select>
        </div>
        <div class="zoom-controls">
            <button id="zoomIn" class="btn btn-sm btn-outline-primary"><i class="bi bi-zoom-in"></i></button>
            <button id="zoomOut" class="btn btn-sm btn-outline-primary"><i class="bi bi-zoom-out"></i></button>
            <button id="resetView" class="btn btn-sm btn-outline-secondary"><i class="bi bi-arrow-counterclockwise"></i></button>
        </div>
        <div class="legend">
            <div class="legend-item">
                <div class="legend-marker level-0"></div>
                <span>Level 0</span>
            </div>
            <div class="legend-item">
                <div class="legend-marker level-1"></div>
                <span>Level 1</span>
            </div>
        </div>
    `;
    
    // Create map container
    const mapContainer = document.createElement('div');
    mapContainer.className = 'map-container';
    mapContainer.innerHTML = `<canvas id="mapCanvas"></canvas>`;
    
    // Create info panel
    const infoPanel = document.createElement('div');
    infoPanel.className = 'map-info-panel';
    infoPanel.innerHTML = `
        <h4>Coordinates Info</h4>
        <div id="coordInfo">Select a point on the map to see details</div>
    `;
    
    // Add elements to interface
    mapInterface.appendChild(mapControls);
    mapInterface.appendChild(mapContainer);
    mapInterface.appendChild(infoPanel);
    container.appendChild(mapInterface);
    
    // Render initial map
    const initialMap = 'treasureMap1';
    renderCoordinatesOnMap(data.treasureMapCoordinates[initialMap], initialMap);
    
    // Set up event listeners for map controls
    document.getElementById('mapSelect').addEventListener('change', (e) => {
        const selectedMap = e.target.value;
        renderCoordinatesOnMap(data.treasureMapCoordinates[selectedMap], selectedMap);
    });
    
    document.getElementById('zoomIn').addEventListener('click', () => {
        const canvas = document.getElementById('mapCanvas');
        const mapData = canvas.mapData;
        mapData.scale *= 1.2;
        renderCoordinatesOnMap(data.treasureMapCoordinates[mapData.currentMap], mapData.currentMap, mapData);
    });
    
    document.getElementById('zoomOut').addEventListener('click', () => {
        const canvas = document.getElementById('mapCanvas');
        const mapData = canvas.mapData;
        mapData.scale /= 1.2;
        renderCoordinatesOnMap(data.treasureMapCoordinates[mapData.currentMap], mapData.currentMap, mapData);
    });
    
    document.getElementById('resetView').addEventListener('click', () => {
        const selectedMap = document.getElementById('mapSelect').value;
        renderCoordinatesOnMap(data.treasureMapCoordinates[selectedMap], selectedMap);
    });
}

// Render coordinates on the map canvas
function renderCoordinatesOnMap(coordinates, mapName, existingMapData = null) {
    const canvas = document.getElementById('mapCanvas');
    const ctx = canvas.getContext('2d');
    
    // Clear any existing map data
    let mapData = existingMapData || {
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        isDragging: false,
        lastX: 0,
        lastY: 0,
        currentMap: mapName,
        selectedPoint: null
    };
    
    // Set canvas size
    const canvasContainer = canvas.parentElement;
    canvas.width = canvasContainer.clientWidth;
    canvas.height = 600; // Fixed height for the map
    
    // Store map data for interactions
    canvas.mapData = mapData;
    
    // Find min/max coordinates to calculate the bounds
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    coordinates.forEach(coord => {
        minX = Math.min(minX, coord.x);
        maxX = Math.max(maxX, coord.x);
        minY = Math.min(minY, coord.y);
        maxY = Math.max(maxY, coord.y);
    });
    
    // Add padding
    const padding = 50;
    minX -= padding;
    maxX += padding;
    minY -= padding;
    maxY += padding;
    
    // Calculate scale to fit all points
    const dataWidth = maxX - minX;
    const dataHeight = maxY - minY;
    const scaleX = canvas.width / dataWidth;
    const scaleY = canvas.height / dataHeight;
    
    // Use the smaller scale to ensure all points fit
    const baseScale = Math.min(scaleX, scaleY);
    
    // Apply user scaling
    const scale = baseScale * mapData.scale;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background grid
    drawGrid(ctx, canvas.width, canvas.height, scale, minX, minY, mapData.offsetX, mapData.offsetY);
    
    // Draw the title
    ctx.fillStyle = '#e0e0e0';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Treasure Map: ${mapName.replace('treasureMap', '')}`, canvas.width / 2, 30);
    
    // Load treasure map icon
    const mapIcon = new Image();
    mapIcon.src = 'treasure_map_icon.png';
    const chestIcon = new Image();
    chestIcon.src = 'treasure_chest.png';
    
    // Wait for images to load
    Promise.all([
        new Promise(resolve => { mapIcon.onload = resolve; }),
        new Promise(resolve => { chestIcon.onload = resolve; })
    ]).then(() => {
        // Draw map points
        coordinates.forEach((coord, index) => {
            // Calculate screen coordinates
            const screenX = (coord.x - minX) * scale + mapData.offsetX;
            const screenY = (coord.y - minY) * scale + mapData.offsetY;
            
            // Select icon based on level
            const icon = coord.level === 0 ? chestIcon : mapIcon;
            const iconSize = 24;
            
            // Draw the icon
            ctx.drawImage(
                icon, 
                screenX - iconSize/2, 
                screenY - iconSize/2,
                iconSize,
                iconSize
            );
            
            // If this point is selected, highlight it
            if (mapData.selectedPoint === index) {
                ctx.strokeStyle = '#ffcc00';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(screenX, screenY, iconSize/2 + 5, 0, Math.PI * 2);
                ctx.stroke();
            }
            
            // Store screen coordinates for interaction
            coord.screenX = screenX;
            coord.screenY = screenY;
        });
    });
    
    // Set up map interaction events if not already set
    if (!canvas.hasInteractionEvents) {
        // Mouse down for dragging
        canvas.addEventListener('mousedown', (e) => {
            const mapData = canvas.mapData;
            mapData.isDragging = true;
            mapData.lastX = e.offsetX;
            mapData.lastY = e.offsetY;
        });
        
        // Mouse move for dragging and hovering
        canvas.addEventListener('mousemove', (e) => {
            const mapData = canvas.mapData;
            const coords = dataStore.currentData.treasureMapCoordinates[mapData.currentMap];
            
            if (mapData.isDragging) {
                // Calculate drag distance
                const deltaX = e.offsetX - mapData.lastX;
                const deltaY = e.offsetY - mapData.lastY;
                
                // Update offset
                mapData.offsetX += deltaX;
                mapData.offsetY += deltaY;
                
                // Update last position
                mapData.lastX = e.offsetX;
                mapData.lastY = e.offsetY;
                
                // Redraw the map
                renderCoordinatesOnMap(coords, mapData.currentMap, mapData);
            } else {
                // Check if hovering over a point
                canvas.style.cursor = 'default';
                for (let i = 0; i < coords.length; i++) {
                    const coord = coords[i];
                    const distance = Math.sqrt(
                        Math.pow(e.offsetX - coord.screenX, 2) + 
                        Math.pow(e.offsetY - coord.screenY, 2)
                    );
                    
                    if (distance < 12) {
                        canvas.style.cursor = 'pointer';
                        break;
                    }
                }
            }
        });
        
        // Mouse up to stop dragging
        canvas.addEventListener('mouseup', () => {
            canvas.mapData.isDragging = false;
        });
        
        // Mouse leave to stop dragging
        canvas.addEventListener('mouseleave', () => {
            canvas.mapData.isDragging = false;
        });
        
        // Click to select a point
        canvas.addEventListener('click', (e) => {
            const mapData = canvas.mapData;
            if (mapData.isDragging) return; // Don't select when dragging
            
            const coords = dataStore.currentData.treasureMapCoordinates[mapData.currentMap];
            let selectedIndex = null;
            
            // Find the clicked point
            for (let i = 0; i < coords.length; i++) {
                const coord = coords[i];
                const distance = Math.sqrt(
                    Math.pow(e.offsetX - coord.screenX, 2) + 
                    Math.pow(e.offsetY - coord.screenY, 2)
                );
                
                if (distance < 12) {
                    selectedIndex = i;
                    break;
                }
            }
            
            // Update selected point
            mapData.selectedPoint = selectedIndex;
            
            // Update info panel
            updateCoordinateInfo(coords, selectedIndex);
            
            // Redraw the map
            renderCoordinatesOnMap(coords, mapData.currentMap, mapData);
        });
        
        // Mouse wheel for zooming
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const mapData = canvas.mapData;
            const coords = dataStore.currentData.treasureMapCoordinates[mapData.currentMap];
            
            // Zoom in/out based on wheel direction
            if (e.deltaY < 0) {
                mapData.scale *= 1.1;
            } else {
                mapData.scale /= 1.1;
            }
            
            // Redraw the map
            renderCoordinatesOnMap(coords, mapData.currentMap, mapData);
        });
        
        canvas.hasInteractionEvents = true;
    }
}

// Draw background grid
function drawGrid(ctx, width, height, scale, minX, minY, offsetX, offsetY) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    // Calculate grid size based on scale
    const gridSize = 50 * scale;
    
    // Calculate start positions accounting for offset and min coords
    const startX = (offsetX % gridSize) - gridSize;
    const startY = (offsetY % gridSize) - gridSize;
    
    // Draw vertical lines
    for (let x = startX; x < width + gridSize; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let y = startY; y < height + gridSize; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    
    // Draw axes
    const originX = (0 - minX) * scale + offsetX;
    const originY = (0 - minY) * scale + offsetY;
    
    if (originX >= 0 && originX <= width) {
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.beginPath();
        ctx.moveTo(originX, 0);
        ctx.lineTo(originX, height);
        ctx.stroke();
    }
    
    if (originY >= 0 && originY <= height) {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.moveTo(0, originY);
        ctx.lineTo(width, originY);
        ctx.stroke();
    }
}

// Update coordinate info in the info panel
function updateCoordinateInfo(coordinates, index) {
    const infoPanel = document.getElementById('coordInfo');
    
    if (index === null) {
        infoPanel.innerHTML = `Select a point on the map to see details`;
        return;
    }
    
    const coord = coordinates[index];
    infoPanel.innerHTML = `
        <div class="coord-detail">
            <strong>Index:</strong> ${index}
        </div>
        <div class="coord-detail">
            <strong>X:</strong> ${coord.x}
        </div>
        <div class="coord-detail">
            <strong>Y:</strong> ${coord.y}
        </div>
        <div class="coord-detail">
            <strong>Level:</strong> ${coord.level}
        </div>
        <div class="coord-info">
            <strong>Location Type:</strong> ${coord.level === 0 ? 'Underground/Cave' : 'Surface'}
        </div>
        <button id="centerOnPoint" class="btn btn-sm btn-primary mt-2">
            <i class="bi bi-bullseye"></i> Center on Point
        </button>
    `;
    
    // Add center on point functionality
    document.getElementById('centerOnPoint').addEventListener('click', () => {
        const canvas = document.getElementById('mapCanvas');
        const mapData = canvas.mapData;
        
        // Center the map on the selected point
        mapData.offsetX = canvas.width / 2 - coord.screenX;
        mapData.offsetY = canvas.height / 2 - coord.screenY;
        
        // Redraw the map
        renderCoordinatesOnMap(coordinates, mapData.currentMap, mapData);
    });
}

// Render data as a table
function renderTableView(data, container) {
    if (!Array.isArray(data) && typeof data === 'object') {
        // Convert object to array of key-value pairs
        data = Object.entries(data).map(([key, value]) => ({
            key,
            value: typeof value === 'object' ? JSON.stringify(value) : value
        }));
    }
    
    if (!Array.isArray(data) || data.length === 0) {
        container.innerHTML = `
            <div class="placeholder-message">
                <i class="bi bi-exclamation-triangle"></i>
                <h3>No data available</h3>
                <p>The selected source contains no data or is not in the expected format.</p>
            </div>
        `;
        return;
    }
    
    // Get columns from the first item
    const firstItem = data[0];
    const columns = Object.keys(firstItem);
    
    const table = document.createElement('table');
    table.className = 'data-table';
    
    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    columns.forEach(column => {
        const th = document.createElement('th');
        th.textContent = column.charAt(0).toUpperCase() + column.slice(1);
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create body
    const tbody = document.createElement('tbody');
    data.forEach((item, index) => {
        const row = document.createElement('tr');
        row.setAttribute('data-index', index);
        
        columns.forEach(column => {
            const td = document.createElement('td');
            let value = item[column];
            
            // Format the cell content based on data type
            if (value === null || value === undefined) {
                td.textContent = '-';
            } else if (typeof value === 'object') {
                td.textContent = Array.isArray(value) ? `[Array: ${value.length}]` : '{Object}';
                td.classList.add('expandable');
            } else if (typeof value === 'boolean') {
                td.textContent = value ? '✓' : '✗';
                td.classList.add(value ? 'true' : 'false');
            } else {
                td.textContent = String(value);
            }
            
            row.appendChild(td);
        });
        
        row.addEventListener('click', () => showItemDetails(item));
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    container.appendChild(table);
}

// Render data as cards
function renderCardView(data, container) {
    if (!Array.isArray(data) && typeof data === 'object') {
        // Convert object to array
        data = Object.entries(data).map(([key, value]) => ({
            key,
            value
        }));
    }
    
    if (!Array.isArray(data) || data.length === 0) {
        container.innerHTML = `
            <div class="placeholder-message">
                <i class="bi bi-exclamation-triangle"></i>
                <h3>No data available</h3>
                <p>The selected source contains no data or is not in the expected format.</p>
            </div>
        `;
        return;
    }
    
    const cardView = document.createElement('div');
    cardView.className = 'card-view';
    
    data.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'data-card';
        card.setAttribute('data-index', index);
        
        // Get the title property (usually id, name, or the first property)
        let titleProp = 'name';
        if (!item.name) {
            titleProp = item.id ? 'id' : Object.keys(item)[0];
        }
        
        card.innerHTML = `
            <h4>${item[titleProp]}</h4>
            <div class="card-content">
                ${Object.entries(item)
                    .slice(0, 5) // Limit to first 5 properties
                    .map(([key, value]) => `
                        <div class="data-property">
                            <div class="property-name">${key}:</div>
                            <div class="property-value">${formatPropertyValue(value)}</div>
                        </div>
                    `).join('')}
                ${Object.keys(item).length > 5 ? `<div class="more-properties">+${Object.keys(item).length - 5} more properties</div>` : ''}
            </div>
        `;
        
        card.addEventListener('click', () => showItemDetails(item));
        cardView.appendChild(card);
    });
    
    container.appendChild(cardView);
}

// Render data as a chart
function renderChartView(data, container) {
    // Special handling for pickpocket data
    if (dataStore.currentSource === 'pickpocketdefs' && data.pickpocketing) {
        container.innerHTML = `
            <h3>Pickpocket Progression Chart</h3>
            <p>This chart shows the required crime level and XP rewards for each pickpocketing target.</p>
            <div class="chart-container" style="height: 500px;">
                <!-- Chart will be inserted here -->
            </div>
        `;
        
        const chartContainer = container.querySelector('.chart-container');
        generatePickpocketProgressChart(chartContainer);
        return;
    }
    
    // For other data types, use the original logic
    if (!Array.isArray(data)) {
        container.innerHTML = `
            <div class="placeholder-message">
                <i class="bi bi-exclamation-triangle"></i>
                <h3>Cannot visualize this data</h3>
                <p>Chart view works best with array data. Try selecting a different data source or view type.</p>
            </div>
        `;
        return;
    }
    
    // Create chart options section
    const chartOptions = document.createElement('div');
    chartOptions.className = 'chart-options';
    chartOptions.innerHTML = `
        <h3>Chart Visualization</h3>
        <div class="options-form">
            <div class="form-group">
                <label for="chartType">Chart Type:</label>
                <select id="chartType" class="form-control">
                    <option value="bar">Bar Chart</option>
                    <option value="pie">Pie Chart</option>
                    <option value="line">Line Chart</option>
                    <option value="scatter">Scatter Plot</option>
                </select>
            </div>
            <div class="form-group">
                <label for="dataProperty">Data Property:</label>
                <select id="dataProperty" class="form-control">
                    ${Object.keys(data[0] || {}).map(key => `<option value="${key}">${key}</option>`).join('')}
                </select>
            </div>
            <button id="generateChart" class="btn btn-primary">Generate Chart</button>
        </div>
    `;
    
    container.appendChild(chartOptions);
    
    // Create chart container
    const chartContainer = document.createElement('div');
    chartContainer.className = 'chart-container';
    chartContainer.innerHTML = `<canvas id="dataChart"></canvas>`;
    container.appendChild(chartContainer);
    
    // Set up chart generation event
    document.getElementById('generateChart').addEventListener('click', () => {
        const chartType = document.getElementById('chartType').value;
        const property = document.getElementById('dataProperty').value;
        
        generateChart(data, chartType, property);
    });
    
    // Generate default chart
    setTimeout(() => {
        if (data.length > 0 && Object.keys(data[0]).length > 0) {
            const defaultProperty = Object.keys(data[0])[0];
            generateChart(data, 'bar', defaultProperty);
        }
    }, 100);
}

// Generate a chart using Chart.js
function generateChart(data, type, property) {
    const canvas = document.getElementById('dataChart');
    
    // Destroy previous chart if it exists
    if (window.currentChart) {
        window.currentChart.destroy();
    }
    
    // Aggregate data based on property
    const aggregatedData = {};
    
    data.forEach(item => {
        if (item[property] !== undefined) {
            const value = item[property];
            const key = typeof value === 'object' ? JSON.stringify(value) : String(value);
            
            if (!aggregatedData[key]) {
                aggregatedData[key] = 0;
            }
            aggregatedData[key]++;
        }
    });
    
    // Prepare chart data
    const labels = Object.keys(aggregatedData);
    const values = Object.values(aggregatedData);
    
    // Generate random colors
    const colors = labels.map(() => {
        const r = Math.floor(Math.random() * 200) + 55;
        const g = Math.floor(Math.random() * 200) + 55;
        const b = Math.floor(Math.random() * 200) + 55;
        return `rgba(${r}, ${g}, ${b}, 0.7)`;
    });
    
    // Create the chart
    window.currentChart = new Chart(canvas, {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: `Distribution of ${property}`,
                data: values,
                backgroundColor: colors,
                borderColor: colors.map(color => color.replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: type === 'pie',
                    position: 'right',
                    labels: {
                        color: '#e0e0e0'
                    }
                },
                tooltip: {
                    enabled: true
                }
            },
            scales: type !== 'pie' ? {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#e0e0e0'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#e0e0e0',
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            } : {}
        }
    });
}

// Set the current view type
function setView(viewType) {
    // Update active class on buttons
    document.querySelectorAll('.view-controls button').forEach(button => {
        button.classList.remove('active');
    });
    document.getElementById(`${viewType}View`).classList.add('active');
    
    // Set current view and re-render
    dataStore.currentView = viewType;
    renderData();
}

// Show loading indicator
function showLoading(isLoading) {
    const resultsContainer = document.getElementById('resultsContainer');
    
    if (isLoading) {
        resultsContainer.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
            </div>
        `;
    }
}

// Format property values for display
function formatPropertyValue(value) {
    if (value === null || value === undefined) {
        return '-';
    } else if (typeof value === 'object') {
        if (Array.isArray(value)) {
            return `[Array: ${value.length}]`;
        } else {
            return '{Object}';
        }
    } else if (typeof value === 'boolean') {
        return value ? '✓' : '✗';
    } else {
        return String(value);
    }
}

// Show item details
function showItemDetails(item) {
    const detailsPanel = document.getElementById('dataDetails');
    detailsPanel.classList.add('open');
    
    // Special handling for world entity loot
    if (dataStore.currentSource === 'worldentitylootdefs') {
        renderWorldEntityLootDetails(item, detailsPanel);
        return;
    }
    
    // Original formatting for other items
    let detailsHTML = `
        <div class="details-header">
            <h3>Item Details</h3>
            <button id="closeDetails" class="btn btn-sm btn-outline-secondary">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
        <div class="details-content">
    `;
    
    // Add each property to the details panel
    for (const [key, value] of Object.entries(item)) {
        detailsHTML += `
            <div class="detail-item">
                <div class="detail-key">${key}</div>
                <div class="detail-value">${formatDetailValue(value)}</div>
            </div>
        `;
    }
    
    // Add AI analysis button if assistant is available
    detailsHTML += `
        <div class="details-actions mt-3">
            <button id="analyzeItem" class="btn btn-primary">
                <i class="bi bi-robot"></i> Get AI Insights
            </button>
        </div>
    `;
    
    detailsHTML += `</div>`;
    
    detailsPanel.innerHTML = detailsHTML;
    
    // Set up close button event
    document.getElementById('closeDetails').addEventListener('click', () => {
        detailsPanel.classList.remove('open');
    });
    
    // Set up AI analysis event
    document.getElementById('analyzeItem').addEventListener('click', async () => {
        const analyzeBtn = document.getElementById('analyzeItem');
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = `<i class="bi bi-hourglass-split"></i> Analyzing...`;
        
        try {
            const aiAssistant = window.aiAssistant;
            const insights = await aiAssistant.suggestStrategies(dataStore.currentSource, item);
            
            // Add insights to the details panel
            const insightsSection = document.createElement('div');
            insightsSection.className = 'ai-insights mt-3';
            insightsSection.innerHTML = `
                <h4><i class="bi bi-lightbulb"></i> AI Insights</h4>
                <div class="insights-content">${marked.parse(insights)}</div>
            `;
            
            // Replace the button with the insights
            document.querySelector('.details-actions').replaceWith(insightsSection);
        } catch (error) {
            console.error("Error getting AI insights:", error);
            analyzeBtn.innerHTML = `<i class="bi bi-exclamation-triangle"></i> Error analyzing item`;
            setTimeout(() => {
                analyzeBtn.disabled = false;
                analyzeBtn.innerHTML = `<i class="bi bi-robot"></i> Get AI Insights`;
            }, 2000);
        }
    });
    
    // Store the selected item
    dataStore.selectedItem = item;
}

// Make showItemDetails globally accessible
window.showItemDetails = showItemDetails;

// Format detail values for display
function formatDetailValue(value) {
    if (value === null || value === undefined) {
        return '<span class="null-value">null</span>';
    } else if (typeof value === 'object') {
        if (Array.isArray(value)) {
            if (value.length === 0) {
                return '<span class="empty-array">[]</span>';
            }
            
            return `<div class="array-value">
                <div class="array-header">[Array: ${value.length}]</div>
                <div class="array-items">
                    ${value.map((item, index) => `
                        <div class="array-item">
                            <div class="array-index">${index}:</div>
                            <div class="array-item-value">${formatDetailValue(item)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
        } else {
            const entries = Object.entries(value);
            if (entries.length === 0) {
                return '<span class="empty-object">{}</span>';
            }
            
            return `<div class="object-value">
                <div class="object-header">{Object}</div>
                <div class="object-properties">
                    ${entries.map(([key, val]) => `
                        <div class="object-property">
                            <div class="object-key">${key}:</div>
                            <div class="object-property-value">${formatDetailValue(val)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
        }
    } else if (typeof value === 'boolean') {
        return `<span class="boolean-value ${value ? 'true' : 'false'}">${value}</span>`;
    } else if (typeof value === 'string') {
        // Check if it's a JSON string and try to format it
        try {
            const parsedJson = JSON.parse(value);
            if (typeof parsedJson === 'object') {
                return formatDetailValue(parsedJson);
            }
            return `<span class="string-value">"${value}"</span>`;
        } catch (e) {
            return `<span class="string-value">"${value}"</span>`;
        }
    } else {
        return `<span class="primitive-value">${value}</span>`;
    }
}

// Show notifications
function showNotification(message, type = 'info') {
    // Create notification container if it doesn't exist
    let container = document.querySelector('.notification-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'notification-container';
        document.body.appendChild(container);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="bi ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">
            <i class="bi bi-x"></i>
        </button>
    `;
    
    // Add notification to container
    container.appendChild(notification);
    
    // Set up close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            notification.remove();
        }, 300);
    });
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.add('fade-out');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }
    }, 5000);
}

// Make showNotification globally accessible
window.showNotification = showNotification;

// Get appropriate icon for notification type
function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'bi-check-circle-fill';
        case 'error': return 'bi-exclamation-triangle-fill';
        case 'warning': return 'bi-exclamation-circle-fill';
        default: return 'bi-info-circle-fill';
    }
}

// Toggle AI Assistant
function toggleAIAssistant() {
    const assistant = document.getElementById('aiAssistant');
    assistant.classList.toggle('open');
    
    // If opening the assistant and we have a current data source, get insights
    if (assistant.classList.contains('open') && dataStore.currentSource) {
        getDataInsights(dataStore.currentSource);
    }
}

// Search functionality
async function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.trim();
    
    if (!query) {
        showNotification('Please enter a search query', 'warning');
        return;
    }
    
    showLoading(true);
    
    try {
        // First, try simple string matching across all data sources
        const results = searchAllData(query);
        
        if (results.length > 0) {
            // Display results
            displaySearchResults(results, query);
        } else {
            // If no results found, ask AI for help
            await aiSearchAssistance(query);
        }
    } catch (error) {
        console.error('Search error:', error);
        showNotification('Error performing search', 'error');
    } finally {
        showLoading(false);
    }
}

// Search across all data sources
function searchAllData(query) {
    const results = [];
    const lowercaseQuery = query.toLowerCase();
    
    // Search each data source
    for (const source in dataStore) {
        if (source === 'currentSource' || source === 'currentData' || source === 'currentView' || source === 'selectedItem') {
            continue;
        }
        
        const data = dataStore[source];
        if (!data) continue;
        
        // For array data, search each item
        if (Array.isArray(data)) {
            data.forEach((item, index) => {
                if (matchesQuery(item, lowercaseQuery)) {
                    results.push({
                        source,
                        item,
                        index
                    });
                }
            });
        } 
        // For object data, search differently
        else if (typeof data === 'object') {
            for (const key in data) {
                const item = data[key];
                if (matchesQuery({ key, value: item }, lowercaseQuery)) {
                    results.push({
                        source,
                        item: { key, value: item },
                        index: key
                    });
                }
            }
        }
    }
    
    return results;
}

// Check if an item matches the query
function matchesQuery(item, query) {
    // Check all string properties for matches
    for (const key in item) {
        const value = item[key];
        
        if (typeof value === 'string' && value.toLowerCase().includes(query)) {
            return true;
        } else if (typeof value === 'number' && String(value).includes(query)) {
            return true;
        } else if (typeof key === 'string' && key.toLowerCase().includes(query)) {
            return true;
        }
        
        // Also check nested objects, but only one level deep
        if (value && typeof value === 'object') {
            for (const subKey in value) {
                const subValue = value[subKey];
                
                if (typeof subValue === 'string' && subValue.toLowerCase().includes(query)) {
                    return true;
                } else if (typeof subValue === 'number' && String(subValue).includes(query)) {
                    return true;
                } else if (typeof subKey === 'string' && subKey.toLowerCase().includes(query)) {
                    return true;
                }
            }
        }
    }
    
    return false;
}

// Display search results
function displaySearchResults(results, query) {
    const resultsContainer = document.getElementById('resultsContainer');
    
    // Sort results by relevance (source type)
    const sourceOrder = [
        'npcentitydefs', 'questdefs', 'spelldefs', 'shopdef', 
        'pickpocketdefs', 'worldentitylootdefs', 'npcloot', 
        'specialcoordinatesdefs'
    ];
    
    results.sort((a, b) => {
        return sourceOrder.indexOf(a.source) - sourceOrder.indexOf(b.source);
    });
    
    // Create results HTML
    let html = `
        <div class="search-results">
            <h3>Search Results for "${query}"</h3>
            <p>${results.length} results found</p>
            <div class="results-list">
    `;
    
    results.forEach(result => {
        // Get a title for the result
        let title = result.item.name || result.item.desc || result.item._id || result.item.key || `Item ${result.index}`;
        
        html += `
            <div class="search-result-item" data-source="${result.source}" data-index="${result.index}">
                <div class="result-header">
                    <h4>${title}</h4>
                    <span class="result-source">${formatSourceName(result.source)}</span>
                </div>
                <div class="result-preview">
                    ${generateResultPreview(result.item, query)}
                </div>
                <button class="btn btn-sm btn-outline-primary view-result">
                    <i class="bi bi-eye"></i> View Details
                </button>
            </div>
        `;
    });
    
    html += `
            </div>
        </div>
    `;
    
    resultsContainer.innerHTML = html;
    
    // Add event listeners to result items
    document.querySelectorAll('.view-result').forEach(button => {
        button.addEventListener('click', (e) => {
            const resultItem = e.target.closest('.search-result-item');
            const source = resultItem.getAttribute('data-source');
            const index = resultItem.getAttribute('data-index');
            
            // Select the data source and item
            selectDataSource(source);
            
            // Find and show the item details
            const item = Array.isArray(dataStore[source]) 
                ? dataStore[source][index] 
                : { key: index, value: dataStore[source][index] };
            
            showItemDetails(item);
        });
    });
}

// Generate a preview of the search result
function generateResultPreview(item, query) {
    // Convert item to a flattened list of key-value pairs
    const properties = [];
    
    for (const key in item) {
        const value = item[key];
        
        if (typeof value !== 'object' || value === null) {
            properties.push({ key, value });
        } else if (Array.isArray(value)) {
            properties.push({ key, value: `[Array: ${value.length}]` });
        } else {
            properties.push({ key, value: '{Object}' });
        }
    }
    
    // Sort properties by whether they match the query
    const lowercaseQuery = query.toLowerCase();
    properties.sort((a, b) => {
        const aMatches = String(a.key).toLowerCase().includes(lowercaseQuery) || 
                        String(a.value).toLowerCase().includes(lowercaseQuery);
        const bMatches = String(b.key).toLowerCase().includes(lowercaseQuery) || 
                        String(b.value).toLowerCase().includes(lowercaseQuery);
        
        if (aMatches && !bMatches) return -1;
        if (!aMatches && bMatches) return 1;
        return 0;
    });
    
    // Create preview HTML with highlighting
    let html = '<div class="property-list">';
    
    // Show at most 3 properties
    const previewProperties = properties.slice(0, 3);
    
    previewProperties.forEach(prop => {
        const keyHtml = highlightText(String(prop.key), lowercaseQuery);
        const valueHtml = highlightText(String(prop.value), lowercaseQuery);
        
        html += `
            <div class="property">
                <div class="property-key">${keyHtml}:</div>
                <div class="property-value">${valueHtml}</div>
            </div>
        `;
    });
    
    if (properties.length > 3) {
        html += `<div class="more-properties">+${properties.length - 3} more properties</div>`;
    }
    
    html += '</div>';
    return html;
}

// Highlight matching text
function highlightText(text, query) {
    if (!query) return text;
    
    const regex = new RegExp(`(${query.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
}

// Format source name for display
function formatSourceName(source) {
    return source
        .replace('defs', '')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase());
}

// Use AI to help with search
async function aiSearchAssistance(query) {
    const resultsContainer = document.getElementById('resultsContainer');
    
    resultsContainer.innerHTML = `
        <div class="ai-search-results">
            <h3>Search Results for "${query}"</h3>
            <p class="loading-message">
                <i class="bi bi-robot"></i> AI is analyzing your query
                <span class="loading-dots">
                    <span>.</span><span>.</span><span>.</span>
                </span>
            </p>
        </div>
    `;
    
    try {
        const aiResponse = await aiAssistant.processQuery(
            `User is searching for "${query}" in the game data. Suggest data sources to explore and explain what they might be looking for. Keep your response brief and focused on helping them navigate the data.`
        );
        
        resultsContainer.innerHTML = `
            <div class="ai-search-results">
                <h3>Search Results for "${query}"</h3>
                <p>No exact matches found, but AI can help:</p>
                <div class="ai-suggestion">
                    <div class="ai-response">
                        ${marked.parse(aiResponse)}
                    </div>
                    <div class="ai-actions">
                        <button id="openAssistant" class="btn btn-primary">
                            <i class="bi bi-chat-dots"></i> Continue with AI Assistant
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('openAssistant').addEventListener('click', () => {
            // Open AI assistant and populate with the current query
            toggleAIAssistant();
            document.getElementById('assistantInput').value = query;
            sendMessageToAI();
        });
        
    } catch (error) {
        console.error('AI search assistance error:', error);
        resultsContainer.innerHTML = `
            <div class="ai-search-results">
                <h3>Search Results for "${query}"</h3>
                <p>No results found and AI assistance failed. Try a different search term.</p>
            </div>
        `;
    }
}

// Send message to AI assistant
async function sendMessageToAI() {
    const input = document.getElementById('assistantInput');
    const message = input.value.trim();
    
    if (!message || aiAssistant.isProcessing) return;
    
    // Clear input
    input.value = '';
    
    // Add user message to the chat
    const chatMessages = document.getElementById('chatMessages');
    const userMessageElem = document.createElement('div');
    userMessageElem.className = 'message user-message';
    userMessageElem.innerHTML = `<div class="message-content">${message}</div>`;
    chatMessages.appendChild(userMessageElem);
    
    // Add loading message
    const aiMessageElem = document.createElement('div');
    aiMessageElem.className = 'message ai-message';
    aiMessageElem.innerHTML = `
        <div class="message-content">
            <div class="loading-message">
                <span class="loading-dots">
                    <span>.</span><span>.</span><span>.</span>
                </span>
            </div>
        </div>
    `;
    chatMessages.appendChild(aiMessageElem);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    try {
        // Process the message
        const response = await aiAssistant.processQuery(message);
        
        // Update AI message with response
        aiMessageElem.innerHTML = `<div class="message-content">${marked.parse(response)}</div>`;
    } catch (error) {
        console.error('Error processing message:', error);
        aiMessageElem.innerHTML = `
            <div class="message-content">
                <p>Sorry, I encountered an error processing your request. Please try again.</p>
            </div>
        `;
    }
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Save the current query to saved queries
function saveCurrentQuery() {
    // Get the current state
    const currentState = {
        source: dataStore.currentSource,
        view: dataStore.currentView,
        query: document.getElementById('searchInput').value.trim()
    };
    
    // Add specialized search values based on the current source
    if (currentState.source === 'npcloot') {
        // Save NPC loot search
        const lootSearch = document.getElementById('lootSearch');
        if (lootSearch) {
            currentState.specializedQuery = lootSearch.value.trim();
        }
    } else if (currentState.source === 'shopdefs') {
        const shopSearch = document.getElementById('shopSearch');
        if (shopSearch) {
            currentState.specializedQuery = shopSearch.value.trim();
        }
    } else if (currentState.source === 'npcentitydefs') {
        const npcSearch = document.getElementById('npcSearch');
        if (npcSearch) {
            currentState.specializedQuery = npcSearch.value.trim();
        }
    } else if (currentState.source === 'spelldefs') {
        const spellSearch = document.getElementById('spellSearch');
        if (spellSearch) {
            currentState.specializedQuery = spellSearch.value.trim();
        }
    }
    
    if (!currentState.source && !currentState.query && !currentState.specializedQuery) {
        showNotification('Nothing to save', 'warning');
        return;
    }
    
    // Prompt for a name
    const queryName = prompt('Enter a name for this query:');
    if (!queryName) return;
    
    // Get saved queries from localStorage
    let savedQueries = JSON.parse(localStorage.getItem('savedQueries') || '[]');
    
    // Add the new query
    savedQueries.push({
        name: queryName,
        timestamp: Date.now(),
        state: currentState
    });
    
    // Save back to localStorage
    localStorage.setItem('savedQueries', JSON.stringify(savedQueries));
    
    // Update saved queries list
    updateSavedQueriesList();
    
    showNotification(`Query "${queryName}" saved successfully`, 'success');
}

// Load a saved query
function loadSavedQuery(index) {
    const savedQueries = JSON.parse(localStorage.getItem('savedQueries') || '[]');
    const query = savedQueries[index];
    
    if (!query) return;
    
    // Set the search input
    if (query.state.query) {
        document.getElementById('searchInput').value = query.state.query;
    }
    
    // Set the data source
    if (query.state.source) {
        selectDataSource(query.state.source);
        
        // After the data source is loaded, apply specialized search if available
        setTimeout(() => {
            if (query.state.specializedQuery) {
                // Apply the appropriate specialized search based on data source
                if (query.state.source === 'npcloot') {
                    const lootSearch = document.getElementById('lootSearch');
                    if (lootSearch) {
                        lootSearch.value = query.state.specializedQuery;
                        // Trigger the search
                        lootSearch.dispatchEvent(new Event('input'));
                    }
                } else if (query.state.source === 'shopdefs') {
                    const shopSearch = document.getElementById('shopSearch');
                    if (shopSearch) {
                        shopSearch.value = query.state.specializedQuery;
                        shopSearch.dispatchEvent(new Event('input'));
                    }
                } else if (query.state.source === 'npcentitydefs') {
                    const npcSearch = document.getElementById('npcSearch');
                    if (npcSearch) {
                        npcSearch.value = query.state.specializedQuery;
                        npcSearch.dispatchEvent(new Event('input'));
                    }
                } else if (query.state.source === 'spelldefs') {
                    const spellSearch = document.getElementById('spellSearch');
                    if (spellSearch) {
                        spellSearch.value = query.state.specializedQuery;
                        spellSearch.dispatchEvent(new Event('input'));
                    }
                }
            }
        }, 500); // Small delay to ensure the view has rendered
    }
    
    // Set the view
    if (query.state.view) {
        setView(query.state.view);
    }
    
    // If there's a main query, perform the search
    if (query.state.query) {
        performSearch();
    }
    
    showNotification(`Loaded query "${query.name}"`, 'success');
}

// Update the saved queries list
function updateSavedQueriesList() {
    const savedQueriesList = document.getElementById('savedQueries');
    savedQueriesList.innerHTML = '';
    
    // Get saved queries from localStorage
    const savedQueries = JSON.parse(localStorage.getItem('savedQueries') || '[]');
    
    if (savedQueries.length === 0) {
        savedQueriesList.innerHTML = '<li class="no-queries">No saved queries</li>';
        return;
    }
    
    // Add each query to the list
    savedQueries.forEach((query, index) => {
        const li = document.createElement('li');
        li.setAttribute('data-index', index);
        li.innerHTML = `
            <span class="query-name">${query.name}</span>
            <button class="delete-query btn btn-sm">
                <i class="bi bi-trash"></i>
            </button>
        `;
        
        // Add event listener to load the query
        li.addEventListener('click', (e) => {
            if (!e.target.closest('.delete-query')) {
                const index = parseInt(e.currentTarget.getAttribute('data-index'));
                loadSavedQuery(index);
            }
        });
        
        // Add event listener to delete button
        li.querySelector('.delete-query').addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(li.getAttribute('data-index'));
            deleteSavedQuery(index);
        });
        
        savedQueriesList.appendChild(li);
    });
}

// Delete a saved query
function deleteSavedQuery(index) {
    const savedQueries = JSON.parse(localStorage.getItem('savedQueries') || '[]');
    const queryName = savedQueries[index]?.name;
    
    if (!queryName) return;
    
    // Confirm deletion
    if (!confirm(`Are you sure you want to delete "${queryName}"?`)) {
        return;
    }
    
    // Remove the query
    savedQueries.splice(index, 1);
    
    // Save back to localStorage
    localStorage.setItem('savedQueries', JSON.stringify(savedQueries));
    
    // Update the list
    updateSavedQueriesList();
    
    showNotification(`Query "${queryName}" deleted`, 'success');
}

// Function to render world entity loot details
function renderWorldEntityLootDetails(entity, container) {
    // Generate header and basic details
    let detailsHTML = `
        <div class="details-header">
            <div class="loot-title">
                <i class="bi ${entity.desc.toLowerCase().includes('picklock') ? 'bi-key-fill' : 
                             entity.desc.toLowerCase().includes('treasure map') ? 'bi-map-fill' : 'bi-search'}"></i>
                <h3>${entity.desc}</h3>
                <span class="npc-id-badge">ID #${entity._id}</span>
            </div>
            <button id="closeDetails" class="btn btn-sm btn-outline-secondary">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
        <div class="details-content">
            <div class="entity-details-card mb-4">
                <h4>Properties</h4>
                <div class="properties-grid">
                    <div class="property">
                        <div class="property-label">Success Chance</div>
                        <div class="property-value">${formatPercentage(entity.baseProbabilityOfSuccess)}</div>
                    </div>
                    <div class="property">
                        <div class="property-label">Max Level Success</div>
                        <div class="property-value">${formatPercentage(entity.maxLvlProbabilityOfSuccess)}</div>
                    </div>
                    <div class="property">
                        <div class="property-label">Respawn Time</div>
                        <div class="property-value">${entity.respawnTicks} ticks</div>
                    </div>
                    <div class="property">
                        <div class="property-label">Loot Chance on Respawn</div>
                        <div class="property-value">${formatPercentage(entity.oddsOfHavingLootOnRespawn)}</div>
                    </div>
                </div>
            </div>

            ${entity.baseLoot && entity.baseLoot.length > 0 ? `
                <div class="loot-section">
                    <h4>Guaranteed Loot</h4>
                    <div class="loot-items-grid">
                        ${entity.baseLoot.map(item => `
                            <div class="loot-item-card guaranteed">
                                <div class="loot-item-header">
                                    <div class="loot-item-name">${item.name || getItemName(item.itemId)}</div>
                                    <div class="loot-item-badge">100%</div>
                                </div>
                                <div class="loot-item-details">
                                    <div class="loot-amount">
                                        ${item.amount}× (ID: ${item.itemId})
                                    </div>
                                    ${item.isIOU ? '<div class="loot-iou-tag">IOU</div>' : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            ${entity.loot && entity.loot.length > 0 ? `
                <div class="loot-section">
                    <h4>Possible Loot</h4>
                    <div class="loot-items-grid">
                        ${entity.loot.map(item => `
                            <div class="loot-item-card">
                                <div class="loot-item-header">
                                    <div class="loot-item-name">${item.name || getItemName(item.itemId)}</div>
                                    <div class="loot-item-badge">${formatPercentage(item.odds)}</div>
                                </div>
                                <div class="loot-item-details">
                                    <div class="loot-amount">
                                        ${item.amount}× (ID: ${item.itemId})
                                    </div>
                                    ${item.isIOU ? '<div class="loot-iou-tag">IOU</div>' : ''}
                                    <div class="loot-odds-bar">
                                        <div class="loot-odds-fill" style="width: ${Math.min(100, Math.round(item.odds * 100))}%"></div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <div class="details-actions mt-3">
                <button id="analyzeEntityLoot" class="btn btn-primary">
                    <i class="bi bi-robot"></i> Get AI Analysis
                </button>
            </div>
        </div>
    `;

    container.innerHTML = detailsHTML;
    container.classList.add('open');
    
    // Set up close button
    document.getElementById('closeDetails').addEventListener('click', () => {
        container.classList.remove('open');
    });

    // Set up AI analysis button
    document.getElementById('analyzeEntityLoot').addEventListener('click', async () => {
        const analyzeBtn = document.getElementById('analyzeEntityLoot');
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = `<i class="bi bi-hourglass-split"></i> Analyzing...`;
        
        try {
            const insights = await aiAssistant.suggestStrategies('worldentitylootdefs', entity);
            
            // Add insights to the details panel
            const insightsSection = document.createElement('div');
            insightsSection.className = 'ai-insights mt-3';
            insightsSection.innerHTML = `
                <h4><i class="bi bi-lightbulb"></i> AI Insights</h4>
                <div class="insights-content">${marked.parse(insights)}</div>
            `;
            
            // Replace the button with the insights
            document.querySelector('.details-actions').replaceWith(insightsSection);
        } catch (error) {
            console.error("Error getting AI insights:", error);
            analyzeBtn.innerHTML = `<i class="bi bi-exclamation-triangle"></i> Error analyzing entity`;
            setTimeout(() => {
                analyzeBtn.disabled = false;
                analyzeBtn.innerHTML = `<i class="bi bi-robot"></i> Get AI Analysis`;
            }, 2000);
        }
    });
}

// Render pickpocket view
function renderPickpocketView(data, container) {
    // Ensure we're working with the right data structure
    if (!data.pickpocketing || !Array.isArray(data.pickpocketing)) {
        container.innerHTML = `
            <div class="placeholder-message">
                <i class="bi bi-exclamation-triangle"></i>
                <h3>Invalid pickpocket data format</h3>
                <p>The selected data source is not in the expected pickpocket format.</p>
            </div>
        `;
        return;
    }
    
    const pickpocketData = data.pickpocketing;
    
    // Also get picklock chests from world entity loot
    let picklockChests = [];
    if (dataStore.worldentitylootdefs && Array.isArray(dataStore.worldentitylootdefs)) {
        picklockChests = dataStore.worldentitylootdefs.filter(entity => 
            entity.desc && entity.desc.toLowerCase().includes('picklock')
        );
    }
    
    // Create filter controls
    const filterControls = document.createElement('div');
    filterControls.className = 'filter-options';
    filterControls.innerHTML = `
        <div class="filter-group">
            <span class="filter-label">Type:</span>
            <select id="crimeTypeFilter" class="form-control form-control-sm">
                <option value="all">All Crime Types</option>
                <option value="pickpocket">Pickpocketing</option>
                <option value="picklock">Picklock Chests</option>
            </select>
        </div>
        <div class="filter-group">
            <span class="filter-label">Sort by:</span>
            <select id="sortPickpocket" class="form-control form-control-sm">
                <option value="level">Crime Level (Low to High)</option>
                <option value="level-desc">Crime Level (High to Low)</option>
                <option value="xp">XP Reward (Low to High)</option>
                <option value="xp-desc">XP Reward (High to Low)</option>
                <option value="success">Success Rate (Low to High)</option>
                <option value="success-desc">Success Rate (High to Low)</option>
            </select>
        </div>
        <div class="filter-group">
            <span class="filter-label">Min. Crime Level:</span>
            <input type="number" id="minLevel" min="1" max="100" class="form-control form-control-sm" style="width: 70px;">
        </div>
        <button id="applyPickpocketFilters" class="btn btn-sm btn-primary">Apply</button>
        <button id="resetPickpocketFilters" class="btn btn-sm btn-outline-secondary">Reset</button>
    `;
    
    container.appendChild(filterControls);
    
    // Create container for pickpocket cards
    const pickpocketView = document.createElement('div');
    pickpocketView.className = 'pickpocket-view';
    container.appendChild(pickpocketView);
    
    // Create container for picklock chests
    const picklockView = document.createElement('div');
    picklockView.className = 'pickpocket-view';
    picklockView.style.display = 'none'; // Initially hidden
    container.appendChild(picklockView);
    
    // Render pickpocket cards
    renderPickpocketCards(pickpocketData, pickpocketView);
    
    // Render picklock chest cards
    if (picklockChests.length > 0) {
        // Add section header for picklock chests
        const picklockHeader = document.createElement('div');
        picklockHeader.className = 'section-header';
        picklockHeader.innerHTML = `<h3><i class="bi bi-key-fill"></i> Picklock Chests</h3>`;
        picklockView.appendChild(picklockHeader);
        
        // Render picklock chests using modified world entity renderer
        renderPicklockChests(picklockChests, picklockView);
    } else {
        picklockView.innerHTML = `
            <div class="section-header">
                <h3><i class="bi bi-key-fill"></i> Picklock Chests</h3>
            </div>
            <div class="placeholder-message">
                <p>No picklock chests available in the data</p>
            </div>
        `;
    }
    
    // Set up event listeners for filters
    document.getElementById('applyPickpocketFilters').addEventListener('click', () => {
        applyPickpocketFilters(pickpocketData, picklockChests, pickpocketView, picklockView);
    });
    
    document.getElementById('resetPickpocketFilters').addEventListener('click', () => {
        document.getElementById('minLevel').value = '';
        document.getElementById('sortPickpocket').value = 'level';
        document.getElementById('crimeTypeFilter').value = 'all';
        
        // Show pickpocket view and render cards
        pickpocketView.style.display = 'block';
        picklockView.style.display = 'block';
        
        renderPickpocketCards(pickpocketData, pickpocketView);
        renderPicklockChests(picklockChests, picklockView);
    });
    
    // Set up event listener for type filter
    document.getElementById('crimeTypeFilter').addEventListener('change', (e) => {
        const crimeType = e.target.value;
        
        if (crimeType === 'all') {
            pickpocketView.style.display = 'block';
            picklockView.style.display = 'block';
        } else if (crimeType === 'pickpocket') {
            pickpocketView.style.display = 'block';
            picklockView.style.display = 'none';
        } else if (crimeType === 'picklock') {
            pickpocketView.style.display = 'none';
            picklockView.style.display = 'block';
        }
    });
}

/**
 * Render picklock chests from world entity loot data
 * @param {Array} picklockChests - Picklock chest entities
 * @param {HTMLElement} container - Container to render into
 */
function renderPicklockChests(picklockChests, container) {
    // Clear container except for the header
    const header = container.querySelector('.section-header');
    container.innerHTML = '';
    if (header) {
        container.appendChild(header);
    }
    
    picklockChests.forEach(entity => {
        // Get success rate as percentage
        const successRate = formatPercentage(entity.baseProbabilityOfSuccess);
        const maxSuccessRate = formatPercentage(entity.maxLvlProbabilityOfSuccess);
        const successRateWidth = Math.min(100, Math.round(entity.baseProbabilityOfSuccess * 100));
        
        // Determine difficulty class based on success rate
        let difficultyClass = 'difficulty-easy';
        if (entity.baseProbabilityOfSuccess <= 0.25) {
            difficultyClass = 'difficulty-hard';
        } else if (entity.baseProbabilityOfSuccess <= 0.5) {
            difficultyClass = 'difficulty-medium';
        }
        
        // Format respawn time
        const respawnTime = entity.respawnTicks > 0 
            ? `${entity.respawnTicks} ticks` 
            : 'No respawn';
        
        // Count total possible loot items
        const baseLootCount = entity.baseLoot ? entity.baseLoot.length : 0;
        const lootCount = entity.loot ? entity.loot.length : 0;
        const totalLoot = baseLootCount + lootCount;
        
        // Create the card
        const card = document.createElement('div');
        card.className = 'pickpocket-card';
        
        card.innerHTML = `
            <div class="pickpocket-header ${difficultyClass}">
                <div class="pickpocket-title">
                    <i class="bi bi-key-fill"></i>
                    <h4>${entity.desc}</h4>
                </div>
                <div class="pickpocket-level">
                    <i class="bi bi-shield-lock-fill"></i> Picklock
                </div>
            </div>
            <div class="pickpocket-details">
                <div class="pickpocket-stats">
                    <div class="stat-item">
                        <div class="stat-label">Success Chance</div>
                        <div class="stat-value">${successRate} - ${maxSuccessRate}</div>
                        <div class="probability-bar">
                            <div class="probability-fill" style="width: ${successRateWidth}%"></div>
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Respawn Time</div>
                        <div class="stat-value">
                            <i class="bi bi-clock"></i> ${respawnTime}
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Loot Chance on Respawn</div>
                        <div class="stat-value">${formatPercentage(entity.oddsOfHavingLootOnRespawn)}</div>
                        <div class="probability-bar">
                            <div class="probability-fill" style="width: ${Math.min(100, Math.round(entity.oddsOfHavingLootOnRespawn * 100))}%"></div>
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Loot Items</div>
                        <div class="stat-value">${totalLoot} total items</div>
                    </div>
                </div>
                
                ${renderLootSection(entity.baseLoot, "Guaranteed Loot")}
                ${renderLootSection(entity.loot, "Possible Loot", 5)} <!-- Limited to 5 items -->
                
                <div class="picklock-actions mt-2 text-center">
                    <button class="btn btn-sm btn-primary view-full-picklock">
                        <i class="bi bi-eye"></i> View Complete Details
                    </button>
                </div>
            </div>
        `;
        
        // Add click handler to view complete details
        card.querySelector('.view-full-picklock').addEventListener('click', () => {
            renderWorldEntityLootDetails(entity, document.getElementById('dataDetails'));
        });
        
        container.appendChild(card);
    });
}

/**
 * Render loot section with optional item limit
 * @param {Array} loot - Loot items
 * @param {String} title - Section title
 * @param {Number} limit - Optional limit on number of items to show
 * @returns {String} - HTML for loot section
 */
function renderLootSection(loot, title, limit = Infinity) {
    if (!loot || loot.length === 0) {
        return `
            <div class="loot-section">
                <h5 class="loot-header">${title}</h5>
                <p class="no-loot-message">No ${title.toLowerCase()}</p>
            </div>
        `;
    }
    
    const displayItems = loot.slice(0, limit);
    const hasMore = loot.length > limit;
    
    return `
        <div class="loot-section">
            <h5 class="loot-header">${title}</h5>
            <div class="loot-items">
                ${displayItems.map(item => `
                    <div class="loot-item">
                        <div class="loot-name">
                            ${item.name || getItemName(item.itemId)} (ID: ${item.itemId})
                            ${item.isIOU ? '<span class="iou-tag">IOU</span>' : ''}
                        </div>
                        <div class="loot-amount">
                            <span>${item.amount}x</span>
                            ${item.odds ? `<span class="loot-odds">${formatPercentage(item.odds)}</span>` : ''}
                        </div>
                    </div>
                `).join('')}
                ${hasMore ? `
                    <div class="loot-item more-loot">
                        <div class="loot-name">+${loot.length - limit} more items...</div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Apply filters to both pickpocket targets and picklock chests
function applyPickpocketFilters(pickpocketData, picklockChests, pickpocketContainer, picklockContainer) {
    const sortBy = document.getElementById('sortPickpocket').value;
    const minLevel = parseInt(document.getElementById('minLevel').value) || 0;
    const crimeType = document.getElementById('crimeTypeFilter').value;
    
    // Handle visibility based on crime type
    if (crimeType === 'all') {
        pickpocketContainer.style.display = 'block';
        picklockContainer.style.display = 'block';
    } else if (crimeType === 'pickpocket') {
        pickpocketContainer.style.display = 'block';
        picklockContainer.style.display = 'none';
    } else if (crimeType === 'picklock') {
        pickpocketContainer.style.display = 'none';
        picklockContainer.style.display = 'block';
    }
    
    // Filter pickpocket data
    let filteredPickpocketData = pickpocketData.filter(target => {
        const requiredLevel = target.requirements?.[0]?.level || 0;
        return requiredLevel >= minLevel;
    });
    
    // Sort pickpocket data
    switch (sortBy) {
        case 'level':
            filteredPickpocketData.sort((a, b) => (a.requirements?.[0]?.level || 0) - (b.requirements?.[0]?.level || 0));
            break;
        case 'level-desc':
            filteredPickpocketData.sort((a, b) => (b.requirements?.[0]?.level || 0) - (a.requirements?.[0]?.level || 0));
            break;
        case 'xp':
            filteredPickpocketData.sort((a, b) => a.xp - b.xp);
            break;
        case 'xp-desc':
            filteredPickpocketData.sort((a, b) => b.xp - a.xp);
            break;
        case 'success':
            filteredPickpocketData.sort((a, b) => a.baseProbabilityOfSuccess - b.baseProbabilityOfSuccess);
            break;
        case 'success-desc':
            filteredPickpocketData.sort((a, b) => b.baseProbabilityOfSuccess - a.baseProbabilityOfSuccess);
            break;
    }
    
    // Filter and sort picklock chests
    // Note: picklock chests don't have level requirements, so we'll just apply sorting
    let filteredPicklockChests = [...picklockChests];
    
    // Sort picklock chests (mainly by success rate)
    switch (sortBy) {
        case 'success':
            filteredPicklockChests.sort((a, b) => a.baseProbabilityOfSuccess - b.baseProbabilityOfSuccess);
            break;
        case 'success-desc':
            filteredPicklockChests.sort((a, b) => b.baseProbabilityOfSuccess - a.baseProbabilityOfSuccess);
            break;
        default:
            // For other sort options, just sort by ID
            filteredPicklockChests.sort((a, b) => a._id - b._id);
    }
    
    // Render filtered data
    renderPickpocketCards(filteredPickpocketData, pickpocketContainer);
    renderPicklockChests(filteredPicklockChests, picklockContainer);
}

// Render world entity loot data
function renderWorldEntityLootView(data, container) {
    // Create filter controls
    const filterControls = document.createElement('div');
    filterControls.className = 'filter-options';
    filterControls.innerHTML = `
        <div class="filter-group">
            <span class="filter-label">Sort by:</span>
            <select id="sortWorldLoot" class="form-control form-control-sm">
                <option value="id">ID (Low to High)</option>
                <option value="id-desc">ID (High to Low)</option>
                <option value="desc">Description (A-Z)</option>
                <option value="type">Type</option>
                <option value="success-desc">Success Rate (High to Low)</option>
                <option value="respawn">Respawn Time (Low to High)</option>
                <option value="respawn-desc">Respawn Time (High to Low)</option>
            </select>
        </div>
        <div class="filter-group">
            <span class="filter-label">Filter Type:</span>
            <select id="filterType" class="form-control form-control-sm">
                <option value="all">All</option>
                <option value="search">Search Only</option>
                <option value="picklock">Picklock Only</option>
                <option value="treasure">Treasure Maps</option>
            </select>
        </div>
        <button id="applyWorldLootFilters" class="btn btn-sm btn-primary">Apply</button>
        <button id="resetWorldLootFilters" class="btn btn-sm btn-outline-secondary">Reset</button>
    `;
    
    container.appendChild(filterControls);
    
    // Create container for loot cards
    const worldLootView = document.createElement('div');
    worldLootView.className = 'world-loot-view';
    container.appendChild(worldLootView);
    
    // Render loot cards
    renderWorldLootCards(data, worldLootView);
    
    // Set up event listeners for filters
    document.getElementById('applyWorldLootFilters').addEventListener('click', () => {
        applyWorldLootFilters(data, worldLootView);
    });
    
    document.getElementById('resetWorldLootFilters').addEventListener('click', () => {
        document.getElementById('sortWorldLoot').value = 'id';
        document.getElementById('filterType').value = 'all';
        renderWorldLootCards(data, worldLootView);
    });
}

function renderWorldLootCards(data, container) {
    container.innerHTML = '';
    
    if (!Array.isArray(data)) {
        container.innerHTML = '<p class="text-center">Invalid data format</p>';
        return;
    }
    
    data.forEach(entity => {
        // Determine entity type based on description
        let entityType = 'search';
        let typeIcon = 'bi-search';
        
        if (entity.desc.toLowerCase().includes('picklock')) {
            entityType = 'picklock';
            typeIcon = 'bi-key';
        } else if (entity.desc.toLowerCase().includes('treasure map')) {
            entityType = 'treasure';
            typeIcon = 'bi-map';
        } else if (entity.desc.toLowerCase().includes('chest')) {
            typeIcon = 'bi-box';
        }
        
        // Create card
        const card = document.createElement('div');
        card.className = `world-loot-card ${entityType}-type`;
        card.setAttribute('data-type', entityType);
        
        // Get success rate as percentage
        const successRate = formatPercentage(entity.baseProbabilityOfSuccess);
        const maxSuccessRate = formatPercentage(entity.maxLvlProbabilityOfSuccess);
        const successRateWidth = Math.min(100, Math.round(entity.baseProbabilityOfSuccess * 100));
        
        // Determine difficulty class based on success rate
        let difficultyClass = 'difficulty-easy';
        if (entity.baseProbabilityOfSuccess <= 0.25) {
            difficultyClass = 'difficulty-hard';
        } else if (entity.baseProbabilityOfSuccess <= 0.5) {
            difficultyClass = 'difficulty-medium';
        }
        
        // Format respawn time
        const respawnTime = entity.respawnTicks > 0 
            ? `${entity.respawnTicks} ticks` 
            : 'No respawn';
        
        // Count total possible loot items
        const baseLootCount = entity.baseLoot ? entity.baseLoot.length : 0;
        const lootCount = entity.loot ? entity.loot.length : 0;
        const totalLoot = baseLootCount + lootCount;
        
        // Create card content
        card.innerHTML = `
            <div class="loot-header ${difficultyClass}">
                <div class="loot-title">
                    <i class="bi ${typeIcon} me-2"></i>
                    <h4>${entity.desc}</h4>
                </div>
                <div class="loot-type-badge">
                    <span class="badge ${getEntityTypeBadgeClass(entityType)}">${capitalizeFirstLetter(entityType)}</span>
                </div>
            </div>
            <div class="loot-details">
                <div class="loot-stats">
                    <div class="stat-item">
                        <div class="stat-label">Success Chance</div>
                        <div class="stat-value">${successRate} - ${maxSuccessRate}</div>
                        <div class="probability-bar">
                            <div class="probability-fill" style="width: ${successRateWidth}%"></div>
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Respawn Time</div>
                        <div class="stat-value">
                            <i class="bi bi-clock me-1"></i>
                            <span>${respawnTime}</span>
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Loot Chance on Respawn</div>
                        <div class="stat-value">${formatPercentage(entity.oddsOfHavingLootOnRespawn)}</div>
                        <div class="probability-bar">
                            <div class="probability-fill" style="width: ${Math.min(100, Math.round(entity.oddsOfHavingLootOnRespawn * 100))}%"></div>
                        </div>
                    </div>
                </div>
                
                <div class="loot-summary">
                    <h5>Rewards Summary</h5>
                    <div class="rewards-summary">
                        ${entity.baseLoot && entity.baseLoot.length > 0 ? `<span class="reward-badge guaranteed-loot-badge"><i class="bi bi-box-fill"></i> ${entity.baseLoot.length} Guaranteed</span>` : ''}
                        ${entity.loot && entity.loot.length > 0 ? `<span class="reward-badge possible-loot-badge"><i class="bi bi-box-fill"></i> ${entity.loot.length} Possible</span>` : ''}
                    </div>
                </div>
                
                <div class="loot-actions mt-2 text-center">
                    <button class="btn btn-sm btn-primary view-loot-details">
                        <i class="bi bi-eye"></i> View Full Details
                    </button>
                </div>
            </div>
        `;
        
        // Add click handler to show detailed view
        card.querySelector('.view-loot-details').addEventListener('click', () => {
            showItemDetails(entity);
        });
        
        // Add the entire card as clickable to show details
        card.addEventListener('click', (e) => {
            // Only trigger if not clicking the details button (to avoid double triggering)
            if (!e.target.closest('.view-loot-details')) {
                showItemDetails(entity);
            }
        });
        
        container.appendChild(card);
    });
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function getEntityTypeBadgeClass(type) {
    switch (type) {
        case 'picklock': return 'bg-danger';
        case 'treasure': return 'bg-warning text-dark';
        case 'search': return 'bg-info text-dark';
        default: return 'bg-secondary';
    }
}

function applyWorldLootFilters(data, container) {
    const sortBy = document.getElementById('sortWorldLoot').value;
    const filterType = document.getElementById('filterType').value;
    
    // Filter data
    let filteredData = [...data];
    
    if (filterType !== 'all') {
        filteredData = filteredData.filter(entity => {
            if (filterType === 'picklock' && entity.desc.toLowerCase().includes('picklock')) {
                return true;
            } else if (filterType === 'search' && 
                !entity.desc.toLowerCase().includes('picklock') && 
                !entity.desc.toLowerCase().includes('treasure map')) {
                return true;
            } else if (filterType === 'treasure' && entity.desc.toLowerCase().includes('treasure map')) {
                return true;
            }
            return false;
        });
    }
    
    // Sort data
    switch (sortBy) {
        case 'id':
            filteredData.sort((a, b) => a._id - b._id);
            break;
        case 'id-desc':
            filteredData.sort((a, b) => b._id - a._id);
            break;
        case 'desc':
            filteredData.sort((a, b) => a.desc.localeCompare(b.desc));
            break;
        case 'type':
            filteredData.sort((a, b) => {
                const typeA = getEntityType(a.desc);
                const typeB = getEntityType(b.desc);
                return typeA.localeCompare(typeB);
            });
            break;
        case 'success-desc':
            filteredData.sort((a, b) => b.baseProbabilityOfSuccess - a.baseProbabilityOfSuccess);
            break;
        case 'respawn':
            filteredData.sort((a, b) => a.respawnTicks - b.respawnTicks);
            break;
        case 'respawn-desc':
            filteredData.sort((a, b) => b.respawnTicks - a.respawnTicks);
            break;
    }
    
    renderWorldLootCards(filteredData, container);
}

function getEntityType(desc) {
    if (desc.toLowerCase().includes('picklock')) {
        return 'picklock';
    } else if (desc.toLowerCase().includes('treasure map')) {
        return 'treasure';
    } else {
        return 'search';
    }
}

// Render NPC view
function renderNpcView(data, container) {
    // Import and use the NPC renderer
    renderNpcs(data, container);
}

// Render quest view
function renderQuestView(quests, container) {
    if (!Array.isArray(quests) || quests.length === 0) {
        container.innerHTML = `
            <div class="placeholder-message">
                <i class="bi bi-exclamation-triangle"></i>
                <h3>No quest data available</h3>
                <p>The selected data source contains no quests or is not in the expected format.</p>
            </div>
        `;
        return;
    }
    
    // Create filter controls
    const filterControls = document.createElement('div');
    filterControls.className = 'filter-options';
    filterControls.innerHTML = `
        <div class="filter-group">
            <span class="filter-label">Sort by:</span>
            <select id="sortQuests" class="form-control form-control-sm">
                <option value="id">ID (Low to High)</option>
                <option value="id-desc">ID (High to Low)</option>
                <option value="name">Name (A-Z)</option>
                <option value="checkpoints">Length (Shortest First)</option>
                <option value="checkpoints-desc">Length (Longest First)</option>
            </select>
        </div>
        <button id="applyQuestFilters" class="btn btn-sm btn-primary">Apply</button>
        <button id="resetQuestFilters" class="btn btn-sm btn-outline-secondary">Reset</button>
    `;
    
    container.appendChild(filterControls);
    
    // Create container for quest cards
    const questView = document.createElement('div');
    questView.className = 'quest-view';
    container.appendChild(questView);
    
    // Render quest cards
    renderQuestCards(quests, questView);
    
    // Set up event listeners for filters
    document.getElementById('applyQuestFilters').addEventListener('click', () => {
        applyQuestFilters(quests, questView);
    });
    
    document.getElementById('resetQuestFilters').addEventListener('click', () => {
        document.getElementById('sortQuests').value = 'id';
        renderQuestCards(quests, questView);
    });
}

function renderQuestCards(quests, container) {
    container.innerHTML = '';
    
    quests.forEach(quest => {
        const card = document.createElement('div');
        card.className = 'quest-card';
        card.setAttribute('data-quest-id', quest._id);
        
        // Determine progress percentage based on checkpoint count
        const checkpointCount = quest.checkpoints.length;
        const progressClass = Math.min(checkpointCount, 8) <= 8 ? 'short-quest' : 
                             Math.min(checkpointCount, 12) <= 12 ? 'medium-quest' : 'long-quest';
        
        // Count rewards by type
        const expRewards = quest.reward.exp ? quest.reward.exp.length : 0;
        const itemRewards = quest.reward.items ? quest.reward.items.length : 0;
        const extraRewards = quest.reward.extra ? quest.reward.extra.length : 0;
        const totalRewards = expRewards + itemRewards + extraRewards;
        
        card.innerHTML = `
            <div class="quest-header ${progressClass}">
                <div class="quest-title">
                    <i class="bi bi-journal-text"></i>
                    <h4>${quest.name}</h4>
                </div>
                <div class="quest-id">ID: ${quest._id}</div>
            </div>
            <div class="quest-details">
                <div class="quest-description">${quest.desc}</div>
                
                <div class="quest-stats">
                    <div class="stat-item">
                        <div class="stat-label">Checkpoints</div>
                        <div class="stat-value">
                            <i class="bi bi-signpost-2-fill"></i> ${checkpointCount} Steps
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Rewards</div>
                        <div class="stat-value">
                            <i class="bi bi-gift-fill"></i> ${totalRewards} Total
                        </div>
                    </div>
                </div>
                
                <div class="checkpoint-progress">
                    <h5>Quest Progress Overview</h5>
                    <div class="progress-steps">
                        ${generateProgressSteps(quest.checkpoints)}
                    </div>
                </div>
                
                <div class="quest-summary">
                    <h5>Rewards Summary</h5>
                    <div class="rewards-summary">
                        ${expRewards > 0 ? `<span class="reward-badge exp-badge"><i class="bi bi-star-fill"></i> ${expRewards} Skills</span>` : ''}
                        ${itemRewards > 0 ? `<span class="reward-badge item-badge"><i class="bi bi-box-fill"></i> ${itemRewards} Items</span>` : ''}
                        ${extraRewards > 0 ? `<span class="reward-badge extra-badge"><i class="bi bi-plus-circle-fill"></i> ${extraRewards} Extras</span>` : ''}
                    </div>
                </div>
                
                <div class="quest-actions">
                    <button class="btn btn-primary view-quest-details">
                        <i class="bi bi-eye"></i> View Full Quest Details
                    </button>
                </div>
            </div>
        `;
        
        // Add event listener for view details button
        card.querySelector('.view-quest-details').addEventListener('click', () => {
            showQuestDetails(quest);
        });
        
        container.appendChild(card);
    });
}

function generateProgressSteps(checkpoints) {
    if (!checkpoints || checkpoints.length === 0) {
        return '<div class="no-checkpoints">No checkpoint data available</div>';
    }
    
    // Limit visible checkpoints to max 5 for preview
    const maxPreviewCheckpoints = 5;
    const showCountIndicator = checkpoints.length > maxPreviewCheckpoints;
    const previewCheckpoints = checkpoints.slice(0, maxPreviewCheckpoints);
    
    let stepsHTML = `
        <div class="checkpoint-timeline">
            ${previewCheckpoints.map((checkpoint, index) => `
                <div class="checkpoint-step">
                    <div class="step-number">${index}</div>
                    <div class="step-content">
                        <div class="step-title">Checkpoint ${index}</div>
                        <div class="step-description">${checkpoint.hint}</div>
                    </div>
                </div>
            `).join('')}
            ${showCountIndicator ? `
                <div class="checkpoint-step more-steps">
                    <div class="step-number">+${checkpoints.length - maxPreviewCheckpoints}</div>
                    <div class="step-content">
                        <div class="step-title">more steps...</div>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    return stepsHTML;
}

function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function showQuestDetails(quest) {
    const detailsPanel = document.getElementById('dataDetails');
    detailsPanel.classList.add('open');
    
    // Generate HTML for the quest details
    let detailsHTML = `
        <div class="details-header">
            <div class="quest-title">
                <i class="bi bi-journal-text"></i>
                <h3>${quest.name}</h3>
                <span class="quest-id-badge">Quest #${quest._id}</span>
            </div>
            <button id="closeDetails" class="btn btn-sm btn-outline-secondary">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
        <div class="details-content">
            <div class="quest-detail-section">
                <h4>Description</h4>
                <p class="quest-description">${quest.desc}</p>
            </div>
            
            <div class="quest-detail-section">
                <h4>Rewards</h4>
                ${generateRewardsHTML(quest.reward)}
            </div>
            
            <div class="quest-detail-section">
                <h4>Journey (${quest.checkpoints.length} steps)</h4>
                ${generateCheckpointsHTML(quest.checkpoints)}
            </div>
            
            <div class="details-actions mt-3">
                <button id="analyzeQuest" class="btn btn-primary">
                    <i class="bi bi-robot"></i> Get Quest Strategy
                </button>
            </div>
        </div>
    `;
    
    detailsPanel.innerHTML = detailsHTML;
    
    // Set up close button event
    document.getElementById('closeDetails').addEventListener('click', () => {
        detailsPanel.classList.remove('open');
    });
    
    // Set up AI analysis event
    document.getElementById('analyzeQuest').addEventListener('click', async () => {
        const analyzeBtn = document.getElementById('analyzeQuest');
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = `<i class="bi bi-hourglass-split"></i> Analyzing...`;
        
        try {
            const insights = await aiAssistant.suggestStrategies('questdefs', quest);
            
            // Add insights to the details panel
            const insightsSection = document.createElement('div');
            insightsSection.className = 'ai-insights mt-3';
            insightsSection.innerHTML = `
                <h4><i class="bi bi-lightbulb"></i> Quest Strategy & Tips</h4>
                <div class="insights-content">${marked.parse(insights)}</div>
            `;
            
            // Replace the button with the insights
            document.querySelector('.details-actions').replaceWith(insightsSection);
        } catch (error) {
            console.error("Error getting AI insights:", error);
            analyzeBtn.innerHTML = `<i class="bi bi-exclamation-triangle"></i> Error analyzing quest`;
            setTimeout(() => {
                analyzeBtn.disabled = false;
                analyzeBtn.innerHTML = `<i class="bi bi-robot"></i> Get Quest Strategy`;
            }, 2000);
        }
    });
}

function generateRewardsHTML(reward) {
    if (!reward) return '<p>No rewards specified</p>';
    
    let rewardsHTML = '<div class="rewards-container">';
    
    // Experience rewards
    if (reward.exp && reward.exp.length > 0) {
        rewardsHTML += `
            <div class="reward-section">
                <h5><i class="bi bi-star-fill"></i> Experience Rewards</h5>
                <div class="reward-items">
                    ${reward.exp.map(exp => `
                        <div class="reward-item exp-reward">
                            <div class="reward-icon">XP</div>
                            <div class="reward-details">
                                <div class="reward-name">${exp.skill.charAt(0).toUpperCase() + exp.skill.slice(1)}</div>
                                <div class="reward-value">
                                    ${exp.minAmount === exp.maxAmount 
                                        ? `${exp.minAmount} XP` 
                                        : `${exp.minAmount} - ${exp.maxAmount} XP`}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Item rewards
    if (reward.items && reward.items.length > 0) {
        rewardsHTML += `
            <div class="reward-section">
                <h5><i class="bi bi-box-fill"></i> Item Rewards</h5>
                <div class="reward-items">
                    ${reward.items.map(item => `
                        <div class="reward-item item-reward">
                            <div class="reward-icon">
                                <i class="bi bi-box"></i>
                            </div>
                            <div class="reward-details">
                                <div class="reward-name">
                                    ${getItemName(item.itemId)} (ID: ${item.itemId})
                                    ${item.isIOU ? '<span class="iou-tag">IOU</span>' : ''}
                                </div>
                                <div class="reward-value">${item.amt}× item${item.amt > 1 ? 's' : ''}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Extra rewards
    if (reward.extra && reward.extra.length > 0) {
        rewardsHTML += `
            <div class="reward-section">
                <h5><i class="bi bi-award-fill"></i> Additional Rewards</h5>
                <ul class="extra-rewards">
                    ${reward.extra.map(extra => `
                        <li><i class="bi bi-check-circle-fill"></i> ${extra}</li>
                    `).join('')}
                </ul>
            </div>
        `;
    }
    
    rewardsHTML += `</div>`;
    return rewardsHTML;
}

function generateCheckpointsHTML(checkpoints) {
    if (!checkpoints || checkpoints.length === 0) {
        return '<p>No checkpoints available</p>';
    }
    
    return `
        <div class="checkpoint-journey">
            ${checkpoints.map((checkpoint, index) => `
                <div class="journey-step">
                    <div class="step-number">${index}</div>
                    <div class="step-content">
                        <div class="step-title">Checkpoint ${index}</div>
                        <div class="step-description">${checkpoint.hint}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function applyQuestFilters(quests, container) {
    const sortBy = document.getElementById('sortQuests').value;
    
    // Make a copy of quests to sort
    let sortedQuests = [...quests];
    
    // Sort the quests
    switch (sortBy) {
        case 'id':
            sortedQuests.sort((a, b) => a._id - b._id);
            break;
        case 'id-desc':
            sortedQuests.sort((a, b) => b._id - a._id);
            break;
        case 'name':
            sortedQuests.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'checkpoints':
            sortedQuests.sort((a, b) => a.checkpoints.length - b.checkpoints.length);
            break;
        case 'checkpoints-desc':
            sortedQuests.sort((a, b) => b.checkpoints.length - a.checkpoints.length);
            break;
    }
    
    renderQuestCards(sortedQuests, container);
}

// Get AI insights for the current data source
async function getDataInsights(source) {
    const chatMessages = document.getElementById('chatMessages');
    
    // Add system message
    const systemMessage = document.createElement('div');
    systemMessage.className = 'message ai-message';
    systemMessage.innerHTML = `
        <div class="message-content">
            <p>What would you like to know about the ${formatSourceName(source)} data?</p>
            <div class="loading-message">
                <p>Analyzing data
                <span class="loading-dots">
                    <span>.</span><span>.</span><span>.</span>
                </span></p>
            </div>
        </div>
    `;
    chatMessages.appendChild(systemMessage);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    try {
        const insights = await aiAssistant.analyzeData(source);
        
        // Update system message with insights
        systemMessage.innerHTML = `
            <div class="message-content">
                <p>What would you like to know about the ${formatSourceName(source)} data?</p>
                <div class="data-insights">
                    <h5>Quick Insights:</h5>
                    ${marked.parse(insights)}
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error getting data insights:', error);
        systemMessage.innerHTML = `
            <div class="message-content">
                <p>What would you like to know about the ${formatSourceName(source)} data?</p>
            </div>
        `;
    }
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Render pickpocket cards
function renderPickpocketCards(pickpocketData, container) {
    // Clear container except for any headers
    const headers = container.querySelectorAll('.section-header');
    container.innerHTML = '';
    headers.forEach(header => container.appendChild(header));

    if (!Array.isArray(pickpocketData) || pickpocketData.length === 0) {
        const placeholder = document.createElement('div');
        placeholder.className = 'placeholder-message';
        placeholder.innerHTML = `<p>No pickpocket targets available</p>`;
        container.appendChild(placeholder);
        return;
    }

    // Create and append pickpocket cards
    pickpocketData.forEach(target => {
        // Determine success rate for display
        const successRate = formatPercentage(target.baseProbabilityOfSuccess);
        const maxSuccessRate = formatPercentage(target.maxLvlProbabilityOfSuccess);
        const successRateWidth = Math.min(100, Math.round(target.baseProbabilityOfSuccess * 100));
        
        // Calculate guaranteed vs. random loot
        const baseLootCount = target.baseLoot ? target.baseLoot.length : 0;
        const lootCount = target.loot ? target.loot.length : 0;
        const totalLoot = baseLootCount + lootCount;
        
        // Determine crime level requirement
        const crimeLevel = target.requirements && target.requirements.length > 0 
            ? target.requirements[0].level || 0 
            : 0;
        
        // Create difficulty class based on success rate
        let difficultyClass = 'difficulty-easy';
        if (target.baseProbabilityOfSuccess <= 0.25) {
            difficultyClass = 'difficulty-hard';
        } else if (target.baseProbabilityOfSuccess <= 0.5) {
            difficultyClass = 'difficulty-medium';
        }
        
        const card = document.createElement('div');
        card.className = 'pickpocket-card';
        card.setAttribute('data-target-id', target._id);
        
        card.innerHTML = `
            <div class="pickpocket-header ${difficultyClass}">
                <div class="pickpocket-title">
                    <i class="bi bi-person-fill-slash"></i>
                    <h4>${target.desc}</h4>
                </div>
                <div class="pickpocket-level">
                    <i class="bi bi-shield-lock-fill"></i> Level ${crimeLevel}
                </div>
            </div>
            <div class="pickpocket-details">
                <div class="pickpocket-stats">
                    <div class="stat-item">
                        <div class="stat-label">Success Rate</div>
                        <div class="stat-value">${successRate} - ${maxSuccessRate}</div>
                        <div class="probability-bar">
                            <div class="probability-fill" style="width: ${successRateWidth}%"></div>
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">XP Reward</div>
                        <div class="stat-value">${target.xp} XP</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Risk</div>
                        <div class="stat-value risk-indicator">
                            <i class="bi bi-exclamation-triangle risk-icon"></i>
                            <span class="risk-text">${target.stunDamage} damage (${target.stunTicks} ticks)</span>
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Loot Items</div>
                        <div class="stat-value">${totalLoot} total items</div>
                    </div>
                </div>
                
                ${renderLootSection(target.baseLoot, "Guaranteed Loot")}
                ${renderLootSection(target.loot, "Possible Loot", 5)} <!-- Limited to 5 items -->
                
                <div class="pickpocket-actions">
                    <button class="btn btn-sm btn-primary view-full-pickpocket">
                        <i class="bi bi-eye"></i> View Full Details
                    </button>
                </div>
            </div>
        `;
        
        // Add click handler to view full details
        card.querySelector('.view-full-pickpocket').addEventListener('click', () => {
            showItemDetails(target);
        });
        
        container.appendChild(card);
    });
}

// Export saved queries to a JSON file
function exportQueriesToFile() {
    // Get saved queries from localStorage
    const savedQueries = JSON.parse(localStorage.getItem('savedQueries') || '[]');
    
    if (savedQueries.length === 0) {
        showNotification('No saved queries to export', 'warning');
        return;
    }
    
    // Create a JSON string from the saved queries
    const jsonString = JSON.stringify(savedQueries, null, 2);
    
    // Create a Blob with the JSON data
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // Create a download link and click it
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = 'highspell_saved_queries.json';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    showNotification(`Exported ${savedQueries.length} queries successfully`, 'success');
}

// Trigger the hidden file input when the import button is clicked
function triggerImportQueriesFile() {
    document.getElementById('importQueriesFile').click();
}

// Handle the selected file for import
function handleImportQueriesFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedQueries = JSON.parse(e.target.result);
            
            // Validate the imported data structure
            if (!Array.isArray(importedQueries)) {
                throw new Error('Invalid format: Expected an array of queries');
            }
            
            // Check each query has the expected properties
            importedQueries.forEach(query => {
                if (!query.name || !query.state || !query.timestamp) {
                    throw new Error('Invalid query format: Missing required properties');
                }
            });
            
            // Get current saved queries
            const existingQueries = JSON.parse(localStorage.getItem('savedQueries') || '[]');
            
            if (existingQueries.length > 0) {
                // Prompt user to override or merge
                showImportConfirmation(importedQueries, existingQueries);
            } else {
                // No existing queries, just import directly
                localStorage.setItem('savedQueries', JSON.stringify(importedQueries));
                updateSavedQueriesList();
                showNotification(`Imported ${importedQueries.length} queries successfully`, 'success');
            }
            
        } catch (error) {
            console.error('Error importing queries:', error);
            showNotification(`Error importing queries: ${error.message}`, 'error');
        }
        
        // Reset the file input
        event.target.value = '';
    };
    
    reader.readAsText(file);
}

// Show the confirmation modal for import
function showImportConfirmation(importedQueries, existingQueries) {
    // Create the modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    
    // Create the modal content
    modalOverlay.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h4>Import Confirmation</h4>
            </div>
            <div class="modal-body">
                <p>You have ${existingQueries.length} existing saved queries and are importing ${importedQueries.length} queries.</p>
                <p>Would you like to override your existing queries or merge them with the imported ones?</p>
            </div>
            <div class="modal-footer">
                <button id="mergeQueries" class="btn btn-outline-secondary">No, Merge</button>
                <button id="overrideQueries" class="btn btn-primary">Yes, Override</button>
            </div>
        </div>
    `;
    
    // Add the modal to the document
    document.body.appendChild(modalOverlay);
    
    // Set up event listeners for the buttons
    document.getElementById('overrideQueries').addEventListener('click', () => {
        // Override existing queries
        localStorage.setItem('savedQueries', JSON.stringify(importedQueries));
        updateSavedQueriesList();
        showNotification(`Imported ${importedQueries.length} queries (overriding existing)`, 'success');
        document.body.removeChild(modalOverlay);
    });
    
    document.getElementById('mergeQueries').addEventListener('click', () => {
        // Merge queries (avoiding duplicates by name)
        const mergedQueries = [...existingQueries];
        
        // Track how many were added and how many were duplicates
        let addedCount = 0;
        let duplicateCount = 0;
        
        importedQueries.forEach(importedQuery => {
            // Check if a query with this name already exists
            const existingIndex = mergedQueries.findIndex(q => q.name === importedQuery.name);
            
            if (existingIndex >= 0) {
                // Duplicate found - we'll replace the existing one with the imported one
                mergedQueries[existingIndex] = importedQuery;
                duplicateCount++;
            } else {
                // New query - add it to the merged list
                mergedQueries.push(importedQuery);
                addedCount++;
            }
        });
        
        // Save the merged queries
        localStorage.setItem('savedQueries', JSON.stringify(mergedQueries));
        
        // Show a notification with details about the merge
        const message = `Merged ${importedQueries.length} queries: ${addedCount} added, ${duplicateCount} updated`;
        showNotification(message, 'success');
        
        document.body.removeChild(modalOverlay);
    });
    
    // Allow clicking the overlay to cancel
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            document.body.removeChild(modalOverlay);
        }
    });
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    updateSavedQueriesList();
    
    // Set up credits button event listener
    const creditsButton = document.getElementById('creditsButton');
    if (creditsButton) {
        creditsButton.addEventListener('click', (e) => {
            // URL is already set in the href attribute, but we could add analytics tracking here if needed
            console.log('Credits button clicked');
        });
    }
    
    // Map button functionality
    document.getElementById('mapButton').addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('mapIframeContainer').classList.add('open');
    });

    document.getElementById('closeMapIframe').addEventListener('click', function() {
        document.getElementById('mapIframeContainer').classList.remove('open');
        
        // Return to the previous play mode if applicable
        if (previousPlayMode === 'solo') {
            document.getElementById('gameClientContainer').classList.add('open');
        } else if (previousPlayMode === 'multi') {
            document.getElementById('multiClientContainer').classList.add('open');
        }
        
        // Reset previous mode
        previousPlayMode = null;
    });

    // Play button functionality
    document.getElementById('playButton').addEventListener('click', function(e) {
        e.preventDefault();
        
        // Check if solo client is already running but hidden
        const gameClient = document.getElementById('gameClientContainer');
        const gameIframe = document.getElementById('gameIframe');
        
        // Check if multi-client is already running but hidden
        const multiClient = document.getElementById('multiClientContainer');
        const hasMultiClientContent = multiClient.querySelector('#iframe-grid') && 
                                      multiClient.querySelector('#iframe-grid').children.length > 0;
        
        // If solo client is already loaded, just show it again
        if (gameIframe.src && gameIframe.src.includes('highspell.com')) {
            gameClient.classList.add('open');
            return;
        }
        
        // If multi-client is already loaded, just show it again
        if (hasMultiClientContent) {
            multiClient.classList.add('open');
            return;
        }
        
        // If no active sessions, show the game mode selector
        document.getElementById('gameModeSelector').style.display = 'flex';
    });

    // Solo mode selection
    document.getElementById('soloMode').addEventListener('click', function() {
        // Hide the game mode selector
        document.getElementById('gameModeSelector').style.display = 'none';
        
        // Open the solo client
        const gameClient = document.getElementById('gameClientContainer');
        gameClient.classList.add('open');
        
        // Set the iframe source
        document.getElementById('gameIframe').src = 'https://highspell.com';
        
        // Add map button if it doesn't exist already
        if (!gameClient.querySelector('.play-mode-map-button')) {
            const mapButton = document.createElement('button');
            mapButton.className = 'play-mode-map-button';
            mapButton.innerHTML = '<i class="bi bi-map"></i>';
            mapButton.title = "Open Map";
            mapButton.addEventListener('click', function() {
                // Remember we were in solo mode
                previousPlayMode = 'solo';
                // Hide the game client
                gameClient.classList.remove('open');
                // Show the map
                document.getElementById('mapIframeContainer').classList.add('open');
            });
            gameClient.appendChild(mapButton);
        }
    });

    // Multi mode selection
    document.getElementById('multiMode').addEventListener('click', function() {
        // Hide the game mode selector
        document.getElementById('gameModeSelector').style.display = 'none';
        
        // Generate and open the multi-client interface
        generateMultiClientInterface();
    });

    // Close buttons
    document.getElementById('closeGameClient').addEventListener('click', function() {
        // Close the solo client
        document.getElementById('gameClientContainer').classList.remove('open');
        
        // DO NOT clear the iframe source to allow session resumption
        // Removed: document.getElementById('gameIframe').src = '';
    });

    document.getElementById('cancelPlayMode').addEventListener('click', function() {
        // Hide the game mode selector
        document.getElementById('gameModeSelector').style.display = 'none';
    });
});

// Generate the multi-client interface
function generateMultiClientInterface() {
    const container = document.getElementById('multiClientContainer');
    
    // Add the multi-client HTML
    container.innerHTML = `
        <div class="container" id="iframe-grid">
            <!-- Iframes will be generated here -->
        </div>

        <!-- Number of Iframes Prompt -->
        <div class="overlay" id="iframe-count-overlay" style="display: flex;">
            <div class="dialog-box">
                <h3>Grid Settings</h3>
                
                <div class="settings-row">
                    <label for="iframe-count-input">Number of windows:</label>
                    <input type="number" id="iframe-count-input" min="1" max="36" value="6">
                </div>
                
                <div class="layout-controls">
                    <button id="prev-layout-btn">◀</button>
                    <span id="layout-display">2×3</span>
                    <button id="next-layout-btn">▶</button>
                </div>
                
                <div class="grid-preview-container">
                    <div class="grid-preview" id="grid-preview"></div>
                </div>
                
                <div>
                    <button id="confirm-count-btn">Confirm</button>
                    <button id="cancel-multi-client" class="cancel">Cancel</button>
                </div>
            </div>
        </div>
    `;
    
    // Show the multi-client container
    container.classList.add('open');
    
    // Add map button if it doesn't exist already
    if (!container.querySelector('.play-mode-map-button')) {
        const mapButton = document.createElement('button');
        mapButton.className = 'play-mode-map-button';
        mapButton.innerHTML = '<i class="bi bi-map"></i>';
        mapButton.title = "Open Map";
        mapButton.addEventListener('click', function() {
            // Remember we were in multi mode
            previousPlayMode = 'multi';
            // Hide the multi client
            container.classList.remove('open');
            // Show the map
            document.getElementById('mapIframeContainer').classList.add('open');
        });
        container.appendChild(mapButton);
    }
    
    // Initialize the multi-client interface
    initMultiClientInterface();
    
    // Add cancel button functionality
    document.getElementById('cancel-multi-client').addEventListener('click', function() {
        container.classList.remove('open');
    });
}

// Initialize the multi-client interface
function initMultiClientInterface() {
    // Configuration
    let TOTAL_WINDOWS = 6; // Default, will be updated by user input
    const MAX_WINDOWS = 36;
    const MIN_WINDOWS = 1;
    const TARGET_URL = 'https://highspell.com';
    
    // Grid layout configuration
    let currentLayoutIndex = 0;
    let availableLayouts = [];

    // Setup event listeners
    setupMultiClientEventListeners();
    
    // Initialize grid layout options and preview
    updateAvailableLayouts(TOTAL_WINDOWS);
    updateLayoutPreview();

    // Set up event listeners for multi-client
    function setupMultiClientEventListeners() {
        // Add iframe count confirmation button listener
        document.getElementById('confirm-count-btn').addEventListener('click', confirmIframeCount);
        
        // Allow Enter key to confirm
        document.getElementById('iframe-count-input').addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                confirmIframeCount();
            }
        });
        
        // Layout controls
        document.getElementById('prev-layout-btn').addEventListener('click', function() {
            if (currentLayoutIndex > 0) {
                currentLayoutIndex--;
                updateLayoutPreview();
            }
        });
        
        document.getElementById('next-layout-btn').addEventListener('click', function() {
            if (currentLayoutIndex < availableLayouts.length - 1) {
                currentLayoutIndex++;
                updateLayoutPreview();
            }
        });
        
        // Window count changes
        document.getElementById('iframe-count-input').addEventListener('change', function() {
            const count = parseInt(this.value);
            if (!isNaN(count) && count >= MIN_WINDOWS && count <= MAX_WINDOWS) {
                TOTAL_WINDOWS = count;
                updateAvailableLayouts(count);
                updateLayoutPreview();
            }
        });
    }

    // Create iframes based on user-selected count and layout
    function createIframes() {
        const container = document.getElementById('iframe-grid');
        container.innerHTML = ''; // Clear any existing content
        
        // Apply the selected grid layout
        const layout = availableLayouts[currentLayoutIndex];
        container.style.gridTemplateColumns = `repeat(${layout.columns}, 1fr)`;
        container.style.gridTemplateRows = `repeat(${layout.rows}, 1fr)`;
        
        for (let i = 1; i <= TOTAL_WINDOWS; i++) {
            const iframeContainer = document.createElement('div');
            iframeContainer.className = 'iframe-container';
            iframeContainer.setAttribute('data-id', i);
            
            // Use direct URL loading for all iframes
            const iframeContent = `
                <iframe src="${TARGET_URL}" id="iframe-${i}" title="Highspell Window ${i}"></iframe>
            `;
            
            iframeContainer.innerHTML = iframeContent;
            
            container.appendChild(iframeContainer);
        }
        
        // Add a close button to exit multi-client mode
        const closeButton = document.createElement('button');
        closeButton.className = 'multi-client-close-btn';
        closeButton.innerHTML = '<i class="bi bi-x-lg"></i>';
        closeButton.addEventListener('click', function() {
            // Just hide the container without clearing anything
            document.getElementById('multiClientContainer').classList.remove('open');
        });
        container.appendChild(closeButton);
    }

    // Process user input for iframe count and layout
    function confirmIframeCount() {
        const countInput = document.getElementById('iframe-count-input');
        let count = parseInt(countInput.value);
        
        // Validate input
        if (isNaN(count) || count < MIN_WINDOWS) {
            count = MIN_WINDOWS;
        } else if (count > MAX_WINDOWS) {
            count = MAX_WINDOWS;
        }
        
        TOTAL_WINDOWS = count;
        hideOverlay('iframe-count-overlay');
        
        // Create iframes directly
        createIframes();
    }

    // Hide any overlay
    function hideOverlay(overlayId) {
        document.getElementById(overlayId).style.display = 'none';
    }

    // Calculate all valid grid layouts for a given number of windows
    function updateAvailableLayouts(windowCount) {
        availableLayouts = [];
        
        // Find all factors of windowCount to create possible layouts
        for (let i = 1; i <= windowCount; i++) {
            if (windowCount % i === 0) {
                // Add both orientations (columns × rows)
                availableLayouts.push({
                    columns: i,
                    rows: windowCount / i
                });
                
                // Don't add duplicate layouts (e.g., 2×3 and 3×2 for 6 windows)
                if (i !== windowCount / i) {
                    availableLayouts.push({
                        columns: windowCount / i,
                        rows: i
                    });
                }
            }
        }
        
        // Sort layouts by columns (ascending)
        availableLayouts.sort((a, b) => a.columns - b.columns);
        
        // Reset current layout index to a sensible default
        // Pick a layout close to square (middle of the array)
        currentLayoutIndex = Math.floor(availableLayouts.length / 2);
    }

    // Update the visual preview of the grid layout
    function updateLayoutPreview() {
        if (availableLayouts.length === 0) return;
        
        const layout = availableLayouts[currentLayoutIndex];
        const preview = document.getElementById('grid-preview');
        const layoutDisplay = document.getElementById('layout-display');
        
        // Update the layout text display
        layoutDisplay.textContent = `${layout.columns}×${layout.rows}`;
        
        // Configure the preview grid
        preview.style.gridTemplateColumns = `repeat(${layout.columns}, 1fr)`;
        preview.style.gridTemplateRows = `repeat(${layout.rows}, 1fr)`;
        
        // Clear existing preview cells
        preview.innerHTML = '';
        
        // Create cells for preview
        for (let i = 0; i < TOTAL_WINDOWS; i++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            preview.appendChild(cell);
        }
    }
}