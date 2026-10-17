// spellRenderer.js - Module for rendering spell data and UI

/**
 * Initialize the spell renderer
 */
export function initSpellRenderer() {
    // Set up spell-specific event listeners
    setupSpellEventListeners();
}

/**
 * Set up event listeners for spell UI
 */
function setupSpellEventListeners() {
    // Event delegation for spell filtering
    document.addEventListener('click', (e) => {
        // Type filter buttons
        if (e.target.closest('.spell-type-filter')) {
            const filterBtn = e.target.closest('.spell-type-filter');
            const filterType = filterBtn.getAttribute('data-type');
            
            // Update active button
            document.querySelectorAll('.spell-type-filter').forEach(btn => {
                btn.classList.remove('active');
            });
            filterBtn.classList.add('active');
            
            // Apply filter
            filterSpellsByType(filterType);
        }
        
        // Sort buttons
        if (e.target.closest('.spell-sort-option')) {
            const sortBtn = e.target.closest('.spell-sort-option');
            const sortBy = sortBtn.getAttribute('data-sort');
            
            // Update active button
            document.querySelectorAll('.spell-sort-option').forEach(btn => {
                btn.classList.remove('active');
            });
            sortBtn.classList.add('active');
            
            // Apply sort
            sortSpells(sortBy);
        }
    });
}

/**
 * Organize spells by type
 * @param {Array|Object} spells - Array of spells or object already organized by type
 * @returns {Object} - Object with spells organized by type
 */
function organizeSpellsByType(spells) {
    // If it's already an object with types, return it
    if (!Array.isArray(spells) && typeof spells === 'object' && spells !== null) {
        return spells;
    }
    
    // If there's no data or invalid data, return an empty object
    if (!spells || !Array.isArray(spells)) {
        return {};
    }
    
    // Organize by type
    const spellsByType = {};
    
    spells.forEach(spell => {
        if (!spell) return;
        
        const type = spell.type || 'unknown';
        if (!spellsByType[type]) {
            spellsByType[type] = [];
        }
        spellsByType[type].push(spell);
    });
    
    return spellsByType;
}

/**
 * Render spells by type
 * @param {Object|Array} spells - Object of spell types or array of spells
 * @param {HTMLElement} container - Container to render into
 */
export function renderSpells(spells, container) {
    if (!spells || !container) {
        container.innerHTML = `
            <div class="placeholder-message">
                <i class="bi bi-exclamation-triangle"></i>
                <h3>Invalid spell data or container</h3>
                <p>Please ensure both the spell data and the container element are valid.</p>
            </div>
        `;
        return;
    }

    try {
        // Organize spells by type if they aren't already
        const spellsByType = organizeSpellsByType(spells);
        
        // Create header with filters and sort options
        const header = createSpellHeader(spellsByType);
        
        // Create container for all spell cards
        const spellsGrid = document.createElement('div');
        spellsGrid.className = 'spells-grid';
        spellsGrid.id = 'spellsGrid';
        
        // If we don't have any spell types, show a message
        if (Object.keys(spellsByType).length === 0) {
            spellsGrid.innerHTML = `
                <div class="placeholder-message">
                    <i class="bi bi-magic"></i>
                    <h3>No spells available</h3>
                    <p>The selected data source doesn't contain any spells in the expected format.</p>
                </div>
            `;
        } else {
            // Create spell type sections
            for (const type in spellsByType) {
                if (Object.hasOwnProperty.call(spellsByType, type)) {
                    const typeSpells = spellsByType[type];
                    
                    if (!Array.isArray(typeSpells) || typeSpells.length === 0) continue;
                    
                    const typeSection = document.createElement('div');
                    typeSection.className = 'spell-type-section';
                    typeSection.setAttribute('data-type', type);
                    
                    typeSection.innerHTML = `
                        <h3 class="spell-type-header">
                            <i class="bi ${getSpellTypeIcon(type)}"></i>
                            ${capitalizeFirstLetter(type)} Spells
                            <span class="spell-count">(${typeSpells.length})</span>
                        </h3>
                        <div class="spell-cards">
                            ${typeSpells.map(spell => createSpellCard(spell)).join('')}
                        </div>
                    `;
                    
                    spellsGrid.appendChild(typeSection);
                }
            }
        }
        
        // Clear container and append new content
        container.innerHTML = '';
        container.appendChild(header);
        container.appendChild(spellsGrid);
        
        // Add click handlers for spell cards
        addSpellCardHandlers(container, spells);
    } catch (error) {
        console.error('Error rendering spells:', error);
        container.innerHTML = `
            <div class="placeholder-message">
                <i class="bi bi-exclamation-triangle"></i>
                <h3>Error rendering spells</h3>
                <p>An error occurred while trying to render the spell data. Please try again.</p>
            </div>
        `;
    }
}

/**
 * Create the header section with filters and sort options
 */
function createSpellHeader(spellsByType) {
    const header = document.createElement('div');
    header.className = 'spells-header';
    
    // Count spells by type and get total count
    const typeCounts = {};
    let totalCount = 0;
    
    // Make sure spellsByType is valid
    if (!spellsByType || typeof spellsByType !== 'object') {
        spellsByType = {};
    }
    
    for (const type in spellsByType) {
        if (Object.hasOwnProperty.call(spellsByType, type)) {
            const spells = spellsByType[type];
            if (Array.isArray(spells)) {
                typeCounts[type] = spells.length;
                totalCount += spells.length;
            }
        }
    }
    
    header.innerHTML = `
        <div class="spell-filters">
            <div class="filter-group">
                <span class="filter-label">Filter by Type:</span>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-primary spell-type-filter active" data-type="all">
                        All (${totalCount})
                    </button>
                    ${Object.entries(typeCounts).map(([type, count]) => `
                        <button class="btn btn-sm btn-outline-primary spell-type-filter" data-type="${type}">
                            <i class="bi ${getSpellTypeIcon(type)}"></i> ${capitalizeFirstLetter(type)} (${count})
                        </button>
                    `).join('')}
                </div>
            </div>
            <div class="filter-group">
                <span class="filter-label">Sort by:</span>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-secondary spell-sort-option active" data-sort="id">ID</button>
                    <button class="btn btn-sm btn-outline-secondary spell-sort-option" data-sort="name">Name</button>
                    <button class="btn btn-sm btn-outline-secondary spell-sort-option" data-sort="level">Level</button>
                    <button class="btn btn-sm btn-outline-secondary spell-sort-option" data-sort="exp">XP</button>
                    <button class="btn btn-sm btn-outline-secondary spell-sort-option" data-sort="damage">Damage</button>
                </div>
            </div>
        </div>
        <div class="spell-search">
            <input type="text" id="spellSearch" class="form-control form-control-sm" placeholder="Search spells...">
            <small class="search-hint">Search by name or description</small>
        </div>
    `;
    
    // Add event listener for search safely
    setTimeout(() => {
        const searchInput = header.querySelector('#spellSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchSpells(e.target.value);
            });
        }
    }, 0);
    
    return header;
}

/**
 * Create a spell card HTML
 */
function createSpellCard(spell) {
    // Get appropriate colors and icons based on spell type
    const typeClass = `spell-type-${spell.type}`;
    const typeIcon = getSpellTypeIcon(spell.type);
    
    // Format recipe items
    const recipeHTML = spell.recipe && spell.recipe.length > 0 
        ? `<div class="spell-recipe">
             ${spell.recipe.map(item => `
               <div class="recipe-item" title="Item ID: ${item.itemId}">
                 <span class="item-amount">${item.amount}×</span>
                 <span class="item-name">${getItemName(item.itemId)} (ID: ${item.itemId})</span>
               </div>
             `).join('')}
           </div>`
        : '<div class="spell-recipe empty">No ingredients required</div>';
        
    // Format requirements
    const requirementsHTML = spell.requirements 
        ? '<div class="spell-requirements-tag">Has Requirements</div>' 
        : '';
        
    // Special handling for combat spells
    const damageHTML = spell.type === 'combat' 
        ? `<div class="spell-damage">
             <i class="bi bi-lightning-charge-fill"></i> ${spell.maxDamage} Max Damage
           </div>` 
        : '';
    
    // Create spell card HTML
    return `
        <div class="spell-card ${typeClass}" data-spell-id="${spell._id}">
            <div class="spell-header">
                <div class="spell-name-container">
                    <i class="bi ${typeIcon}"></i>
                    <h4 class="spell-name">${spell.name}</h4>
                </div>
                <div class="spell-level">Level ${spell.lvl}</div>
            </div>
            <div class="spell-content">
                <div class="spell-description">${spell.desc}</div>
                ${damageHTML}
                <div class="spell-xp"><i class="bi bi-star-fill"></i> ${spell.exp} XP</div>
                <h5 class="recipe-title">Ingredients:</h5>
                ${recipeHTML}
                ${requirementsHTML}
            </div>
            <div class="spell-footer">
                <button class="btn btn-sm btn-outline-primary view-spell-details">
                    <i class="bi bi-eye"></i> Details
                </button>
            </div>
        </div>
    `;
}

/**
 * Add click handlers to spell cards
 * @param {HTMLElement} container - The container element
 * @param {Array|Object} spellsData - The original spells data passed to renderSpells
 */
function addSpellCardHandlers(container, spellsData) {
    // Use event delegation
    container.addEventListener('click', (e) => {
        // Handle clicks on spell cards or their detail buttons
        const spellCard = e.target.closest('.spell-card');
        const detailButton = e.target.closest('.view-spell-details');
        
        if (spellCard && (detailButton || !e.target.closest('button'))) {
            const spellId = parseInt(spellCard.getAttribute('data-spell-id'));
            
            // Get all spells from the data we already have
            let allSpells = [];
            
            try {
                // If spellsData is already an array, use it directly
                if (Array.isArray(spellsData)) {
                    allSpells = spellsData;
                } 
                // If it's grouped by type, flatten it
                else if (typeof spellsData === 'object') {
                    for (const type in spellsData) {
                        if (Array.isArray(spellsData[type])) {
                            allSpells = allSpells.concat(spellsData[type]);
                        }
                    }
                }
                
                const spell = allSpells.find(s => s && s._id === spellId);
                
                if (spell) {
                    showSpellDetails(spell);
                } else {
                    console.warn(`Spell with ID ${spellId} not found`);
                }
            } catch (error) {
                console.error('Error processing spell click:', error);
            }
        }
    });
}

/**
 * Filter spells by type
 */
function filterSpellsByType(type) {
    const spellSections = document.querySelectorAll('.spell-type-section');
    
    if (type === 'all') {
        // Show all sections
        spellSections.forEach(section => {
            section.style.display = 'block';
        });
    } else {
        // Show only the selected type
        spellSections.forEach(section => {
            if (section.getAttribute('data-type') === type) {
                section.style.display = 'block';
            } else {
                section.style.display = 'none';
            }
        });
    }
}

/**
 * Sort spells based on criteria
 */
function sortSpells(sortBy) {
    const spellsGrid = document.getElementById('spellsGrid');
    if (!spellsGrid) {
        console.error('Spells grid not found');
        return;
    }
    
    const spellCards = Array.from(document.querySelectorAll('.spell-card'));
    if (spellCards.length === 0) {
        console.warn('No spell cards found to sort');
        return;
    }
    
    try {
        // Get spell data from the DOM
        const spellData = spellCards.map(card => {
            const id = parseInt(card.getAttribute('data-spell-id'));
            const name = card.querySelector('.spell-name').textContent;
            const level = parseInt(card.querySelector('.spell-level').textContent.replace('Level ', ''));
            const xp = parseInt(card.querySelector('.spell-xp').textContent.replace(' XP', ''));
            const damageEl = card.querySelector('.spell-damage');
            const damage = damageEl ? parseInt(damageEl.textContent.replace(' Max Damage', '')) : 0;
            
            return {
                id,
                name,
                level,
                xp,
                damage,
                element: card
            };
        });
        
        // Sort spell data
        spellData.sort((a, b) => {
            switch (sortBy) {
                case 'id':
                    return a.id - b.id;
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'level':
                    return a.level - b.level;
                case 'exp':
                    return b.xp - a.xp; // Higher XP first
                case 'damage':
                    return b.damage - a.damage; // Higher damage first
                default:
                    return 0;
            }
        });
        
        // Reorder cards within their type sections
        const typeContainers = document.querySelectorAll('.spell-cards');
        typeContainers.forEach(container => {
            const typeCards = Array.from(container.querySelectorAll('.spell-card'));
            if (typeCards.length === 0) return;
            
            // Get the type from the first card
            const typeClass = Array.from(typeCards[0].classList).find(c => c.startsWith('spell-type-'));
            if (!typeClass) return;
            
            // Filter and sort cards for this type
            const typeSpellData = spellData.filter(data => 
                data.element.classList.contains(typeClass)
            );
            
            // Clear container
            container.innerHTML = '';
            
            // Append sorted cards
            typeSpellData.forEach(data => {
                container.appendChild(data.element.cloneNode(true));
            });
        });
        
        // Reattach event handlers after DOM changes
        const allSpellsData = [];
        document.querySelectorAll('.spell-card').forEach(card => {
            const id = parseInt(card.getAttribute('data-spell-id'));
            const name = card.querySelector('.spell-name').textContent;
            const type = Array.from(card.classList)
                .find(c => c.startsWith('spell-type-'))
                ?.replace('spell-type-', '');
            
            if (id && name && type) {
                allSpellsData.push({ _id: id, name, type });
            }
        });
        
        addSpellCardHandlers(spellsGrid.parentElement, allSpellsData);
    } catch (error) {
        console.error('Error sorting spells:', error);
    }
}

/**
 * Search spells by name or description
 */
function searchSpells(query) {
    try {
        // Show all cards if query is empty
        document.querySelectorAll('.spell-card').forEach(card => {
            card.style.display = 'flex';
        });
        
        // Show all type sections
        document.querySelectorAll('.spell-type-section').forEach(section => {
            section.style.display = 'block';
        });
        
        if (!query) return;
        
        const lowercaseQuery = query.toLowerCase();
        let hasVisibleCards = false;
        
        // Track visible cards by type
        const visibleByType = {};
        
        // Check each card
        document.querySelectorAll('.spell-card').forEach(card => {
            const name = card.querySelector('.spell-name')?.textContent?.toLowerCase() || '';
            const desc = card.querySelector('.spell-description')?.textContent?.toLowerCase() || '';
            const typeClass = Array.from(card.classList).find(c => c.startsWith('spell-type-')) || '';
            const type = typeClass.replace('spell-type-', '').toLowerCase();
            
            if (name.includes(lowercaseQuery) || 
                desc.includes(lowercaseQuery) || 
                type.includes(lowercaseQuery)) {
                card.style.display = 'flex';
                hasVisibleCards = true;
                
                // Track that this type has visible cards
                if (type) visibleByType[type] = true;
            } else {
                card.style.display = 'none';
            }
        });
        
        // Show/hide type sections based on whether they have visible cards
        document.querySelectorAll('.spell-type-section').forEach(section => {
            const type = section.getAttribute('data-type');
            if (type && visibleByType[type]) {
                section.style.display = 'block';
            } else {
                section.style.display = 'none';
            }
        });
        
        // Show message if no results
        const noResultsMessage = document.getElementById('noSpellResults');
        if (!hasVisibleCards) {
            if (!noResultsMessage) {
                const spellsGrid = document.getElementById('spellsGrid');
                if (spellsGrid) {
                    const message = document.createElement('div');
                    message.id = 'noSpellResults';
                    message.className = 'no-results-message';
                    message.innerHTML = `
                        <i class="bi bi-search"></i>
                        <p>No spells found matching "${query}"</p>
                    `;
                    spellsGrid.appendChild(message);
                }
            }
        } else if (noResultsMessage) {
            noResultsMessage.remove();
        }
    } catch (error) {
        console.error('Error searching spells:', error);
    }
}

/**
 * Get appropriate icon for spell type
 */
function getSpellTypeIcon(type) {
    switch (type) {
        case 'combat':
            return 'bi-lightning-charge-fill';
        case 'teleport':
            return 'bi-magic';
        case 'status':
            return 'bi-shield-fill-exclamation';
        case 'inventory':
            return 'bi-bag-fill';
        default:
            return 'bi-question-circle';
    }
}

/**
 * Show detailed view of a spell
 */
function showSpellDetails(spell) {
    const detailsPanel = document.getElementById('dataDetails');
    if (!detailsPanel) {
        console.error('Details panel not found');
        return;
    }
    
    detailsPanel.classList.add('open');
    
    // Render special details for spells
    let detailsHTML = `
        <div class="details-header">
            <div class="spell-title ${spell.type}-spell">
                <i class="bi ${getSpellTypeIcon(spell.type)}"></i>
                <h3>${spell.name}</h3>
                <span class="spell-level-badge">Level ${spell.lvl}</span>
            </div>
            <button id="closeDetails" class="btn btn-sm btn-outline-secondary">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
        <div class="details-content">
            <div class="spell-detail-section">
                <p class="spell-description">${spell.desc}</p>
                <div class="spell-properties">
                    <div class="spell-property">
                        <span class="property-label">Type</span>
                        <span class="property-value">${capitalizeFirstLetter(spell.type)}</span>
                    </div>
                    <div class="spell-property">
                        <span class="property-label">Magic Level</span>
                        <span class="property-value">${spell.lvl}</span>
                    </div>
                    <div class="spell-property">
                        <span class="property-label">XP Reward</span>
                        <span class="property-value">${spell.exp} XP</span>
                    </div>
                    ${spell.type === 'combat' ? `
                    <div class="spell-property">
                        <span class="property-label">Max Damage</span>
                        <span class="property-value">${spell.maxDamage}</span>
                    </div>
                    ` : ''}
                    ${spell.splashDamage ? `
                    <div class="spell-property">
                        <span class="property-label">Area Effect</span>
                        <span class="property-value">Size: ${spell.splashDamage.size}, Splash: ${spell.splashDamage.damageAmountsFromCenter.join(', ')}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="spell-detail-section">
                <h4>Required Ingredients</h4>
                ${spell.recipe && spell.recipe.length > 0 ? `
                    <div class="recipe-items">
                        ${spell.recipe.map(item => `
                            <div class="recipe-item-detailed">
                                <div class="item-icon">
                                    <i class="bi bi-box"></i>
                                </div>
                                <div class="item-details">
                                    <div class="item-name">${getItemName(item.itemId)} (ID: ${item.itemId})</div>
                                    <div class="item-amount">${item.amount}× required</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : '<p class="no-recipe">This spell doesn\'t require any ingredients.</p>'}
            </div>
            
            ${spell.requirements ? `
            <div class="spell-detail-section">
                <h4>Special Requirements</h4>
                <div class="requirements-list">
                    ${formatRequirements(spell.requirements)}
                </div>
            </div>
            ` : ''}
            
            <div class="details-actions mt-3">
                <button id="analyzeSpell" class="btn btn-primary">
                    <i class="bi bi-robot"></i> Get AI Insights
                </button>
            </div>
        </div>
    `;
    
    detailsPanel.innerHTML = detailsHTML;
    
    // Set up close button event
    document.getElementById('closeDetails').addEventListener('click', () => {
        detailsPanel.classList.remove('open');
    });
    
    // Set up AI analysis event - use try/catch to handle potential missing aiAssistant
    document.getElementById('analyzeSpell').addEventListener('click', async () => {
        const analyzeBtn = document.getElementById('analyzeSpell');
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = `<i class="bi bi-hourglass-split"></i> Analyzing...`;
        
        try {
            // Make sure we can access the aiAssistant
            if (typeof aiAssistant !== 'undefined') {
                const insights = await aiAssistant.suggestStrategies('spelldefs', spell);
                
                // Add insights to the details panel
                const insightsSection = document.createElement('div');
                insightsSection.className = 'ai-insights mt-3';
                insightsSection.innerHTML = `
                    <h4><i class="bi bi-lightbulb"></i> AI Insights</h4>
                    <div class="insights-content">${marked.parse(insights)}</div>
                `;
                
                // Replace the button with the insights
                document.querySelector('.details-actions').replaceWith(insightsSection);
            } else {
                throw new Error("AI Assistant not available");
            }
        } catch (error) {
            console.error("Error getting AI insights:", error);
            analyzeBtn.innerHTML = `<i class="bi bi-exclamation-triangle"></i> Error analyzing spell`;
            setTimeout(() => {
                analyzeBtn.disabled = false;
                analyzeBtn.innerHTML = `<i class="bi bi-robot"></i> Get AI Insights`;
            }, 2000);
        }
    });
}

/**
 * Format requirements HTML
 */
function formatRequirements(requirements) {
    if (!requirements) return 'None';
    if (!Array.isArray(requirements)) return 'Special requirements needed';
    
    return requirements.map(req => {
        let reqHTML = '';
        
        if (req.desc) {
            reqHTML += `<div class="requirement-desc">${req.desc}</div>`;
        }
        
        if (req.type === 'quest') {
            reqHTML += `<div class="requirement-detail">
                <i class="bi bi-journal-check"></i>
                Quest #${req.questid}, checkpoint ${req.checkpoint}
            </div>`;
        } else if (req.type === 'equippeditem') {
            reqHTML += `<div class="requirement-detail">
                <i class="bi bi-shield-fill"></i>
                Required equipment: ${req.itemids.join(', ')}
            </div>`;
        }
        
        return `<div class="requirement-item">${reqHTML}</div>`;
    }).join('');
}

/**
 * Helper function to get item names based on IDs
 */
function getItemName(itemId) {
    // Common scroll items that appear frequently in spell recipes
    const knownItems = {
        175: "Flame Scroll",
        176: "Water Scroll",
        177: "Nature Scroll",
        178: "Fury Scroll",
        179: "Rage Scroll",
        180: "Energy Scroll",
        181: "Warp Scroll",
        184: "Alchemy Scroll",
        355: "Wizard Scroll",
        358: "Blood Scroll"
    };
    
    // Return known item name or generic "Ingredient"
    return knownItems[itemId] || "Ingredient";
}

/**
 * Utility function to capitalize first letter
 */
export function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}