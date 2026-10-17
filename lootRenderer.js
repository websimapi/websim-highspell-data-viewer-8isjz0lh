// lootRenderer.js - Module for rendering loot table data

/**
 * Initialize the loot renderer
 */
export function initLootRenderer() {
    setupLootEventListeners();
}

/**
 * Set up event listeners for loot table UI
 */
function setupLootEventListeners() {
    // Event delegation for loot filtering
    document.addEventListener('click', (e) => {
        // Loot category filters
        if (e.target.closest('.loot-category-filter')) {
            const filterBtn = e.target.closest('.loot-category-filter');
            const category = filterBtn.getAttribute('data-category');
            
            document.querySelectorAll('.loot-category-filter').forEach(btn => {
                btn.classList.remove('active');
            });
            filterBtn.classList.add('active');
            
            filterLootByCategory(category);
        }
        
        // Sort options
        if (e.target.closest('.loot-sort-option')) {
            const sortBtn = e.target.closest('.loot-sort-option');
            const sortBy = sortBtn.getAttribute('data-sort');
            
            document.querySelectorAll('.loot-sort-option').forEach(btn => {
                btn.classList.remove('active');
            });
            sortBtn.classList.add('active');
            
            sortLootTables(sortBy);
        }
    });
}

/**
 * Organize the loot tables by type
 * @param {Object} lootData - The raw loot data
 * @returns {Object} - Organized loot data by type
 */
function organizeLootByType(lootData) {
    const organized = {
        npcLoot: Array.isArray(lootData.npcLootTables) ? lootData.npcLootTables : [],
        rareLoot: lootData.rareLootTable ? [lootData.rareLootTable] : [],
        rootLoot: Array.isArray(lootData.rootLootTables) ? lootData.rootLootTables : []
    };
    
    return organized;
}

/**
 * Render loot tables in the container
 * @param {Object} lootData - Loot table data
 * @param {HTMLElement} container - Container to render into
 */
export function renderLootTables(lootData, container) {
    if (!lootData || !container) {
        container.innerHTML = `
            <div class="placeholder-message">
                <i class="bi bi-exclamation-triangle"></i>
                <h3>Invalid loot data or container</h3>
            </div>
        `;
        return;
    }

    try {
        // Organize loot by type
        const organizedLoot = organizeLootByType(lootData);
        
        // Calculate total counts
        const totalCounts = {
            npcLoot: organizedLoot.npcLoot.length,
            rareLoot: organizedLoot.rareLoot.length,
            rootLoot: organizedLoot.rootLoot.length
        };
        const totalCount = totalCounts.npcLoot + totalCounts.rareLoot + totalCounts.rootLoot;
        
        // Create header with filters
        const header = createLootHeader(totalCounts, totalCount);
        
        // Create container for all loot cards
        const lootContainer = document.createElement('div');
        lootContainer.className = 'loot-container';
        lootContainer.id = 'lootContainer';
        
        // Create sections based on loot types
        if (totalCounts.npcLoot > 0) {
            const npcLootSection = createLootSection(
                'npc-loot',
                'NPC Loot Tables',
                'bi-person-fill',
                organizedLoot.npcLoot,
                renderNpcLootCard
            );
            lootContainer.appendChild(npcLootSection);
        }
        
        if (totalCounts.rareLoot > 0) {
            const rareLootSection = createLootSection(
                'rare-loot',
                'Rare Loot Table',
                'bi-gem',
                organizedLoot.rareLoot,
                renderRareLootCard
            );
            lootContainer.appendChild(rareLootSection);
        }
        
        if (totalCounts.rootLoot > 0) {
            const rootLootSection = createLootSection(
                'root-loot',
                'Root Loot Tables',
                'bi-tree',
                organizedLoot.rootLoot,
                renderRootLootCard
            );
            lootContainer.appendChild(rootLootSection);
        }
        
        // Clear container and append new content
        container.innerHTML = '';
        container.appendChild(header);
        container.appendChild(lootContainer);
        
        // Add click handlers for loot cards
        addLootCardHandlers(container, organizedLoot);
    } catch (error) {
        console.error('Error rendering loot tables:', error);
        container.innerHTML = `
            <div class="placeholder-message">
                <i class="bi bi-exclamation-triangle"></i>
                <h3>Error rendering loot tables</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

/**
 * Create the header with filters and search
 * @param {Object} counts - Counts by loot type
 * @param {number} totalCount - Total loot count
 * @returns {HTMLElement} - Header element
 */
function createLootHeader(counts, totalCount) {
    const header = document.createElement('div');
    header.className = 'loot-tables-header';
    
    header.innerHTML = `
        <div class="loot-filters">
            <div class="filter-group">
                <span class="filter-label">Filter by Type:</span>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-primary loot-category-filter active" data-category="all">
                        All Loot Tables (${totalCount})
                    </button>
                    ${counts.npcLoot > 0 ? `
                        <button class="btn btn-sm btn-outline-primary loot-category-filter" data-category="npc-loot">
                            <i class="bi bi-person-fill"></i> NPC Loot (${counts.npcLoot})
                        </button>
                    ` : ''}
                    ${counts.rareLoot > 0 ? `
                        <button class="btn btn-sm btn-outline-primary loot-category-filter" data-category="rare-loot">
                            <i class="bi bi-gem"></i> Rare Loot (${counts.rareLoot})
                        </button>
                    ` : ''}
                    ${counts.rootLoot > 0 ? `
                        <button class="btn btn-sm btn-outline-primary loot-category-filter" data-category="root-loot">
                            <i class="bi bi-tree"></i> Root Loot (${counts.rootLoot})
                        </button>
                    ` : ''}
                </div>
            </div>
            <div class="filter-group">
                <span class="filter-label">Sort by:</span>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-secondary loot-sort-option active" data-sort="id">ID</button>
                    <button class="btn btn-sm btn-outline-secondary loot-sort-option" data-sort="name">Name</button>
                    <button class="btn btn-sm btn-outline-secondary loot-sort-option" data-sort="items">Item Count</button>
                    <button class="btn btn-sm btn-outline-secondary loot-sort-option" data-sort="rarity">Rarity</button>
                </div>
            </div>
        </div>
        <div class="loot-search">
            <input type="text" id="lootSearch" class="form-control form-control-sm" placeholder="Search loot tables by NPC name or item...">
            <small class="search-hint">Search by NPC name, item name, or description</small>
        </div>
    `;
    
    // Add event listener for search
    setTimeout(() => {
        const searchInput = header.querySelector('#lootSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchLootTables(e.target.value);
            });
        }
    }, 0);
    
    return header;
}

/**
 * Create a section for a specific loot type
 * @param {string} type - Loot type
 * @param {string} title - Section title
 * @param {string} icon - Bootstrap icon class
 * @param {Array} items - Loot items
 * @param {Function} cardRenderer - Function to render individual cards
 * @returns {HTMLElement} - Section element
 */
function createLootSection(type, title, icon, items, cardRenderer) {
    const section = document.createElement('div');
    section.className = `loot-section ${type}-section`;
    section.setAttribute('data-type', type);
    
    section.innerHTML = `
        <h3 class="loot-section-header">
            <i class="bi ${icon}"></i>
            ${title}
            <span class="loot-count">(${items.length})</span>
        </h3>
        <div class="loot-cards" id="${type}-cards">
            ${items.map(item => cardRenderer(item, type)).join('')}
        </div>
    `;
    
    return section;
}

/**
 * Render an NPC loot card
 * @param {Object} loot - NPC loot data
 * @param {string} type - Loot type
 * @returns {string} - HTML string for the card
 */
function renderNpcLootCard(loot, type) {
    // Calculate total items
    const baseLootCount = loot.baseLoot ? loot.baseLoot.length : 0;
    const lootCount = loot.loot ? loot.loot.length : 0;
    const totalItems = baseLootCount + lootCount;
    
    // Format loot chance percentage if exists
    let rareLootChance = "";
    if (loot.rareLootProbability && loot.rareLootProbability > 0) {
        rareLootChance = formatPercentage(loot.rareLootProbability);
    }
    
    // Format root loot chance percentage if exists
    let rootLootChance = "";
    if (loot.rootLoot && loot.rootLoot.probability > 0) {
        rootLootChance = formatPercentage(loot.rootLoot.probability);
    }
    
    // Get all preview items from base loot and regular loot
    let allPreviewItems = [];
    
    // Collect base loot items first (they're guaranteed)
    if (loot.baseLoot && loot.baseLoot.length > 0) {
        allPreviewItems.push(...loot.baseLoot.map(item => ({...item, isGuaranteed: true})));
    }
    
    // Then collect regular loot items
    if (loot.loot && loot.loot.length > 0) {
        allPreviewItems.push(...loot.loot.map(item => ({...item, isGuaranteed: false})));
    }
    
    // Sort by rarity (odds) - rarest items first
    // Guaranteed items (baseLoot) come before non-guaranteed items with the same odds
    allPreviewItems.sort((a, b) => {
        // If one is guaranteed and the other is not, guaranteed comes first
        if (a.isGuaranteed && !b.isGuaranteed) return -1;
        if (!a.isGuaranteed && b.isGuaranteed) return 1;
        
        // If both have odds, sort by odds (lower odds = rarer = comes first)
        if (a.odds !== undefined && b.odds !== undefined) {
            return a.odds - b.odds;
        }
        
        // If only one has odds (the other is guaranteed with no odds), the one with odds comes after
        if (a.odds !== undefined && b.odds === undefined) return 1;
        if (a.odds === undefined && b.odds !== undefined) return -1;
        
        // If neither has odds, sort by item ID
        return a.itemId - b.itemId;
    });
    
    // Limit visible items to 5, but keep all in DOM for search purposes
    const maxVisibleItems = 5;
    const hasMoreItems = allPreviewItems.length > maxVisibleItems;
    
    return `
        <div class="loot-card ${type}-card" data-loot-id="${loot._id}" data-loot-type="npc">
            <div class="loot-card-header">
                <div class="loot-title-container">
                    <i class="bi bi-person-fill"></i>
                    <h4 class="loot-title">${loot.npc || `NPC Loot #${loot._id}`}</h4>
                </div>
                <div class="loot-id">#${loot._id}</div>
            </div>
            <div class="loot-card-body">
                <div class="loot-stats">
                    ${rareLootChance ? `
                        <div class="loot-stat">
                            <div class="stat-label">Rare Loot Chance</div>
                            <div class="stat-value">${rareLootChance}</div>
                            <div class="probability-bar">
                                <div class="probability-fill" style="width: ${Math.min(100, Math.round(loot.rareLootProbability * 100))}%"></div>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${rootLootChance ? `
                        <div class="loot-stat">
                            <div class="stat-label">Root Loot Chance</div>
                            <div class="stat-value">${rootLootChance} (Table #${loot.rootLoot.tableId})</div>
                            <div class="probability-bar">
                                <div class="probability-fill" style="width: ${Math.min(100, Math.round(loot.rootLoot.probability * 100))}%"></div>
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <div class="items-preview">
                    <div class="items-preview-title">
                        <span>Loot Items</span>
                        <span class="items-count">${totalItems} items</span>
                    </div>
                    <div class="preview-items">
                        ${allPreviewItems.map((item, index) => `
                            <div class="preview-item ${index >= maxVisibleItems ? 'hidden-item' : ''}" 
                                title="${item.name || 'Item ' + item.itemId} (${formatPercentage(item.odds || 1)})"
                                data-item-id="${item.itemId}">
                                ${item.amount}× ${item.name || `Item #${item.itemId}`} ${item.isGuaranteed ? '(Guaranteed)' : item.odds ? `(${formatPercentage(item.odds)})` : ''}
                            </div>
                        `).join('')}
                        ${hasMoreItems ? `
                            <div class="preview-item more-items">
                                +${allPreviewItems.length - maxVisibleItems} more items...
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                ${loot.treasureMap ? `
                    <div class="treasure-info">
                        <i class="bi bi-map-fill treasure-icon"></i>
                        <span class="treasure-text">Level ${loot.treasureMap.level} treasure map (${formatPercentage(loot.treasureMap.odds)} chance)</span>
                    </div>
                ` : ''}
            </div>
            <div class="loot-card-footer">
                <button class="btn btn-sm btn-outline-primary view-loot-details">
                    <i class="bi bi-eye"></i> View Details
                </button>
            </div>
        </div>
    `;
}

/**
 * Render a rare loot card
 * @param {Object} loot - Rare loot data
 * @param {string} type - Loot type
 * @returns {string} - HTML string for the card
 */
function renderRareLootCard(loot, type) {
    // Calculate total items
    const lootCount = loot.loot ? loot.loot.length : 0;
    
    // Get all preview items
    const previewItems = loot.loot ? loot.loot : [];
    
    // Sort by rarity (odds) - rarest items first
    const sortedItems = [...previewItems].sort((a, b) => {
        if (a.odds !== undefined && b.odds !== undefined) {
            return a.odds - b.odds;
        }
        return 0;
    });
    
    // Limit visible items to 5, but keep all in DOM for search purposes
    const maxVisibleItems = 5;
    const hasMoreItems = sortedItems.length > maxVisibleItems;
    
    return `
        <div class="loot-card ${type}-card" data-loot-id="${loot._id}" data-loot-type="rare">
            <div class="loot-card-header">
                <div class="loot-title-container">
                    <i class="bi bi-gem"></i>
                    <h4 class="loot-title">Rare Loot Table</h4>
                </div>
                <div class="loot-id">#${loot._id}</div>
            </div>
            <div class="loot-card-body">
                <div class="items-preview">
                    <div class="items-preview-title">
                        <span>Rare Loot Items</span>
                        <span class="items-count">${lootCount} items</span>
                    </div>
                    <div class="preview-items">
                        ${sortedItems.map((item, index) => `
                            <div class="preview-item ${index >= maxVisibleItems ? 'hidden-item' : ''}" 
                                title="${item.name || 'Item ' + item.itemId} (${formatPercentage(item.odds)})"
                                data-item-id="${item.itemId}">
                                ${item.amount}× ${item.name || `Item #${item.itemId}`} (${formatPercentage(item.odds)})
                            </div>
                        `).join('')}
                        ${hasMoreItems ? `
                            <div class="preview-item more-items">
                                +${sortedItems.length - maxVisibleItems} more items...
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
            <div class="loot-card-footer">
                <button class="btn btn-sm btn-outline-primary view-loot-details">
                    <i class="bi bi-eye"></i> View Details
                </button>
            </div>
        </div>
    `;
}

/**
 * Render a root loot card
 * @param {Object} loot - Root loot data
 * @param {string} type - Loot type
 * @returns {string} - HTML string for the card
 */
function renderRootLootCard(loot, type) {
    // Calculate total items
    const lootCount = loot.loot ? loot.loot.length : 0;
    
    // Get all preview items
    const previewItems = loot.loot ? loot.loot : [];
    
    // Sort by rarity (odds) - rarest items first
    const sortedItems = [...previewItems].sort((a, b) => {
        if (a.odds !== undefined && b.odds !== undefined) {
            return a.odds - b.odds;
        }
        return 0;
    });
    
    // Limit visible items to 5, but keep all in DOM for search purposes
    const maxVisibleItems = 5;
    const hasMoreItems = sortedItems.length > maxVisibleItems;
    
    return `
        <div class="loot-card ${type}-card" data-loot-id="${loot._id}" data-loot-type="root">
            <div class="loot-card-header">
                <div class="loot-title-container">
                    <i class="bi bi-tree"></i>
                    <h4 class="loot-title">${loot.desc || `Root Loot Table #${loot._id}`}</h4>
                </div>
                <div class="loot-id">#${loot._id}</div>
            </div>
            <div class="loot-card-body">
                <div class="items-preview">
                    <div class="items-preview-title">
                        <span>Root Loot Items</span>
                        <span class="items-count">${lootCount} items</span>
                    </div>
                    <div class="preview-items">
                        ${sortedItems.map((item, index) => `
                            <div class="preview-item ${index >= maxVisibleItems ? 'hidden-item' : ''}" 
                                title="${item.name || 'Item ' + item.itemId} (${formatPercentage(item.odds)})"
                                data-item-id="${item.itemId}">
                                ${item.amount}× ${item.name || `Item #${item.itemId}`} (${formatPercentage(item.odds)})
                            </div>
                        `).join('')}
                        ${hasMoreItems ? `
                            <div class="preview-item more-items">
                                +${sortedItems.length - maxVisibleItems} more items...
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
            <div class="loot-card-footer">
                <button class="btn btn-sm btn-outline-primary view-loot-details">
                    <i class="bi bi-eye"></i> View Details
                </button>
            </div>
        </div>
    `;
}

/**
 * Add click handlers to loot cards
 * @param {HTMLElement} container - The container element
 * @param {Object} lootData - The loot data by type
 */
function addLootCardHandlers(container, lootData) {
    container.addEventListener('click', (e) => {
        // Handle clicks on loot cards or their detail buttons
        const lootCard = e.target.closest('.loot-card');
        const detailButton = e.target.closest('.view-loot-details');
        
        if (lootCard && (detailButton || !e.target.closest('button'))) {
            const lootId = parseInt(lootCard.getAttribute('data-loot-id'));
            const lootType = lootCard.getAttribute('data-loot-type');
            
            // Find the loot data
            let lootItem;
            switch (lootType) {
                case 'npc':
                    lootItem = lootData.npcLoot.find(l => l._id === lootId);
                    break;
                case 'rare':
                    lootItem = lootData.rareLoot.find(l => l._id === lootId);
                    break;
                case 'root':
                    lootItem = lootData.rootLoot.find(l => l._id === lootId);
                    break;
            }
            
            if (lootItem) {
                showLootDetails(lootItem, lootType);
            }
        }
    });
}

/**
 * Show detailed view of loot item
 * @param {Object} loot - Loot data
 * @param {string} lootType - Type of loot
 */
function showLootDetails(loot, lootType) {
    const detailsPanel = document.getElementById('dataDetails');
    if (!detailsPanel) return;
    
    detailsPanel.classList.add('open');
    
    // Generate HTML based on loot type
    let detailsHTML = '';
    
    switch (lootType) {
        case 'npc':
            detailsHTML = generateNpcLootDetails(loot);
            break;
        case 'rare':
            detailsHTML = generateRareLootDetails(loot);
            break;
        case 'root':
            detailsHTML = generateRootLootDetails(loot);
            break;
    }
    
    detailsPanel.innerHTML = detailsHTML;
    
    // Set up close button
    document.getElementById('closeDetails').addEventListener('click', () => {
        detailsPanel.classList.remove('open');
    });
    
    // Set up AI analysis button
    document.getElementById('analyzeLoot').addEventListener('click', async () => {
        const analyzeBtn = document.getElementById('analyzeLoot');
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = `<i class="bi bi-hourglass-split"></i> Analyzing...`;
        
        try {
            // Access aiAssistant from window object to ensure it's defined
            const aiAssistant = window.aiAssistant;
            const lootTypeParam = lootType === 'npc' ? 'npcloot' : 
                                 lootType === 'rare' ? 'rareLootTable' : 'rootLootTables';
            const insights = await aiAssistant.suggestStrategies(lootTypeParam, loot);
            
            // Add insights to the details panel
            const insightsSection = document.createElement('div');
            insightsSection.className = 'ai-insights mt-3';
            insightsSection.innerHTML = `
                <h4><i class="bi bi-lightbulb"></i> AI Analysis</h4>
                <div class="insights-content">${marked.parse(insights)}</div>
            `;
            
            // Replace the button with the insights
            document.querySelector('.details-actions').replaceWith(insightsSection);
        } catch (error) {
            console.error("Error getting AI insights:", error);
            analyzeBtn.innerHTML = `<i class="bi bi-exclamation-triangle"></i> Error analyzing loot`;
            setTimeout(() => {
                analyzeBtn.disabled = false;
                analyzeBtn.innerHTML = `<i class="bi bi-robot"></i> Get AI Analysis`;
            }, 2000);
        }
    });
}

/**
 * Generate details HTML for NPC loot
 * @param {Object} loot - NPC loot data
 * @returns {string} - HTML for details panel
 */
function generateNpcLootDetails(loot) {
    return `
        <div class="details-header">
            <div class="loot-title">
                <i class="bi bi-person-fill"></i>
                <h3>${loot.npc || `NPC Loot #${loot._id}`}</h3>
                <span class="npc-id-badge">ID #${loot._id}</span>
            </div>
            <button id="closeDetails" class="btn btn-sm btn-outline-secondary">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
        <div class="details-content">
            <div class="loot-detail-section">
                <h4>Loot Properties</h4>
                <div class="loot-properties">
                    ${loot.rareLootProbability > 0 ? `
                        <div class="loot-property">
                            <span class="property-label">Rare Loot Chance</span>
                            <span class="property-value">${formatPercentage(loot.rareLootProbability)}</span>
                        </div>
                    ` : ''}
                    
                    ${loot.rootLoot ? `
                        <div class="loot-property">
                            <span class="property-label">Root Loot Chance</span>
                            <span class="property-value">${formatPercentage(loot.rootLoot.probability)}</span>
                        </div>
                        <div class="loot-property">
                            <span class="property-label">Root Loot Table</span>
                            <span class="property-value">Table #${loot.rootLoot.tableId}</span>
                        </div>
                    ` : ''}
                    
                    ${loot.treasureMap ? `
                        <div class="loot-property">
                            <span class="property-label">Treasure Map Level</span>
                            <span class="property-value">Level ${loot.treasureMap.level}</span>
                        </div>
                        <div class="loot-property">
                            <span class="property-label">Treasure Map Chance</span>
                            <span class="property-value">${formatPercentage(loot.treasureMap.odds)}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            ${loot.baseLoot && loot.baseLoot.length > 0 ? `
                <div class="loot-detail-section">
                    <h4><i class="bi bi-box-fill"></i> Guaranteed Loot</h4>
                    <div class="items-grid">
                        ${loot.baseLoot.map(item => generateLootItemHTML(item, true)).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${loot.loot && loot.loot.length > 0 ? `
                <div class="loot-detail-section">
                    <h4><i class="bi bi-dice-5-fill"></i> Possible Loot</h4>
                    <div class="items-grid">
                        ${loot.loot.map(item => generateLootItemHTML(item, false)).join('')}
                    </div>
                </div>
            ` : ''}
            
            <div class="details-actions mt-3">
                <button id="analyzeLoot" class="btn btn-primary">
                    <i class="bi bi-robot"></i> Get AI Analysis
                </button>
                ${loot.rootLoot ? `
                    <button id="viewRootTable" class="btn btn-outline-secondary ml-2" onclick="findAndShowRootTable(${loot.rootLoot.tableId})">
                        <i class="bi bi-tree"></i> View Root Table #${loot.rootLoot.tableId}
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Generate details HTML for rare loot
 * @param {Object} loot - Rare loot data
 * @returns {string} - HTML for details panel
 */
function generateRareLootDetails(loot) {
    return `
        <div class="details-header">
            <div class="loot-title">
                <i class="bi bi-gem"></i>
                <h3>Rare Loot Table</h3>
                <span class="npc-id-badge">ID #${loot._id}</span>
            </div>
            <button id="closeDetails" class="btn btn-sm btn-outline-secondary">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
        <div class="details-content">
            <div class="loot-detail-section">
                <h4>Rare Loot Table Properties</h4>
                <div class="loot-properties">
                    <div class="loot-property">
                        <span class="property-label">Table ID</span>
                        <span class="property-value">${loot._id}</span>
                    </div>
                    <div class="loot-property">
                        <span class="property-label">Items Count</span>
                        <span class="property-value">${loot.loot ? loot.loot.length : 0} items</span>
                    </div>
                </div>
            </div>
            
            ${loot.loot && loot.loot.length > 0 ? `
                <div class="loot-detail-section">
                    <h4><i class="bi bi-gem"></i> Rare Loot Items</h4>
                    <div class="items-grid">
                        ${loot.loot.map(item => generateLootItemHTML(item, false)).join('')}
                    </div>
                </div>
            ` : ''}
            
            <div class="details-actions mt-3">
                <button id="analyzeLoot" class="btn btn-primary">
                    <i class="bi bi-robot"></i> Get AI Analysis
                </button>
            </div>
        </div>
    `;
}

/**
 * Generate details HTML for root loot
 * @param {Object} loot - Root loot data
 * @returns {string} - HTML for details panel
 */
function generateRootLootDetails(loot) {
    return `
        <div class="details-header">
            <div class="loot-title">
                <i class="bi bi-tree"></i>
                <h3>${loot.desc || `Root Loot Table #${loot._id}`}</h3>
                <span class="npc-id-badge">ID #${loot._id}</span>
            </div>
            <button id="closeDetails" class="btn btn-sm btn-outline-secondary">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
        <div class="details-content">
            <div class="loot-detail-section">
                <h4>Root Loot Table Properties</h4>
                <div class="loot-properties">
                    <div class="loot-property">
                        <span class="property-label">Table ID</span>
                        <span class="property-value">${loot._id}</span>
                    </div>
                    <div class="loot-property">
                        <span class="property-label">Description</span>
                        <span class="property-value">${loot.desc || "No description"}</span>
                    </div>
                    <div class="loot-property">
                        <span class="property-label">Items Count</span>
                        <span class="property-value">${loot.loot ? loot.loot.length : 0} items</span>
                    </div>
                </div>
            </div>
            
            ${loot.loot && loot.loot.length > 0 ? `
                <div class="loot-detail-section">
                    <h4><i class="bi bi-tree"></i> Root Loot Items</h4>
                    <div class="items-grid">
                        ${loot.loot.map(item => generateLootItemHTML(item, false)).join('')}
                    </div>
                </div>
            ` : ''}
            
            <div class="details-actions mt-3">
                <button id="analyzeLoot" class="btn btn-primary">
                    <i class="bi bi-robot"></i> Get AI Analysis
                </button>
            </div>
        </div>
    `;
}

/**
 * Generate HTML for a loot item
 * @param {Object} item - Loot item data
 * @param {boolean} isGuaranteed - Whether the item is guaranteed
 * @returns {string} - HTML for the item
 */
function generateLootItemHTML(item, isGuaranteed) {
    // Determine rarity class
    let rarityClass = isGuaranteed ? 'guaranteed-item' : '';
    
    if (!isGuaranteed && item.odds) {
        if (item.odds <= 0.001) {
            rarityClass = 'ultra-rare-item';
        } else if (item.odds <= 0.01) {
            rarityClass = 'very-rare-item';
        } else if (item.odds <= 0.05) {
            rarityClass = 'rare-item';
        }
    }
    
    return `
        <div class="loot-item ${rarityClass}">
            <div class="loot-item-header">
                <div class="loot-item-name">${item.name || `Item #${item.itemId}`}</div>
                ${!isGuaranteed && item.odds ? `
                    <div class="loot-item-odds">${formatPercentage(item.odds)}</div>
                ` : ''}
            </div>
            <div class="loot-item-details">
                <div class="loot-item-amount">${item.amount}× (ID: ${item.itemId})</div>
                ${item.isIOU ? '<div class="loot-iou-tag">IOU</div>' : ''}
                ${!isGuaranteed && item.odds ? `
                    <div class="loot-odds-bar">
                        <div class="loot-odds-fill" style="width: ${Math.min(100, Math.round(item.odds * 100))}%"></div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Format percentage value
 * @param {number} value - Value between 0 and 1
 * @returns {string} - Formatted percentage
 */
function formatPercentage(value) {
    if (!value && value !== 0) return "0%";
    
    const percentage = value * 100;
    
    if (percentage < 0.01) {
        return percentage.toFixed(4) + '%';
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

/**
 * Filter loot tables by category
 * @param {string} category - Category to filter by
 */
function filterLootByCategory(category) {
    const sections = document.querySelectorAll('.loot-section');
    
    if (category === 'all') {
        sections.forEach(section => {
            section.style.display = 'block';
        });
    } else {
        sections.forEach(section => {
            if (section.getAttribute('data-type') === category) {
                section.style.display = 'block';
            } else {
                section.style.display = 'none';
            }
        });
    }
}

/**
 * Sort loot tables
 * @param {string} sortBy - Property to sort by
 */
function sortLootTables(sortBy) {
    // Sort each section separately
    document.querySelectorAll('.loot-section').forEach(section => {
        const cardsContainer = section.querySelector('.loot-cards');
        if (!cardsContainer) return;
        
        const cards = Array.from(cardsContainer.querySelectorAll('.loot-card'));
        if (cards.length === 0) return;
        
        // Sort the cards
        cards.sort((a, b) => {
            const idA = parseInt(a.getAttribute('data-loot-id'));
            const idB = parseInt(b.getAttribute('data-loot-id'));
            const typeA = a.getAttribute('data-loot-type');
            const typeB = b.getAttribute('data-loot-type');
            
            switch (sortBy) {
                case 'id':
                    return idA - idB;
                case 'name':
                    const nameA = a.querySelector('.loot-title').textContent;
                    const nameB = b.querySelector('.loot-title').textContent;
                    return nameA.localeCompare(nameB);
                case 'items':
                    const itemsA = parseInt(a.querySelector('.items-count')?.textContent || '0');
                    const itemsB = parseInt(b.querySelector('.items-count')?.textContent || '0');
                    return itemsB - itemsA; // Sort by most items first
                case 'rarity':
                    // Sort by rare loot probability
                    const probabilityBarA = a.querySelector('.probability-bar');
                    const probabilityBarB = b.querySelector('.probability-bar');
                    
                    // Default values if no probability
                    let rarityA = 0;
                    let rarityB = 0;
                    
                    // Get rarity from width of probability bar if exists
                    if (probabilityBarA) {
                        const fillA = probabilityBarA.querySelector('.probability-fill');
                        if (fillA) {
                            rarityA = parseInt(fillA.style.width) || 0;
                        }
                    }
                    
                    if (probabilityBarB) {
                        const fillB = probabilityBarB.querySelector('.probability-fill');
                        if (fillB) {
                            rarityB = parseInt(fillB.style.width) || 0;
                        }
                    }
                    
                    // Sort by most rare first (highest probability)
                    return rarityB - rarityA;
                default:
                    return 0;
            }
        });
        
        // Clear and re-append sorted cards
        cardsContainer.innerHTML = '';
        cards.forEach(card => {
            cardsContainer.appendChild(card);
        });
    });
}

/**
 * Search loot tables by name or item
 * @param {string} query - Search query
 */
function searchLootTables(query) {
    const cards = document.querySelectorAll('.loot-card');
    const sections = document.querySelectorAll('.loot-section');
    const lowercaseQuery = query.toLowerCase();
    
    if (!query) {
        // Show all cards and sections
        cards.forEach(card => card.style.display = 'flex');
        sections.forEach(section => section.style.display = 'block');
        
        // Reset hidden items to respect the max visible items limit
        cards.forEach(card => {
            const visibleItems = Array.from(card.querySelectorAll('.preview-item:not(.more-items)')).slice(0, 5);
            const hiddenItems = Array.from(card.querySelectorAll('.preview-item:not(.more-items)')).slice(5);
            const moreItems = card.querySelector('.more-items');
            
            visibleItems.forEach(item => item.classList.remove('hidden-item'));
            hiddenItems.forEach(item => item.classList.add('hidden-item'));
            
            if (moreItems) {
                moreItems.style.display = hiddenItems.length > 0 ? 'block' : 'none';
            }
        });
        
        // Remove no results message if it exists
        const noResults = document.getElementById('noLootResults');
        if (noResults) noResults.remove();
        
        return;
    }
    
    // Track if we found any matches
    let foundMatch = false;
    const visibleByType = {};
    
    // Check each card
    cards.forEach(card => {
        // Get searchable text from the card
        const title = card.querySelector('.loot-title')?.textContent.toLowerCase() || '';
        const previewItems = Array.from(card.querySelectorAll('.preview-item:not(.more-items)'))
            .map(item => item.textContent.toLowerCase());
        const type = card.getAttribute('data-loot-type');
        
        // Check if the query matches any text
        const matchesTitle = title.includes(lowercaseQuery);
        const matchesItems = previewItems.some(item => item.includes(lowercaseQuery));
        
        if (matchesTitle || matchesItems) {
            card.style.display = 'flex';
            foundMatch = true;
            if (type === 'npc') visibleByType['npc-loot'] = true;
            else if (type === 'rare') visibleByType['rare-loot'] = true;
            else if (type === 'root') visibleByType['root-loot'] = true;
            
            // If searching, show all matching items including hidden ones
            if (matchesItems) {
                // First hide all items
                card.querySelectorAll('.preview-item:not(.more-items)').forEach(item => {
                    if (item.textContent.toLowerCase().includes(lowercaseQuery)) {
                        item.classList.remove('hidden-item');
                    } else {
                        item.classList.add('hidden-item');
                    }
                });
                
                // Hide "more items" indicator during search
                const moreItems = card.querySelector('.more-items');
                if (moreItems) moreItems.style.display = 'none';
            }
        } else {
            card.style.display = 'none';
        }
    });
    
    // Show/hide sections based on visible cards
    sections.forEach(section => {
        const type = section.getAttribute('data-type');
        if (visibleByType[type]) {
            section.style.display = 'block';
        } else {
            section.style.display = 'none';
        }
    });
    
    // Show or update no results message
    let noResults = document.getElementById('noLootResults');
    if (!foundMatch) {
        if (!noResults) {
            noResults = document.createElement('div');
            noResults.id = 'noLootResults';
            noResults.className = 'no-results-message';
            noResults.innerHTML = `
                <i class="bi bi-search"></i>
                <p>No loot tables found matching "${query}"</p>
                <button class="btn btn-sm btn-outline-secondary reset-search">
                    Clear Search
                </button>
            `;
            
            const container = document.getElementById('lootContainer');
            if (container) container.appendChild(noResults);
            
            // Add event listener to reset button
            setTimeout(() => {
                const resetButton = noResults.querySelector('.reset-search');
                if (resetButton) {
                    resetButton.addEventListener('click', () => {
                        document.getElementById('lootSearch').value = '';
                        searchLootTables('');
                    });
                }
            }, 0);
        }
    } else if (noResults) {
        noResults.remove();
    }
}

// Export utility functions for use in app.js
export { formatPercentage };

// Function to find and show a root loot table by ID
window.findAndShowRootTable = function(tableId) {
    // Find the root loot section
    const rootSection = document.querySelector('.root-loot-section');
    if (!rootSection) return;
    
    // Make sure the root section is visible
    rootSection.style.display = 'block';
    
    // Find the card with the matching ID
    const rootCard = rootSection.querySelector(`.loot-card[data-loot-id="${tableId}"]`);
    if (!rootCard) return;
    
    // Scroll to the card and highlight it
    rootCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Add a temporary highlight effect
    rootCard.classList.add('highlight-card');
    setTimeout(() => {
        rootCard.classList.remove('highlight-card');
    }, 2000);
};