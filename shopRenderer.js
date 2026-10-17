// shopRenderer.js - Module for rendering shop data and UI

/**
 * Initialize the shop renderer
 */
export function initShopRenderer() {
    setupShopEventListeners();
}

/**
 * Set up event listeners for shop UI
 */
function setupShopEventListeners() {
    // Event delegation for shop filtering
    document.addEventListener('click', (e) => {
        // Shop category filters
        if (e.target.closest('.shop-category-filter')) {
            const filterBtn = e.target.closest('.shop-category-filter');
            const category = filterBtn.getAttribute('data-category');
            
            document.querySelectorAll('.shop-category-filter').forEach(btn => {
                btn.classList.remove('active');
            });
            filterBtn.classList.add('active');
            
            filterShopsByCategory(category);
        }
        
        // Sort options
        if (e.target.closest('.shop-sort-option')) {
            const sortBtn = e.target.closest('.shop-sort-option');
            const sortBy = sortBtn.getAttribute('data-sort');
            
            document.querySelectorAll('.shop-sort-option').forEach(btn => {
                btn.classList.remove('active');
            });
            sortBtn.classList.add('active');
            
            sortShops(sortBy);
        }
    });
}

/**
 * Categorize shops by type
 * @param {Array} shops - Array of shop objects
 * @returns {Object} - Object with shops organized by category
 */
function categorizeShops(shops) {
    const categories = {
        'general': [],
        'weapons': [],
        'armor': [],
        'food': [],
        'potions': [],
        'fishing': [],
        'magic': [],
        'crafting': [],
        'others': []
    };
    
    shops.forEach(shop => {
        const name = shop.name.toLowerCase();
        const description = shop.description ? shop.description.toLowerCase() : '';
        
        if (name.includes('general store')) {
            categories.general.push(shop);
        } else if (name.includes('weapon') || name.includes('battleaxe') || name.includes('sword') || 
                  name.includes('archery') || description.includes('weapon')) {
            categories.weapons.push(shop);
        } else if (name.includes('shield') || name.includes('armor') || name.includes('plate') || 
                  name.includes('helm') || name.includes('leg') || name.includes('glove') || 
                  name.includes('chain')) {
            categories.armor.push(shop);
        } else if (name.includes('fish') || name.includes('food') || name.includes('corn') || 
                  name.includes('potato') || name.includes('tavern') || name.includes('inn') ||
                  name.includes('beer') || name.includes('crab')) {
            categories.food.push(shop);
        } else if (name.includes('potion') || description.includes('potion')) {
            categories.potions.push(shop);
        } else if (name.includes('rod') || description.includes('fishing') || name.includes('fishing')) {
            categories.fishing.push(shop);
        } else if (name.includes('magic') || name.includes('scroll') || name.includes('wizard')) {
            categories.magic.push(shop);
        } else if (name.includes('craft') || description.includes('craft') || 
                  name.includes('mining') || name.includes('pick') || name.includes('axe') ||
                  name.includes('hatchet')) {
            categories.crafting.push(shop);
        } else {
            categories.others.push(shop);
        }
    });
    
    return categories;
}

/**
 * Render shops in the container
 * @param {Array} shops - Array of shop objects
 * @param {HTMLElement} container - Container to render into
 */
export function renderShops(shops, container) {
    if (!shops || !container) {
        container.innerHTML = `
            <div class="placeholder-message">
                <i class="bi bi-exclamation-triangle"></i>
                <h3>Invalid shop data or container</h3>
            </div>
        `;
        return;
    }

    try {
        // Categorize shops
        const shopCategories = categorizeShops(shops);
        
        // Create header with filters
        const header = createShopHeader(shopCategories);
        
        // Create container for all shop cards
        const shopsContainer = document.createElement('div');
        shopsContainer.className = 'shops-container';
        shopsContainer.id = 'shopsContainer';
        
        // Create category sections
        for (const [category, categoryShops] of Object.entries(shopCategories)) {
            if (categoryShops.length === 0) continue;
            
            const section = document.createElement('div');
            section.className = 'shop-category-section';
            section.setAttribute('data-category', category);
            
            section.innerHTML = `
                <h3 class="category-header">
                    <i class="bi ${getCategoryIcon(category)}"></i>
                    ${formatCategoryName(category)}
                    <span class="shop-count">(${categoryShops.length})</span>
                </h3>
                <div class="shop-cards-grid" id="${category}Shops">
                    ${categoryShops.map(shop => createShopCard(shop, category)).join('')}
                </div>
            `;
            
            shopsContainer.appendChild(section);
        }
        
        // Clear container and append new content
        container.innerHTML = '';
        container.appendChild(header);
        container.appendChild(shopsContainer);
        
        // Add click handlers for shop cards
        addShopCardHandlers(container, shops);
    } catch (error) {
        console.error('Error rendering shops:', error);
        container.innerHTML = `
            <div class="placeholder-message">
                <i class="bi bi-exclamation-triangle"></i>
                <h3>Error rendering shops</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

/**
 * Create the header with filters and search
 * @param {Object} shopCategories - Shops organized by category
 * @returns {HTMLElement} - Header element
 */
function createShopHeader(shopCategories) {
    const header = document.createElement('div');
    header.className = 'shops-header';
    
    // Count total shops
    let totalCount = 0;
    const categoryCounts = {};
    
    for (const [category, shops] of Object.entries(shopCategories)) {
        categoryCounts[category] = shops.length;
        totalCount += shops.length;
    }
    
    // Split categories into two rows
    const categoriesArray = Object.entries(categoryCounts).filter(([_, count]) => count > 0);
    const firstRowCategories = categoriesArray.slice(0, Math.ceil(categoriesArray.length / 2));
    const secondRowCategories = categoriesArray.slice(Math.ceil(categoriesArray.length / 2));
    
    header.innerHTML = `
        <div class="shop-filters">
            <div class="filter-group category-filter-group">
                <span class="filter-label">Filter by Category:</span>
                <div class="category-filter-buttons">
                    <div class="btn-row">
                        <button class="btn btn-sm btn-outline-primary shop-category-filter active" data-category="all">
                            All Shops (${totalCount})
                        </button>
                        ${firstRowCategories.map(([category, count]) => `
                            <button class="btn btn-sm btn-outline-primary shop-category-filter" data-category="${category}">
                                <i class="bi ${getCategoryIcon(category)}"></i> ${formatCategoryName(category)} (${count})
                            </button>
                        `).join('')}
                    </div>
                    <div class="btn-row">
                        ${secondRowCategories.map(([category, count]) => `
                            <button class="btn btn-sm btn-outline-primary shop-category-filter" data-category="${category}">
                                <i class="bi ${getCategoryIcon(category)}"></i> ${formatCategoryName(category)} (${count})
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="filter-group">
                <span class="filter-label">Sort by:</span>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-secondary shop-sort-option active" data-sort="id">ID</button>
                    <button class="btn btn-sm btn-outline-secondary shop-sort-option" data-sort="name">Name</button>
                    <button class="btn btn-sm btn-outline-secondary shop-sort-option" data-sort="items">Inventory Size</button>
                </div>
            </div>
        </div>
        <div class="shop-search">
            <input type="text" id="shopSearch" class="form-control form-control-sm" placeholder="Search shops by name or description...">
            <small class="search-hint">Try searching for "weapons", "food", "general", etc.</small>
        </div>
    `;
    
    // Add event listener for search
    setTimeout(() => {
        const searchInput = header.querySelector('#shopSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchShops(e.target.value);
            });
        }
    }, 0);
    
    return header;
}

/**
 * Create an individual shop card
 * @param {Object} shop - Shop data object
 * @param {string} category - Category the shop belongs to
 * @returns {string} - HTML string for the shop card
 */
function createShopCard(shop, category) {
    // Count in-stock vs out-of-stock items
    let inStockCount = 0;
    let outOfStockCount = 0;
    
    if (shop.items && Array.isArray(shop.items)) {
        shop.items.forEach(item => {
            if (item.amount > 0) {
                inStockCount++;
            } else {
                outOfStockCount++;
            }
        });
    }
    
    // Get up to 5 preview items
    const previewItems = shop.items ? shop.items.slice(0, 5) : [];
    
    return `
        <div class="shop-card ${category}-shop" data-shop-id="${shop._id}">
            <div class="shop-card-header">
                <h4 class="shop-name">${shop.name}</h4>
                <span class="shop-id">#${shop._id}</span>
            </div>
            <div class="shop-card-body">
                <p class="shop-description">${shop.description || "No description"}</p>
                
                <div class="shop-policy">
                    ${shop.canBuyTemporaryItems ? 
                        '<span class="policy-badge policy-allow"><i class="bi bi-check-circle"></i> Accepts temporary items</span>' : 
                        '<span class="policy-badge policy-deny"><i class="bi bi-x-circle"></i> Does not accept temporary items</span>'}
                </div>
                
                <div class="items-preview">
                    <div class="items-preview-title">
                        <span>Inventory</span>
                        <span class="items-count">${inStockCount} in stock / ${outOfStockCount} out of stock</span>
                    </div>
                    <div class="preview-items">
                        ${previewItems.length > 0 ? 
                            previewItems.map(item => `
                                <div class="preview-item ${item.amount > 0 ? 'in-stock' : 'out-of-stock'}" title="${getItemName(item.id)} - ${item.amount > 0 ? `In Stock (${item.amount})` : 'Out of Stock'}">
                                    ${getItemName(item.id)} - ${item.cost} coins
                                </div>
                            `).join('') : 
                            '<div class="no-items">No items available</div>'
                        }
                        ${shop.items && shop.items.length > 5 ? `<div class="preview-item more-items">+${shop.items.length - 5} more items</div>` : ''}
                    </div>
                </div>
            </div>
            <div class="shop-card-footer">
                <button class="btn btn-sm btn-outline-primary view-shop-details">
                    <i class="bi bi-eye"></i> View Inventory
                </button>
            </div>
        </div>
    `;
}

/**
 * Add click handlers to shop cards
 * @param {HTMLElement} container - The container element
 * @param {Array} shopsData - The shop data
 */
function addShopCardHandlers(container, shopsData) {
    container.addEventListener('click', (e) => {
        const shopCard = e.target.closest('.shop-card');
        const detailButton = e.target.closest('.view-shop-details');
        
        if (shopCard && (detailButton || !e.target.closest('button'))) {
            const shopId = parseInt(shopCard.getAttribute('data-shop-id'));
            const shop = shopsData.find(s => s._id === shopId);
            
            if (shop) {
                showShopDetails(shop);
            }
        }
    });
}

/**
 * Show detailed view of shop
 * @param {Object} shop - Shop data
 */
function showShopDetails(shop) {
    const detailsPanel = document.getElementById('dataDetails');
    if (!detailsPanel) return;
    
    detailsPanel.classList.add('open');
    
    // Generate HTML
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
            <div class="shop-detail-section">
                <h4>Shop Information</h4>
                <p class="shop-description">${shop.description || "No description available"}</p>
                <div class="shop-policy">
                    ${shop.canBuyTemporaryItems ? 
                        '<span class="policy-badge policy-allow"><i class="bi bi-check-circle"></i> This shop accepts temporary items</span>' : 
                        '<span class="policy-badge policy-deny"><i class="bi bi-x-circle"></i> This shop does not accept temporary items</span>'}
                </div>
            </div>
            
            <div class="shop-detail-section">
                <h4>Inventory</h4>
                ${generateInventoryHTML(shop.items || [])}
            </div>
            
            <div class="details-actions mt-3">
                <button id="analyzeShop" class="btn btn-primary">
                    <i class="bi bi-robot"></i> Get Shop Analysis
                </button>
            </div>
        </div>
    `;
    
    detailsPanel.innerHTML = detailsHTML;
    
    // Set up close button
    document.getElementById('closeDetails').addEventListener('click', () => {
        detailsPanel.classList.remove('open');
    });
    
    // Set up AI analysis button
    document.getElementById('analyzeShop').addEventListener('click', async () => {
        const analyzeBtn = document.getElementById('analyzeShop');
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = `<i class="bi bi-hourglass-split"></i> Analyzing...`;
        
        try {
            // Access aiAssistant from window object to ensure it's defined
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
 * Generate HTML for shop inventory
 * @param {Array} items - Shop inventory items
 * @returns {string} - HTML for inventory section
 */
function generateInventoryHTML(items) {
    if (!items || !Array.isArray(items) || items.length === 0) {
        return '<p class="no-items">No items in this shop</p>';
    }
    
    let inStockItems = items.filter(item => item.amount > 0);
    let outOfStockItems = items.filter(item => item.amount === 0);
    
    return `
        <div class="inventory-tabs">
            <ul class="nav nav-tabs" role="tablist">
                <li class="nav-item" role="presentation">
                    <button class="nav-link active" id="all-items-tab" data-bs-toggle="tab" data-bs-target="#all-items" type="button" role="tab" aria-controls="all-items" aria-selected="true">
                        All Items (${items.length})
                    </button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="in-stock-tab" data-bs-toggle="tab" data-bs-target="#in-stock" type="button" role="tab" aria-controls="in-stock" aria-selected="false">
                        In Stock (${inStockItems.length})
                    </button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="out-of-stock-tab" data-bs-toggle="tab" data-bs-target="#out-of-stock" type="button" role="tab" aria-controls="out-of-stock" aria-selected="false">
                        Out of Stock (${outOfStockItems.length})
                    </button>
                </li>
            </ul>
            
            <div class="tab-content">
                <div class="tab-pane fade show active" id="all-items" role="tabpanel" aria-labelledby="all-items-tab">
                    <div class="inventory-grid">
                        ${items.map(item => generateItemCard(item)).join('')}
                    </div>
                </div>
                
                <div class="tab-pane fade" id="in-stock" role="tabpanel" aria-labelledby="in-stock-tab">
                    <div class="inventory-grid">
                        ${inStockItems.map(item => generateItemCard(item)).join('')}
                    </div>
                </div>
                
                <div class="tab-pane fade" id="out-of-stock" role="tabpanel" aria-labelledby="out-of-stock-tab">
                    <div class="inventory-grid">
                        ${outOfStockItems.map(item => generateItemCard(item)).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Generate an item card for shop inventory
 * @param {Object} item - Shop item
 * @returns {string} - HTML for item card
 */
function generateItemCard(item) {
    // Determine stock status
    const inStock = item.amount > 0;
    const stockClass = inStock ? 'in-stock' : 'out-of-stock';
    
    // Calculate restock time in a readable format
    const restockTime = formatRestockTime(item.restockSpeed);
    
    // Get item name
    const itemName = getItemName(item.id);
    
    return `
        <div class="shop-item ${stockClass}">
            <div class="item-header">
                <div class="item-name">${itemName} (#${item.id})</div>
                <div class="item-price">${item.cost} coins</div>
            </div>
            <div class="item-details">
                <div class="stock-indicator ${stockClass}">
                    ${inStock ? 
                        `<i class="bi bi-check-circle-fill"></i> In Stock (${item.amount})` : 
                        '<i class="bi bi-x-circle-fill"></i> Out of Stock'}
                </div>
                <div class="restock-info">
                    <i class="bi bi-clock-history"></i> Restocks every ${restockTime}
                </div>
            </div>
        </div>
    `;
}

/**
 * Filter shops by category
 * @param {string} category - Category to filter by
 */
function filterShopsByCategory(category) {
    const sections = document.querySelectorAll('.shop-category-section');
    
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
 * Sort shops in the current view
 * @param {string} sortBy - Property to sort by
 */
function sortShops(sortBy) {
    const sections = document.querySelectorAll('.shop-category-section');
    
    sections.forEach(section => {
        const cardsContainer = section.querySelector('.shop-cards-grid');
        if (!cardsContainer) return;
        
        const cards = Array.from(cardsContainer.querySelectorAll('.shop-card'));
        if (cards.length === 0) return;
        
        // Sort the cards
        cards.sort((a, b) => {
            const idA = parseInt(a.getAttribute('data-shop-id'));
            const idB = parseInt(b.getAttribute('data-shop-id'));
            
            switch (sortBy) {
                case 'id':
                    return idA - idB;
                case 'name':
                    const nameA = a.querySelector('.shop-name').textContent;
                    const nameB = b.querySelector('.shop-name').textContent;
                    return nameA.localeCompare(nameB);
                case 'items':
                    const itemsA = a.querySelectorAll('.preview-item').length;
                    const itemsB = b.querySelectorAll('.preview-item').length;
                    return itemsB - itemsA; // Sort by most items first
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
 * Search shops by name or description
 * @param {string} query - Search query
 */
function searchShops(query) {
    const cards = document.querySelectorAll('.shop-card');
    const sections = document.querySelectorAll('.shop-category-section');
    const lowercaseQuery = query.toLowerCase();
    
    if (!query) {
        // Show all cards and sections
        cards.forEach(card => card.style.display = 'flex');
        sections.forEach(section => section.style.display = 'block');
        
        // Remove no results message if it exists
        const noResults = document.getElementById('noShopResults');
        if (noResults) noResults.remove();
        
        return;
    }
    
    // Track if we found any matches
    let foundMatch = false;
    const visibleByCategory = {};
    
    // Check each card
    cards.forEach(card => {
        // Get searchable text from the card
        const title = card.querySelector('.shop-name')?.textContent.toLowerCase() || '';
        const previewItems = Array.from(card.querySelectorAll('.preview-item'))
            .map(item => item.textContent.toLowerCase());
        const category = card.className.match(/(\w+)-shop/)[1];
        
        // Check if the query matches any text
        const matchesTitle = title.includes(lowercaseQuery);
        const matchesItems = previewItems.some(item => item.includes(lowercaseQuery));
        
        if (matchesTitle || matchesItems) {
            card.style.display = 'flex';
            foundMatch = true;
            visibleByCategory[category] = true;
        } else {
            card.style.display = 'none';
        }
    });
    
    // Show/hide sections based on visible cards
    sections.forEach(section => {
        const category = section.getAttribute('data-category').replace('-section', '');
        if (visibleByCategory[category]) {
            section.style.display = 'block';
        } else {
            section.style.display = 'none';
        }
    });
    
    // Show or update no results message
    let noResults = document.getElementById('noShopResults');
    if (!foundMatch) {
        if (!noResults) {
            noResults = document.createElement('div');
            noResults.id = 'noShopResults';
            noResults.className = 'no-results-message';
            noResults.innerHTML = `
                <i class="bi bi-search"></i>
                <p>No shops found matching "${query}"</p>
                <button class="btn btn-sm btn-outline-secondary reset-search">
                    Clear Search
                </button>
            `;
            
            const container = document.getElementById('shopsContainer');
            if (container) container.appendChild(noResults);
            
            // Add event listener to reset button
            setTimeout(() => {
                const resetButton = noResults.querySelector('.reset-search');
                if (resetButton) {
                    resetButton.addEventListener('click', () => {
                        document.getElementById('shopSearch').value = '';
                        searchShops('');
                    });
                }
            }, 0);
        }
    } else if (noResults) {
        noResults.remove();
    }
}

/* --- Helper functions --- */

/**
 * Get icon for a shop category
 * @param {string} category - Shop category
 * @returns {string} - Bootstrap icon class
 */
function getCategoryIcon(category) {
    switch (category) {
        case 'general': return 'bi-bag';
        case 'weapons': return 'bi-slash-square';
        case 'armor': return 'bi-shield';
        case 'food': return 'bi-cup-hot';
        case 'potions': return 'bi-droplet';
        case 'fishing': return 'bi-water';
        case 'magic': return 'bi-stars';
        case 'crafting': return 'bi-tools';
        case 'others': return 'bi-three-dots';
        default: return 'bi-shop';
    }
}

/**
 * Format category name for display
 * @param {string} category - Category ID
 * @returns {string} - Formatted category name
 */
function formatCategoryName(category) {
    switch (category) {
        case 'general': return 'General Stores';
        case 'weapons': return 'Weapon Shops';
        case 'armor': return 'Armor & Equipment';
        case 'food': return 'Food & Drinks';
        case 'potions': return 'Potion Shops';
        case 'fishing': return 'Fishing Supplies';
        case 'magic': return 'Magic & Scrolls';
        case 'crafting': return 'Crafting & Tools';
        case 'others': return 'Other Shops';
        default: return category.charAt(0).toUpperCase() + category.slice(1);
    }
}

/**
 * Format restock time into a readable format
 * @param {number} ticks - Restock time in ticks
 * @returns {string} - Formatted time
 */
function formatRestockTime(ticks) {
    if (ticks < 100) {
        return `${ticks} ticks (Fast)`;
    } else if (ticks < 300) {
        return `${ticks} ticks (Normal)`;
    } else {
        return `${ticks} ticks (Slow)`;
    }
}

/**
 * Get item name by ID
 * @param {number} itemId - Item ID
 * @returns {string} - Item name
 */
function getItemName(itemId) {
    // This is a comprehensive mapping of common items
    const commonItems = {
        // Helmets
        52: "Bronze Helmet",
        120: "Iron Helmet",
        53: "Steel Helmet",
        54: "Palladium Helmet",
        55: "Coronium Helmet",
        122: "Bronze Full Helm",
        128: "Iron Full Helm",
        123: "Steel Full Helm",
        124: "Palladium Full Helm",
        125: "Coronium Full Helm",
        214: "Gnome Hat",
        
        // Capes
        129: "Red Cape",
        130: "Blue Cape",
        131: "Green Cape",
        132: "Black Cape",
        133: "Orange Cape",
        134: "Yellow Cape",
        135: "Purple Cape",
        
        // Armor pieces
        40: "Bronze Platebody",
        41: "Bronze Platelegs",
        118: "Iron Platebody",
        119: "Iron Platelegs",
        42: "Steel Platebody",
        43: "Steel Platelegs",
        44: "Palladium Platebody",
        45: "Palladium Platelegs",
        46: "Coronium Platebody",
        47: "Coronium Platelegs",
        
        // Gloves
        92: "Bronze Gloves",
        121: "Iron Gloves",
        93: "Steel Gloves",
        94: "Palladium Gloves",
        95: "Coronium Gloves",
        137: "Leather Gloves",
        
        // Shields
        185: "Bronze Shield",
        191: "Iron Shield",
        186: "Steel Shield",
        187: "Palladium Shield",
        188: "Coronium Shield",
        
        // Weapons
        56: "Bronze Battleaxe",
        57: "Iron Battleaxe",
        63: "Steel Battleaxe",
        78: "Palladium Battleaxe",
        58: "Bronze Sword",
        59: "Iron Sword",
        60: "Steel Sword",
        61: "Palladium Sword",
        62: "Coronium Sword",
        96: "Coronium Battleaxe",
        126: "Iron Heavy Sword",
        127: "Steel Heavy Sword",
        146: "Coronium Heavy Sword",
        147: "Palladium Heavy Sword",
        364: "Bronze Scimitar",
        365: "Iron Scimitar",
        366: "Steel Scimitar",
        367: "Palladium Scimitar",
        368: "Coronium Scimitar",
        
        // Tools
        73: "Bronze Pickaxe",
        74: "Iron Pickaxe",
        75: "Steel Pickaxe",
        76: "Palladium Pickaxe",
        77: "Coronium Pickaxe",
        7: "Basic Rod",
        8: "Great Rod",
        9: "Super Rod",
        10: "Mega Rod",
        314: "Bronze Hatchet",
        315: "Iron Hatchet",
        316: "Steel Hatchet",
        317: "Palladium Hatchet",
        318: "Coronium Hatchet",
        
        // Scrolls
        175: "Flame Scroll",
        176: "Water Scroll",
        177: "Nature Scroll",
        178: "Fury Scroll",
        179: "Rage Scroll",
        180: "Energy Scroll",
        181: "Warp Scroll",
        184: "Alchemy Scroll",
        149: "Scroll",
        150: "Pine Scroll",
        151: "Oak Scroll",
        152: "Palm Scroll",
        153: "Sakura Scroll",
        355: "Wizard Scroll",
        358: "Blood Scroll",
        
        // Arrows and archery
        334: "Bronze Arrows",
        335: "Iron Arrows",
        336: "Steel Arrows",
        337: "Palladium Arrows",
        338: "Coronium Arrows",
        339: "Celadon Arrows",
        340: "Feather",
        341: "Bow",
        342: "Pine Bow",
        343: "Oak Bow",
        344: "Palm Bow",
        345: "Cherry Blossom Bow",
        347: "Unstrung Bow",
        348: "Unstrung Pine Bow",
        352: "Bowstring",
        
        // Crafting
        154: "Chisel",
        155: "Hammer",
        167: "Pestle and Mortar",
        346: "Knife",
        
        // Food and drink
        98: "Potato",
        99: "Wheat",
        100: "Corn",
        101: "Tomato", 
        102: "Onion",
        103: "Strawberry",
        105: "Pumpkin",
        106: "Grapes",
        156: "Glass Jar",
        159: "Beer",
        163: "Dragon's Ale",
        165: "Giant's Milk",
        2: "Raw Bass",
        3: "Bass",
        4: "Raw Bluegill",
        5: "Bluegill",
        6: "Coins",
        11: "Raw Stingray",
        12: "Stingray",
        13: "Raw Crab",
        14: "Crab",
        21: "Raw Tuna",
        22: "Tuna",
        25: "Raw Salmon",
        26: "Salmon",
        27: "Raw Piranha",
        28: "Piranha",
        35: "Raw Walleye",
        36: "Walleye",
        37: "Raw Frog",
        38: "Frog",
        64: "Logs",
        65: "Pine Logs",
        66: "Oak Logs",
        67: "Palm Logs",
        68: "Cherry Logs",
        70: "Bronze Bar",
        71: "Silver Bar",
        72: "Gold Bar",
        79: "Iron Ore",
        80: "Sapphire",
        81: "Sapphire",
        82: "Emerald",
        83: "Topaz",
        84: "Citrine",
        85: "Ruby",
        86: "Diamond",
        89: "Silver Nugget",
        90: "Gold Nugget",
        142: "Coal",
        143: "Steel Bar",
        144: "Palladium Bar",
        145: "Coronium Bar",
        
        // Jewelry
        194: "Amethyst Necklace",
        195: "Sapphire Necklace",
        196: "Emerald Necklace",
        197: "Topaz Necklace",
        198: "Citrine Necklace",
        199: "Ruby Necklace",
        
        // Potions
        259: "Vial",
        261: "Potion of Accuracy (2)",
        262: "Potion of Accuracy (1)",
        263: "Potion of Defense (2)",
        264: "Potion of Defense (1)",
        265: "Potion of Strength (2)",
        266: "Potion of Strength (1)",
        267: "Potion of Fishing (2)",
        268: "Potion of Fishing (1)",
        271: "Potion of Mining (2)",
        272: "Potion of Mining (1)",
        273: "Potion of Archery (2)",
        274: "Potion of Archery (1)",
        291: "Potion of Magic (2)",
        292: "Potion of Magic (1)"
    };
    
    // Return known item name or generic "Item"
    return commonItems[itemId] || `Item ${itemId}`;
}

// Export utility functions for use in other modules
export { formatCategoryName, getCategoryIcon };