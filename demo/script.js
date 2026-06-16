// Initial Defaults
const defaultProducts = [
    { id: 1, name: 'Espresso Doble', price: 2.50, category: 'Cafetería', image: '../assets/drink.jpg' },
    { id: 2, name: 'Latte Macchiato', price: 3.20, category: 'Cafetería', image: '../assets/drink.jpg' },
    { id: 3, name: 'Avocado Toast', price: 5.50, category: 'Desayunos', image: '../assets/food.jpg' },
    { id: 4, name: 'Pancakes', price: 6.00, category: 'Desayunos', image: '../assets/food.jpg' },
    { id: 5, name: 'Zumo Naranja', price: 3.00, category: 'Bebidas', image: '../assets/drink.jpg' },
    { id: 6, name: 'Cheesecake', price: 4.50, category: 'Postres', image: '../assets/food.jpg' }
];

const defaultTables = [
    { id: 1, status: 'free' },
    { id: 2, status: 'free' },
    { id: 3, status: 'free' },
    { id: 4, status: 'free' },
    { id: 5, status: 'free' },
    { id: 6, status: 'free' }
];

// State
let products = JSON.parse(localStorage.getItem('pos_products')) || defaultProducts;
let tables = JSON.parse(localStorage.getItem('pos_tables')) || defaultTables;
let tableOrders = JSON.parse(localStorage.getItem('pos_orders')) || {}; // { tableId: cartArray }
let salesToday = JSON.parse(localStorage.getItem('pos_sales')) || { total: 0, count: 0 };

let currentTableId = null; // null means direct sale
let cart = []; // Current active cart
let currentCategory = 'Todos';

// DOM Elements
const productsContainer = document.getElementById('products-container');
const categoriesContainer = document.getElementById('categories-container');
const tablesContainer = document.getElementById('tables-container');
const cartContainer = document.getElementById('cart-container');
const subtotalEl = document.getElementById('subtotal');
const taxEl = document.getElementById('tax');
const totalEl = document.getElementById('total');
const reportTodayEl = document.getElementById('report-today');
const reportOrdersEl = document.getElementById('report-orders');
const currentTableLabel = document.getElementById('current-table-label');

function init() {
    // Save defaults to localStorage if empty
    if (!localStorage.getItem('pos_products')) localStorage.setItem('pos_products', JSON.stringify(products));
    if (!localStorage.getItem('pos_tables')) localStorage.setItem('pos_tables', JSON.stringify(tables));
    
    setupNavigation();
    renderCategories();
    renderProducts();
    renderTables();
    updateReports();
    
    // Start with direct sale
    setCartForTable(null);
}

// --- NAVIGATION ---
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            // UI Update
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            // View Update
            const targetView = this.getAttribute('data-tab');
            document.querySelectorAll('.view-section').forEach(view => {
                view.classList.remove('active');
                view.style.display = 'none';
            });
            const activeView = document.getElementById('view-' + targetView);
            activeView.style.display = 'block';
            setTimeout(() => activeView.classList.add('active'), 10);
            
            if (targetView === 'reports') updateReports();
            if (targetView === 'tables') renderTables();
            if (targetView === 'pos') renderProducts();
        });
    });
}

// --- POS (PRODUCTS) ---
function renderCategories() {
    const cats = ['Todos', ...new Set(products.map(p => p.category))];
    categoriesContainer.innerHTML = '';
    
    cats.forEach(c => {
        const btn = document.createElement('button');
        btn.className = `category-btn ${c === currentCategory ? 'active' : ''}`;
        btn.textContent = c;
        btn.onclick = () => {
            currentCategory = c;
            renderCategories(); // re-render to update active class
            renderProducts();
        };
        categoriesContainer.appendChild(btn);
    });
}

function renderProducts() {
    productsContainer.innerHTML = '';
    const filteredProducts = currentCategory === 'Todos' 
        ? products 
        : products.filter(p => p.category === currentCategory);

    filteredProducts.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.onclick = () => addToCart(product);
        
        // Use placeholder if image is empty
        const imgUrl = product.image && product.image.trim() !== '' ? product.image : 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=300&q=80';
        
        card.innerHTML = `
            <img src="${imgUrl}" alt="${product.name}" class="product-image" onerror="this.src='https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=300&q=80'">
            <div class="product-info">
                <span class="product-name">${product.name}</span>
                <span class="product-price">€${product.price.toFixed(2)}</span>
            </div>
        `;
        productsContainer.appendChild(card);
    });
}

// --- TABLES ---
function renderTables() {
    tablesContainer.innerHTML = '';
    tables.forEach(table => {
        const isOccupied = tableOrders[table.id] && tableOrders[table.id].length > 0;
        
        const card = document.createElement('div');
        card.className = `table-card ${isOccupied ? 'occupied' : ''}`;
        card.onclick = () => {
            setCartForTable(table.id);
            // Switch to POS tab automatically
            document.querySelector('.nav-item[data-tab="pos"]').click();
        };
        
        card.innerHTML = `
            <div class="table-number">Mesa ${table.id}</div>
            <div class="table-status">${isOccupied ? 'Ocupada' : 'Libre'}</div>
        `;
        tablesContainer.appendChild(card);
    });
}

function setCartForTable(tableId) {
    currentTableId = tableId;
    if (tableId === null) {
        currentTableLabel.textContent = "Venta Directa";
        cart = tableOrders['direct'] || [];
    } else {
        currentTableLabel.textContent = `Mesa ${tableId}`;
        cart = tableOrders[tableId] || [];
    }
    renderCart();
}

function saveCartState() {
    if (currentTableId === null) {
        tableOrders['direct'] = cart;
    } else {
        tableOrders[currentTableId] = cart;
    }
    localStorage.setItem('pos_orders', JSON.stringify(tableOrders));
}

// --- CART ---
function addToCart(product) {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) existingItem.qty += 1;
    else cart.push({ ...product, qty: 1 });
    
    saveCartState();
    renderCart();
    showToast(`Agregado: ${product.name}`);
}

function updateQty(id, delta) {
    const item = cart.find(item => item.id === id);
    if (item) {
        item.qty += delta;
        if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
        saveCartState();
        renderCart();
    }
}

function renderCart() {
    cartContainer.innerHTML = '';
    
    if (cart.length === 0) {
        cartContainer.innerHTML = '<div class="empty-cart">El carrito está vacío</div>';
        updateTotals();
        return;
    }

    cart.forEach(item => {
        const imgUrl = item.image && item.image.trim() !== '' ? item.image : 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=50&q=80';
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <img src="${imgUrl}" alt="${item.name}" class="cart-item-img" onerror="this.src='https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=50&q=80'">
            <div class="cart-item-details">
                <span class="cart-item-name">${item.name}</span>
                <span class="cart-item-price">€${item.price.toFixed(2)}</span>
            </div>
            <div class="cart-item-actions">
                <button class="qty-btn" onclick="updateQty(${item.id}, -1)"><i class="fa-solid fa-minus"></i></button>
                <span class="qty-val">${item.qty}</span>
                <button class="qty-btn" onclick="updateQty(${item.id}, 1)"><i class="fa-solid fa-plus"></i></button>
            </div>
        `;
        cartContainer.appendChild(cartItem);
    });

    updateTotals();
}

function updateTotals() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const tax = subtotal * 0.10;
    const total = subtotal + tax;

    subtotalEl.textContent = `€${subtotal.toFixed(2)}`;
    taxEl.textContent = `€${tax.toFixed(2)}`;
    totalEl.textContent = `€${total.toFixed(2)}`;
    return total;
}

function processCheckout() {
    if (cart.length === 0) {
        showToast("¡El carrito está vacío!");
        return;
    }
    
    const total = updateTotals();
    
    // Update Reports
    salesToday.total += total;
    salesToday.count += 1;
    localStorage.setItem('pos_sales', JSON.stringify(salesToday));
    updateReports();

    showToast(`¡Cobro de €${total.toFixed(2)} procesado con éxito!`);
    
    // Clear current cart
    cart = [];
    saveCartState();
    renderCart();
    
    // Si cobramos una mesa, la liberamos
    if (currentTableId !== null) {
        setCartForTable(null); // Return to direct sale automatically
    }
}

// --- SETTINGS & REPORTS ---
function updateReports() {
    reportTodayEl.textContent = salesToday.total.toFixed(2);
    reportOrdersEl.textContent = salesToday.count;
}

function addNewProduct() {
    const name = document.getElementById('new-prod-name').value;
    const price = parseFloat(document.getElementById('new-prod-price').value);
    const cat = document.getElementById('new-prod-cat').value;
    const img = document.getElementById('new-prod-img').value;

    if (!name || isNaN(price) || !cat) {
        showToast("Por favor rellena Nombre, Precio y Categoría.");
        return;
    }

    const newProd = {
        id: Date.now(),
        name: name,
        price: price,
        category: cat,
        image: img || ''
    };

    products.push(newProd);
    localStorage.setItem('pos_products', JSON.stringify(products));
    
    showToast(`Producto ${name} guardado correctamente.`);
    
    // Reset form
    document.getElementById('new-prod-name').value = '';
    document.getElementById('new-prod-price').value = '';
    document.getElementById('new-prod-cat').value = '';
    document.getElementById('new-prod-img').value = '';
    
    renderCategories();
    renderProducts();
}

// --- UTILS ---
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Initialize
init();
