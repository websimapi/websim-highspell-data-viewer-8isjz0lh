// npcRenderer.js - Module for rendering NPC data

/**
 * Initialize the NPC renderer
 */
export function initNpcRenderer() {
    setupNpcEventListeners();
}

/**
 * Set up event listeners for NPC UI interactions
 */
function setupNpcEventListeners() {
    // Event delegation for NPC filtering
    document.addEventListener('click', (e) => {
        // NPC category filters
        if (e.target.closest('.npc-category-filter')) {
            const filterBtn = e.target.closest('.npc-category-filter');
            const category = filterBtn.getAttribute('data-category');
            
            document.querySelectorAll('.npc-category-filter').forEach(btn => {
                btn.classList.remove('active');
            });
            filterBtn.classList.add('active');
            
            filterNpcsByCategory(category);
        }
        
        // Sort options
        if (e.target.closest('.npc-sort-option')) {
            const sortBtn = e.target.closest('.npc-sort-option');
            const sortBy = sortBtn.getAttribute('data-sort');
            
            document.querySelectorAll('.npc-sort-option').forEach(btn => {
                btn.classList.remove('active');
            });
            sortBtn.classList.add('active');
            
            sortNpcs(sortBy);
        }
    });
}

/**
 * Categorize NPCs by type
 * @param {Array} npcs - Array of NPC objects
 * @returns {Object} - Object with NPCs organized by category
 */
function categorizeNpcs(npcs) {
    const categories = {
        'shopkeepers': [],
        'combat': [],
        'pickpocketable': [],
        'quest': [],
        'other': []
    };
    
    npcs.forEach(npc => {
        if (npc.canShop) {
            categories.shopkeepers.push(npc);
        } else if (npc.pickpocketId) {
            categories.pickpocketable.push(npc);
        } else if (npc.combat && Object.keys(npc.combat).length > 0) {
            categories.combat.push(npc);
        } else if (npc.moveEagerness === 0 || npc.description && (
            npc.description.toLowerCase().includes('quest') || 
            npc.description.toLowerCase().includes('guard'))) {
            categories.quest.push(npc);
        } else {
            categories.other.push(npc);
        }
    });
    
    return categories;
}

/**
 * Render NPCs in the container
 * @param {Array} npcs - Array of NPC objects
 * @param {HTMLElement} container - Container to render into
 */
export function renderNpcs(npcs, container) {
    if (!npcs || !container) {
        container.innerHTML = `
            <div class="placeholder-message">
                <i class="bi bi-exclamation-triangle"></i>
                <h3>Invalid NPC data or container</h3>
            </div>
        `;
        return;
    }
    
    try {
        // Categorize NPCs
        const npcCategories = categorizeNpcs(npcs);
        
        // Create header with filters
        const header = createNpcHeader(npcCategories);
        
        // Create container for all NPC cards
        const npcsContainer = document.createElement('div');
        npcsContainer.className = 'npcs-container';
        npcsContainer.id = 'npcsContainer';
        
        // Create category sections
        for (const [category, categoryNpcs] of Object.entries(npcCategories)) {
            if (categoryNpcs.length === 0) continue;
            
            const section = document.createElement('div');
            section.className = 'npc-category-section';
            section.setAttribute('data-category', category);
            
            section.innerHTML = `
                <h3 class="category-header">
                    <i class="bi ${getCategoryIcon(category)}"></i>
                    ${formatCategoryName(category)}
                    <span class="npc-count">(${categoryNpcs.length})</span>
                </h3>
                <div class="npc-cards-grid" id="${category}Npcs">
                    ${categoryNpcs.map(npc => createNpcCard(npc, category)).join('')}
                </div>
            `;
            
            npcsContainer.appendChild(section);
        }
        
        // Clear container and append new content
        container.innerHTML = '';
        container.appendChild(header);
        container.appendChild(npcsContainer);
        
        // Add click handlers for NPC cards
        addNpcCardHandlers(container, npcs);
    } catch (error) {
        console.error('Error rendering NPCs:', error);
        container.innerHTML = `
            <div class="placeholder-message">
                <i class="bi bi-exclamation-triangle"></i>
                <h3>Error rendering NPCs</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

/**
 * Create the header with filters and search
 * @param {Object} npcCategories - NPCs organized by category
 * @returns {HTMLElement} - Header element
 */
function createNpcHeader(npcCategories) {
    const header = document.createElement('div');
    header.className = 'npcs-header';
    
    // Count total NPCs
    let totalCount = 0;
    const categoryCounts = {};
    
    for (const [category, npcs] of Object.entries(npcCategories)) {
        categoryCounts[category] = npcs.length;
        totalCount += npcs.length;
    }
    
    header.innerHTML = `
        <div class="npc-filters">
            <div class="filter-group">
                <span class="filter-label">Filter by Category:</span>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-primary npc-category-filter active" data-category="all">
                        All NPCs (${totalCount})
                    </button>
                    ${Object.entries(categoryCounts).map(([category, count]) => 
                        count > 0 ? `
                            <button class="btn btn-sm btn-outline-primary npc-category-filter" data-category="${category}">
                                <i class="bi ${getCategoryIcon(category)}"></i> ${formatCategoryName(category)} (${count})
                            </button>
                        ` : ''
                    ).join('')}
                </div>
            </div>
            <div class="filter-group">
                <span class="filter-label">Sort by:</span>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-secondary npc-sort-option active" data-sort="id">ID</button>
                    <button class="btn btn-sm btn-outline-secondary npc-sort-option" data-sort="name">Name</button>
                    <button class="btn btn-sm btn-outline-secondary npc-sort-option" data-sort="type">Type</button>
                    <button class="btn btn-sm btn-outline-secondary npc-sort-option" data-sort="moveEagerness">Movement</button>
                </div>
            </div>
        </div>
        <div class="npc-search">
            <input type="text" id="npcSearch" class="form-control form-control-sm" placeholder="Search NPCs by name, description or stats...">
            <small class="search-hint">Try searching for "warrior", "level 10", "lvl 10", "hp 50", "acc 20", "def 30", etc.</small>
        </div>
    `;
    
    // Add event listener for search
    setTimeout(() => {
        const searchInput = header.querySelector('#npcSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchNpcs(e.target.value);
            });
        }
    }, 0);
    
    return header;
}

/**
 * Create an individual NPC card
 * @param {Object} npc - NPC data object
 * @param {string} category - Category the NPC belongs to
 * @returns {string} - HTML string for the NPC card
 */
function createNpcCard(npc, category) {
    // Determine special traits
    const hasCombat = npc.combat && Object.keys(npc.combat).length > 0;
    const canShop = npc.canShop === true || npc.canShop === "✓";
    const canPickpocket = npc.pickpocketId && npc.pickpocketId !== "-";
    
    // Generate traits badges
    const traitsBadges = [];
    
    if (canShop) {
        traitsBadges.push(`<span class="trait-badge shop-badge"><i class="bi bi-shop"></i> Shop</span>`);
    }
    
    if (canPickpocket) {
        traitsBadges.push(`<span class="trait-badge pickpocket-badge"><i class="bi bi-person-fill-slash"></i> Pickpocket</span>`);
    }
    
    if (hasCombat) {
        const combatLevel = npc.combat.level || "?";
        traitsBadges.push(`<span class="trait-badge combat-badge"><i class="bi bi-shield-fill"></i> Combat ${combatLevel}</span>`);
    }
    
    const appearanceSummary = npc.appearance ? summarizeAppearance(npc.appearance) : "";
    
    let combatDataAttributes = '';
    if (npc.combat) {
        if (npc.combat.level) combatDataAttributes += ` data-level="${npc.combat.level}"`;
        if (npc.combat.hitpoints) combatDataAttributes += ` data-hp="${npc.combat.hitpoints}"`;
        if (npc.combat.accuracy) combatDataAttributes += ` data-accuracy="${npc.combat.accuracy}"`;
        if (npc.combat.defense) combatDataAttributes += ` data-defense="${npc.combat.defense}"`;
        if (npc.combat.maxDamage) combatDataAttributes += ` data-damage="${npc.combat.maxDamage}"`;
    }
    
    return `
        <div class="npc-card ${category}-npc" data-npc-id="${npc._id}">
            <div class="npc-card-header">
                <h4 class="npc-name">${npc.name}</h4>
                <span class="npc-id">#${npc._id}</span>
            </div>
            <div class="npc-card-body" ${combatDataAttributes}>
                <p class="npc-description">${npc.description || "No description"}</p>
                
                ${appearanceSummary ? `<div class="npc-appearance-preview">${appearanceSummary}</div>` : ""}
                
                <div class="npc-traits">
                    ${traitsBadges.length > 0 ? traitsBadges.join('') : '<span class="no-special-traits">No special traits</span>'}
                </div>
            </div>
            <div class="npc-card-footer">
                <div class="npc-stats">
                    <div class="npc-stat">
                        <span class="stat-label">Movement:</span>
                        <span class="stat-value">${formatMovement(npc.moveEagerness)}</span>
                    </div>
                </div>
                <button class="btn btn-sm btn-outline-primary view-npc-details">
                    <i class="bi bi-eye"></i> Details
                </button>
            </div>
        </div>
    `;
}

/**
 * Add click handlers to NPC cards
 * @param {HTMLElement} container - Container with NPC cards
 * @param {Array} npcsData - Original NPC data
 */
function addNpcCardHandlers(container, npcsData) {
    container.addEventListener('click', (e) => {
        const npcCard = e.target.closest('.npc-card');
        const detailButton = e.target.closest('.view-npc-details');
        
        if (npcCard && (detailButton || !e.target.closest('button'))) {
            const npcId = parseInt(npcCard.getAttribute('data-npc-id'));
            const npc = npcsData.find(n => n._id === npcId);
            
            if (npc) {
                showNpcDetails(npc);
            }
        }
    });
}

/**
 * Show detailed view of NPC
 * @param {Object} npc - NPC data object
 */
function showNpcDetails(npc) {
    const detailsPanel = document.getElementById('dataDetails');
    if (!detailsPanel) return;
    
    detailsPanel.classList.add('open');
    
    // Format combat stats if present
    let combatStatsHTML = '';
    if (npc.combat && Object.keys(npc.combat).length > 0) {
        combatStatsHTML = `
            <div class="detail-section">
                <h4><i class="bi bi-shield-fill"></i> Combat Information</h4>
                <div class="combat-stats">
                    ${npc.combat.level ? `<div class="combat-stat"><span>Level:</span> ${npc.combat.level}</div>` : ''}
                    ${npc.combat.hitpoints ? `<div class="combat-stat"><span>HP:</span> ${npc.combat.hitpoints}</div>` : ''}
                    ${npc.combat.accuracy ? `<div class="combat-stat"><span>Accuracy:</span> ${npc.combat.accuracy}</div>` : ''}
                    ${npc.combat.maxDamage ? `<div class="combat-stat"><span>Max Damage:</span> ${npc.combat.maxDamage}</div>` : ''}
                    ${npc.combat.defense ? `<div class="combat-stat"><span>Defense:</span> ${npc.combat.defense}</div>` : ''}
                    ${npc.combat.attackSpeed ? `<div class="combat-stat"><span>Attack Speed:</span> ${npc.combat.attackSpeed}</div>` : ''}
                </div>
                ${npc.combat.drops ? `
                    <div class="combat-drops">
                        <h5>Combat Drops</h5>
                        <div class="drops-grid">
                            ${formatCombatDrops(npc.combat.drops)}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    // Format appearance if present
    let appearanceHTML = '';
    if (npc.appearance && Object.keys(npc.appearance).length > 0) {
        appearanceHTML = `
            <div class="detail-section">
                <h4><i class="bi bi-person-fill"></i> Appearance</h4>
                <div class="appearance-details">
                    ${Object.entries(npc.appearance).map(([key, value]) => `
                        <div class="appearance-detail">
                            <span class="detail-label">${formatAppearanceKey(key)}:</span>
                            <span class="detail-value">${formatAppearanceValue(key, value)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Format pickpocket information if present
    let pickpocketHTML = '';
    if (npc.pickpocketId && npc.pickpocketId !== "-") {
        pickpocketHTML = `
            <div class="detail-section">
                <h4><i class="bi bi-person-fill-slash"></i> Pickpocketing</h4>
                <p>This NPC can be pickpocketed (Pickpocket ID: ${npc.pickpocketId})</p>
                <button id="viewPickpocketDetails" class="btn btn-sm btn-outline-info">
                    <i class="bi bi-eye"></i> View Pickpocket Details
                </button>
            </div>
        `;
    }
    
    // Format shop information if present
    let shopHTML = '';
    if (npc.canShop === true || npc.canShop === "✓") {
        shopHTML = `
            <div class="detail-section">
                <h4><i class="bi bi-shop"></i> Shop</h4>
                <p>This NPC operates a shop</p>
                <button id="viewShopInventory" class="btn btn-sm btn-outline-info">
                    <i class="bi bi-bag"></i> View Shop Inventory
                </button>
            </div>
        `;
    }
    
    detailsPanel.innerHTML = `
        <div class="details-header">
            <div class="npc-title">
                <i class="bi bi-person-fill"></i>
                <h3>${npc.name}</h3>
                <span class="npc-id-badge">NPC #${npc._id}</span>
            </div>
            <button id="closeDetails" class="btn btn-sm btn-outline-secondary">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
        <div class="details-content">
            <div class="detail-section">
                <h4>Basic Information</h4>
                <p class="npc-full-description">${npc.description || "No description available"}</p>
                <div class="npc-basic-details">
                    <div class="basic-detail">
                        <span class="detail-label">Movement Eagerness:</span>
                        <span class="detail-value">${formatMovement(npc.moveEagerness)}</span>
                    </div>
                </div>
            </div>
            
            ${combatStatsHTML}
            ${pickpocketHTML}
            ${shopHTML}
            
            <div class="details-actions mt-3">
                <button id="analyzeNpc" class="btn btn-primary">
                    <i class="bi bi-robot"></i> Get AI Analysis
                </button>
            </div>
        </div>
    `;
    
    // Set up close button
    document.getElementById('closeDetails').addEventListener('click', () => {
        detailsPanel.classList.remove('open');
    });
    
    // Set up view pickpocket details button
    const pickpocketButton = document.getElementById('viewPickpocketDetails');
    if (pickpocketButton) {
        pickpocketButton.addEventListener('click', () => {
            // Get dataStore from window object to fix the reference error
            const dataStore = window.dataStore;
            viewPickpocketDetails(npc.pickpocketId, dataStore);
        });
    }
    
    // Set up view shop inventory button
    const shopButton = document.getElementById('viewShopInventory');
    if (shopButton) {
        shopButton.addEventListener('click', () => {
            // Get dataStore from window object to fix the reference error
            const dataStore = window.dataStore;
            viewShopInventory(npc._id, npc.name, dataStore);
        });
    }
    
    // Set up AI analysis button
    document.getElementById('analyzeNpc').addEventListener('click', async () => {
        const analyzeBtn = document.getElementById('analyzeNpc');
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = `<i class="bi bi-hourglass-split"></i> Analyzing...`;
        
        try {
            // Access aiAssistant from the window object to ensure it's defined
            const aiAssistant = window.aiAssistant;
            const insights = await aiAssistant.suggestStrategies('npcentitydefs', npc);
            
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
            analyzeBtn.innerHTML = `<i class="bi bi-exclamation-triangle"></i> Error analyzing NPC`;
            setTimeout(() => {
                analyzeBtn.disabled = false;
                analyzeBtn.innerHTML = `<i class="bi bi-robot"></i> Get AI Analysis`;
            }, 2000);
        }
    });
}

/**
 * View pickpocket details for a specific pickpocket ID
 * @param {number|string} pickpocketId - Pickpocket definition ID
 * @param {Object} dataStore - Data store with game data
 */
function viewPickpocketDetails(pickpocketId, dataStore) {
    // Check if the pickpocket data is loaded
    if (!dataStore || !dataStore.pickpocketdefs || !dataStore.pickpocketdefs.pickpocketing) {
        showNotification("Pickpocket data not available", "error");
        return;
    }
    
    const pickpocketData = dataStore.pickpocketdefs.pickpocketing;
    const pickpocket = pickpocketData.find(p => p._id === parseInt(pickpocketId));
    
    if (!pickpocket) {
        showNotification(`Pickpocket #${pickpocketId} not found`, "error");
        return;
    }
    
    // Save current view state
    const currentSource = dataStore.currentSource;
    const currentData = dataStore.currentData;
    
    // Switch to pickpocket data
    dataStore.currentSource = 'pickpocketdefs';
    // Show item details
    showItemDetails(pickpocket);
    
    // Add a back button to return to NPC view
    const detailsPanel = document.getElementById('dataDetails');
    if (detailsPanel) {
        const backButton = document.createElement('button');
        backButton.className = 'btn btn-outline-secondary btn-sm mt-3';
        backButton.innerHTML = '<i class="bi bi-arrow-left"></i> Back to NPC';
        backButton.addEventListener('click', () => {
            // Restore NPC view
            dataStore.currentSource = currentSource;
            dataStore.currentData = currentData;
            // Re-render the NPC details
            const npcId = parseInt(pickpocket._id);
            const npc = dataStore.npcentitydefs.find(n => n.pickpocketId === npcId.toString() || n.pickpocketId === npcId);
            if (npc) {
                showNpcDetails(npc);
            }
        });
        
        // Add the back button to the top of the details panel
        const detailsHeader = detailsPanel.querySelector('.details-header');
        detailsHeader.appendChild(backButton);
    }
}

/**
 * View shop inventory for an NPC
 * @param {number} npcId - NPC ID
 * @param {string} npcName - NPC name
 * @param {Object} dataStore - Data store with game data
 */
function viewShopInventory(npcId, npcName, dataStore) {
    // Check if the shop data is loaded
    if (!dataStore || !dataStore.shopdefs) {
        showNotification("Shop data not available", "error");
        return;
    }
    
    // Try to find a shop with a name that matches the NPC name
    const shopData = dataStore.shopdefs;
    let shop = shopData.find(s => s.name.toLowerCase().includes(npcName.toLowerCase()));
    
    // If not found, try the first shop that might be related
    if (!shop) {
        // Get the first part of the NPC name (e.g., "Hank" from "Hank the shopkeeper")
        const firstName = npcName.split(' ')[0];
        shop = shopData.find(s => s.name.toLowerCase().includes(firstName.toLowerCase()));
    }
    
    if (!shop) {
        showNotification(`Shop for ${npcName} not found`, "warning");
        return;
    }
    
    // Save current view state
    const currentSource = dataStore.currentSource;
    const currentData = dataStore.currentData;
    
    // Get the details panel and open it
    const detailsPanel = document.getElementById('dataDetails');
    if (detailsPanel) {
        detailsPanel.classList.add('open');
        
        // Use our custom shop renderer
        renderShopDetails(shop, detailsPanel);
        
        // Add a back button to return to NPC view
        const backButton = document.createElement('button');
        backButton.className = 'btn btn-outline-secondary btn-sm back-to-npc-btn';
        backButton.innerHTML = '<i class="bi bi-arrow-left"></i> Back to NPC';
        backButton.addEventListener('click', () => {
            // Restore NPC view
            dataStore.currentSource = currentSource;
            dataStore.currentData = currentData;
            // Re-render the NPC details
            const npc = dataStore.npcentitydefs.find(n => n._id === npcId);
            if (npc) {
                showNpcDetails(npc);
            }
        });
        
        // Add the back button to the top of the details panel
        const detailsHeader = detailsPanel.querySelector('.details-header');
        detailsHeader.appendChild(backButton);
    }
}

/**
 * Render shop details in a nice UI format
 * @param {Object} shop - Shop data object
 * @param {HTMLElement} container - Container element
 */
function renderShopDetails(shop, container) {
    // Create a detailed view of the shop inventory with better UI/UX
    let detailsHTML = `
        <div class="details-header">
            <div class="shop-title">
                <i class="bi bi-shop"></i>
                <h3>${shop.name}</h3>
                <span class="shop-id-badge">Shop #${shop._id}</span>
            </div>
            <button id="closeDetails" class="btn btn-sm btn-outline-secondary">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
        <div class="details-content">
            <div class="detail-section">
                <h4>Shop Information</h4>
                <p class="shop-description">${shop.description || "No description available"}</p>
                <div class="shop-policy">
                    ${shop.canBuyTemporaryItems ? 
                        '<span class="policy-badge policy-allow"><i class="bi bi-check-circle"></i> Accepts temporary items</span>' : 
                        '<span class="policy-badge policy-deny"><i class="bi bi-x-circle"></i> Does not accept temporary items</span>'}
                </div>
            </div>
            
            <div class="detail-section">
                <h4>Shop Inventory</h4>
                <div class="inventory-grid">
                    ${renderShopItems(shop.items)}
                </div>
            </div>
            
            <div class="details-actions mt-3">
                <button id="analyzeShop" class="btn btn-primary">
                    <i class="bi bi-robot"></i> Get Shop Analysis
                </button>
            </div>
        </div>
    `;
    
    container.innerHTML = detailsHTML;
    
    // Set up close button
    document.getElementById('closeDetails').addEventListener('click', () => {
        container.classList.remove('open');
    });
    
    // Set up AI analysis button
    document.getElementById('analyzeShop').addEventListener('click', async () => {
        const analyzeBtn = document.getElementById('analyzeShop');
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = `<i class="bi bi-hourglass-split"></i> Analyzing...`;
        
        try {
            const aiAssistant = window.aiAssistant;
            const insights = await aiAssistant.suggestStrategies('shopdefs', shop);
            
            // Add insights to the details panel
            const insightsSection = document.createElement('div');
            insightsSection.className = 'ai-insights mt-3';
            insightsSection.innerHTML = `
                <h4><i class="bi bi-lightbulb"></i> Shop Analysis</h4>
                <div class="insights-content">${marked.parse(insights)}</div>
            `;
            
            // Replace the button with the insights
            document.querySelector('.details-actions').replaceWith(insightsSection);
        } catch (error) {
            console.error("Error getting AI insights:", error);
            analyzeBtn.innerHTML = `<i class="bi bi-exclamation-triangle"></i> Error analyzing shop`;
            setTimeout(() => {
                analyzeBtn.disabled = false;
                analyzeBtn.innerHTML = `<i class="bi bi-robot"></i> Get Shop Analysis`;
            }, 2000);
        }
    });
}

/**
 * Render shop items in a grid
 * @param {Array} items - Array of shop items
 * @returns {string} - HTML for shop items grid
 */
function renderShopItems(items) {
    if (!items || !Array.isArray(items) || items.length === 0) {
        return '<p class="no-items">No items in this shop</p>';
    }
    
    return items.map(item => {
        // Determine stock status
        const inStock = item.amount > 0;
        const stockClass = inStock ? 'in-stock' : 'out-of-stock';
        
        return `
            <div class="shop-item ${stockClass}">
                <div class="item-header">
                    <span class="item-name">${getItemName(item.id)} (ID: ${item.id})</span>
                    <span class="item-stock ${stockClass}">
                        ${inStock ? `<i class="bi bi-check-circle"></i> In Stock (${item.amount})` : 
                                   '<i class="bi bi-x-circle"></i> Out of Stock'}
                    </span>
                </div>
                <div class="item-details">
                    <div class="detail-row">
                        <span class="detail-label">Price:</span>
                        <span class="detail-value price-value">${item.cost} coins</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Restock Speed:</span>
                        <span class="detail-value">${item.restockSpeed} ticks</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Filter NPCs by category
 * @param {string} category - Category to filter by
 */
function filterNpcsByCategory(category) {
    const sections = document.querySelectorAll('.npc-category-section');
    
    if (category === 'all') {
        sections.forEach(section => {
            section.style.display = 'block';
        });
    } else {
        sections.forEach(section => {
            if (section.getAttribute('data-category') === category) {
                section.style.display = 'block';
            } else {
                section.style.display = 'none';
            }
        });
    }
}

/**
 * Sort NPCs in the current view
 * @param {string} sortBy - Property to sort by
 */
function sortNpcs(sortBy) {
    const sections = document.querySelectorAll('.npc-category-section');
    
    sections.forEach(section => {
        const cardsContainer = section.querySelector('.npc-cards-grid');
        if (!cardsContainer) return;
        
        const cards = Array.from(cardsContainer.querySelectorAll('.npc-card'));
        if (cards.length === 0) return;
        
        // Sort the cards
        cards.sort((a, b) => {
            const idA = parseInt(a.getAttribute('data-npc-id'));
            const idB = parseInt(b.getAttribute('data-npc-id'));
            
            switch (sortBy) {
                case 'id':
                    return idA - idB;
                case 'name':
                    const nameA = a.querySelector('.npc-name').textContent;
                    const nameB = b.querySelector('.npc-name').textContent;
                    return nameA.localeCompare(nameB);
                case 'type':
                    const typeA = a.className.match(/(\w+)-npc/)[1];
                    const typeB = b.className.match(/(\w+)-npc/)[1];
                    return typeA.localeCompare(typeB);
                case 'moveEagerness':
                    const moveA = a.querySelector('.stat-value').textContent;
                    const moveB = b.querySelector('.stat-value').textContent;
                    // Extract numeric values from movement indicators
                    const numA = parseFloat(moveA.match(/[\d.]+/)?.[0] || 0);
                    const numB = parseFloat(moveB.match(/[\d.]+/)?.[0] || 0);
                    return numB - numA; // Sort from highest to lowest
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
 * Search NPCs by name or description
 * @param {string} query - Search query
 */
function searchNpcs(query) {
    const cards = document.querySelectorAll('.npc-card');
    const sections = document.querySelectorAll('.npc-category-section');
    const lowercaseQuery = query.toLowerCase();
    
    if (!query) {
        // Show all cards and sections
        cards.forEach(card => card.style.display = 'block');
        sections.forEach(section => section.style.display = 'block');
        
        // Remove no results message if it exists
        const noResults = document.getElementById('noNpcResults');
        if (noResults) noResults.remove();
        
        return;
    }
    
    // Track if we found any matches
    let foundMatch = false;
    const visibleByCategory = {};
    
    // Check if query contains a number for stat searching
    const numericQuery = query.match(/\d+/);
    const numeric = numericQuery ? parseInt(numericQuery[0]) : null;
    
    // Normalize search terms with aliases
    let normalizedQuery = lowercaseQuery;
    
    // Replace all alias terms with their full forms for searching
    // Do this with regex to ensure we catch the terms as whole words
    normalizedQuery = normalizedQuery
        .replace(/\blvl\b/g, 'level') // lvl -> level
        .replace(/\bhp\b/g, 'hitpoints') // hp -> hitpoints
        .replace(/\bhp\b/g, 'health') // hp -> health (alternate form)
        .replace(/\bacc\b/g, 'accuracy') // acc -> accuracy
        .replace(/\bdef\b/g, 'defense') // def -> defense/defence
        .replace(/\bdef\b/g, 'defence'); // def -> defense/defence
    
    // Check each card
    cards.forEach(card => {
        const name = card.querySelector('.npc-name')?.textContent.toLowerCase() || '';
        const description = card.querySelector('.npc-description')?.textContent.toLowerCase() || '';
        const category = card.className.match(/(\w+)-npc/)[1];
        
        // Check for combat stats in the card if query contains stat-related terms
        let statMatch = false;
        // Original search terms
        const hasLevelTerm = lowercaseQuery.includes('level') || lowercaseQuery.includes('lvl');
        const hasHpTerm = lowercaseQuery.includes('hp') || lowercaseQuery.includes('hitpoints') || lowercaseQuery.includes('health');
        const hasAccuracyTerm = lowercaseQuery.includes('accuracy') || lowercaseQuery.includes('acc');
        const hasDefenseTerm = lowercaseQuery.includes('defense') || lowercaseQuery.includes('defence') || lowercaseQuery.includes('def');
        const hasDamageTerm = lowercaseQuery.includes('damage');
        
        if (hasLevelTerm || hasHpTerm || hasAccuracyTerm || hasDefenseTerm || hasDamageTerm || numeric !== null) {
            
            // Get combat badges if any
            const combatBadge = card.querySelector('.combat-badge');
            if (combatBadge) {
                const combatText = combatBadge.textContent.toLowerCase();
                // Check level in combat badge - ONLY if level term is present or no specific stat term
                if ((hasLevelTerm || (numeric !== null && !hasHpTerm && !hasAccuracyTerm && !hasDefenseTerm && !hasDamageTerm)) && 
                    combatText.includes('combat') && combatText.match(/\d+/)) {
                    // Extract the numeric level from combat badge
                    const badgeLevel = parseInt(combatText.match(/\d+/)[0]);
                    // Check if level matches the numeric query
                    if (numeric === null || badgeLevel === numeric) {
                        statMatch = true;
                    }
                }
            }
            
            // Check combat stats in any data attributes we might have
            const npcId = card.getAttribute('data-npc-id');
            if (npcId) {
                // Get the full NPC data from our dataStore if available globally
                const npcData = window.dataStore?.npcentitydefs?.find(n => n._id === parseInt(npcId));
                if (npcData && npcData.combat) {
                    const combat = npcData.combat;
                    
                    // Match level - ONLY if level term is present
                    if (hasLevelTerm && combat.level !== undefined) {
                        if (numeric === null || combat.level === numeric) {
                            statMatch = true;
                        }
                    }
                    
                    // Match HP - ONLY if HP term is present
                    if (hasHpTerm && combat.hitpoints !== undefined) {
                        if (numeric === null || combat.hitpoints === numeric) {
                            statMatch = true;
                        }
                    }
                    
                    // Match accuracy - ONLY if accuracy term is present
                    if (hasAccuracyTerm && combat.accuracy !== undefined) {
                        if (numeric === null || combat.accuracy === numeric) {
                            statMatch = true;
                        }
                    }
                    
                    // Match defense - ONLY if defense term is present
                    if (hasDefenseTerm && combat.defense !== undefined) {
                        if (numeric === null || combat.defense === numeric) {
                            statMatch = true;
                        }
                    }
                    
                    // Match damage - ONLY if damage term is present
                    if (hasDamageTerm && combat.maxDamage !== undefined) {
                        if (numeric === null || combat.maxDamage === numeric) {
                            statMatch = true;
                        }
                    }
                    
                    // If the user just entered a number without any keywords, check all numeric stats
                    if (numeric !== null && !hasLevelTerm && !hasHpTerm && 
                        !hasAccuracyTerm && !hasDefenseTerm && !hasDamageTerm) {
                        
                        if (combat.level === numeric || combat.hitpoints === numeric || 
                            combat.accuracy === numeric || combat.defense === numeric || 
                            combat.maxDamage === numeric || combat.attackSpeed === numeric) {
                            statMatch = true;
                        }
                    }
                }
            }
        }
        
        if (name.includes(lowercaseQuery) || description.includes(lowercaseQuery) || statMatch) {
            card.style.display = 'block';
            foundMatch = true;
            visibleByCategory[category] = true;
        } else {
            card.style.display = 'none';
        }
    });
    
    // Show/hide sections based on visible cards
    sections.forEach(section => {
        const category = section.getAttribute('data-category');
        if (visibleByCategory[category]) {
            section.style.display = 'block';
        } else {
            section.style.display = 'none';
        }
    });
    
    // Show or update no results message
    let noResults = document.getElementById('noNpcResults');
    if (!foundMatch) {
        if (!noResults) {
            noResults = document.createElement('div');
            noResults.id = 'noNpcResults';
            noResults.className = 'no-results-message';
            noResults.innerHTML = `
                <i class="bi bi-search"></i>
                <p>No NPCs found matching "${query}"</p>
                <button class="btn btn-sm btn-outline-secondary reset-search">
                    Clear Search
                </button>
            `;
            
            const container = document.getElementById('npcsContainer');
            if (container) container.appendChild(noResults);
            
            // Add event listener to reset button
            setTimeout(() => {
                const resetButton = noResults.querySelector('.reset-search');
                if (resetButton) {
                    resetButton.addEventListener('click', () => {
                        document.getElementById('npcSearch').value = '';
                        searchNpcs('');
                    });
                }
            }, 0);
        }
    } else if (noResults) {
        noResults.remove();
    }
}

/**
 * Show a notification to the user
 * @param {string} message - Message to display
 * @param {string} type - Notification type ('success', 'error', 'warning', 'info')
 */
function showNotification(message, type = 'info') {
    // Use the global function if available, otherwise create a simple alert
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        alert(`${type.toUpperCase()}: ${message}`);
    }
}

/**
 * Call the global showItemDetails function
 * @param {Object} item - Item to show details for
 */
function showItemDetails(item) {
    if (typeof window.showItemDetails === 'function') {
        window.showItemDetails(item);
    } else {
        console.error('showItemDetails function not available');
        showNotification('Unable to show item details', 'error');
    }
}

/* --- Helper functions --- */

/**
 * Get icon for an NPC category
 * @param {string} category - NPC category
 * @returns {string} - Bootstrap icon class
 */
function getCategoryIcon(category) {
    switch (category) {
        case 'shopkeepers': return 'bi-shop';
        case 'combat': return 'bi-shield-fill';
        case 'pickpocketable': return 'bi-person-fill-slash';
        case 'quest': return 'bi-journal-text';
        case 'other': return 'bi-people-fill';
        default: return 'bi-person-fill';
    }
}

/**
 * Format category name for display
 * @param {string} category - Category ID
 * @returns {string} - Formatted category name
 */
function formatCategoryName(category) {
    switch (category) {
        case 'shopkeepers': return 'Shopkeepers';
        case 'combat': return 'Combat NPCs';
        case 'pickpocketable': return 'Pickpocketable NPCs';
        case 'quest': return 'Quest NPCs';
        case 'other': return 'Other NPCs';
        default: return category.charAt(0).toUpperCase() + category.slice(1);
    }
}

/**
 * Format movement eagerness for display
 * @param {number} value - Movement eagerness value
 * @returns {string} - Formatted movement description
 */
function formatMovement(value) {
    value = parseFloat(value);
    
    if (value === 0) return 'Stationary';
    if (value <= 0.25) return 'Slow (0.25)';
    if (value <= 0.35) return 'Moderate (0.35)';
    if (value <= 0.4) return 'Active (0.4)';
    return 'Very Active (0.5+)';
}

/**
 * Format appearance key for display
 * @param {string} key - Appearance property key
 * @returns {string} - Formatted key name
 */
function formatAppearanceKey(key) {
    // Convert camelCase to Title Case with spaces
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
}

/**
 * Format appearance value for display
 * @param {string} key - Appearance property key
 * @param {any} value - Appearance property value
 * @returns {string} - Formatted value
 */
function formatAppearanceValue(key, value) {
    if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
    }
    
    if (key.toLowerCase().includes('color')) {
        return `<span class="color-preview" style="background-color: ${value}"></span> ${value}`;
    }
    
    return value;
}

/**
 * Format combat drops for display
 * @param {Array} drops - Combat drop items
 * @returns {string} - HTML for drops grid
 */
function formatCombatDrops(drops) {
    if (!drops || !Array.isArray(drops) || drops.length === 0) {
        return '<p class="no-drops">No drops specified</p>';
    }
    
    return drops.map(drop => {
        const itemName = drop.name || getItemName(drop.itemId);
        const odds = drop.odds ? formatPercentage(drop.odds) : '100%';
        
        return `
            <div class="drop-item">
                <div class="drop-item-header">
                    <span class="drop-item-name">${itemName}</span>
                    <span class="drop-odds">${odds}</span>
                </div>
                <div class="drop-item-details">
                    <span class="drop-amount">${drop.amount}× (ID: ${drop.itemId})</span>
                    ${drop.isIOU ? '<span class="iou-tag">IOU</span>' : ''}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Summarize appearance for preview
 * @param {Object} appearance - NPC appearance object
 * @returns {string} - HTML for appearance summary
 */
function summarizeAppearance(appearance) {
    const keys = Object.keys(appearance);
    if (keys.length === 0) return '';
    
    // Get at most 3 key appearance features
    const previewKeys = keys.slice(0, 3);
    
    return `
        <div class="appearance-preview">
            ${previewKeys.map(key => {
                const value = appearance[key];
                
                if (key.toLowerCase().includes('color')) {
                    return `<span class="appearance-trait">
                        <span class="trait-name">${formatAppearanceKey(key)}:</span>
                        <span class="color-preview" style="background-color: ${value}"></span>
                    </span>`;
                }
                
                return `<span class="appearance-trait">
                    <span class="trait-name">${formatAppearanceKey(key)}:</span>
                    <span class="trait-value">${typeof value === 'object' ? '{Object}' : value}</span>
                </span>`;
            }).join('')}
            ${keys.length > 3 ? `<span class="more-traits">+${keys.length - 3} more traits</span>` : ''}
        </div>
    `;
}

/**
 * Format percentage value
 * @param {number} value - Value between 0 and 1
 * @param {number} precision - Decimal precision
 * @returns {string} - Formatted percentage
 */
function formatPercentage(value, precision = 4) {
    const percentage = value * 100;
    
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

/**
 * Get item name by ID (fallback function)
 * @param {number} itemId - Item ID
 * @returns {string} - Item name or generic label
 */
function getItemName(itemId) {
    return `Item (ID: ${itemId})`;
}

// Export utility functions for use in other modules
export { formatCategoryName, getCategoryIcon, formatPercentage };