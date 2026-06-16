// Kiosk POS Logic

const defaultProducts = [
    { id: 1, name: 'Espresso Doble', price: 2.50, category: 'Cafetería', image: '../assets/drink.jpg' },
    { id: 2, name: 'Latte Macchiato', price: 3.20, category: 'Cafetería', image: '../assets/drink.jpg' },
    { id: 3, name: 'Avocado Toast', price: 5.50, category: 'Desayunos', image: '../assets/food.jpg' },
    { id: 4, name: 'Pancakes', price: 6.00, category: 'Desayunos', image: '../assets/food.jpg' },
    { id: 5, name: 'Zumo Naranja', price: 3.00, category: 'Bebidas', image: '../assets/drink.jpg' },
    { id: 6, name: 'Cheesecake', price: 4.50, category: 'Postres', image: '../assets/food.jpg' }
];

// Fetch shared products from localStorage or default
let products = JSON.parse(localStorage.getItem('pos_products')) || defaultProducts;

let cart = [];
let currentCategory = 'Todos';

const productsContainer = document.getElementById('products-container');
const categoriesContainer = document.getElementById('categories-container');
const cartContainer = document.getElementById('cart-container');
const subtotalEl = document.getElementById('subtotal');
const taxEl = document.getElementById('tax');
const totalEl = document.getElementById('total');

// Kiosk Screens
const welcomeScreen = document.getElementById('welcome-screen');
const thanksScreen = document.getElementById('thanks-screen');

function init() {
    renderCategories();
    renderProducts();
}

function startOrder() {
    welcomeScreen.style.display = 'none';
    cart = [];
    renderCart();
}

function cancelOrder() {
    cart = [];
    welcomeScreen.style.display = 'flex';
}

function renderCategories() {
    const cats = ['Todos', ...new Set(products.map(p => p.category))];
    categoriesContainer.innerHTML = '';
    
    cats.forEach(c => {
        const btn = document.createElement('button');
        btn.className = `category-btn ${c === currentCategory ? 'active' : ''}`;
        btn.textContent = c;
        btn.onclick = () => {
            currentCategory = c;
            renderCategories();
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
        
        const imgUrl = product.image && product.image.trim() !== '' ? product.image : 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=300&q=80';
        
        card.innerHTML = `
            <img src="${imgUrl}" alt="${product.name}" class="product-image" onerror="this.src='https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=300&q=80'">
            <div class="product-info">
                <span class="product-name" style="font-size: 20px;">${product.name}</span>
                <span class="product-price" style="font-size: 20px;">€${product.price.toFixed(2)}</span>
            </div>
        `;
        productsContainer.appendChild(card);
    });
}

function addToCart(product) {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) existingItem.qty += 1;
    else cart.push({ ...product, qty: 1 });
    
    renderCart();
}

function updateQty(id, delta) {
    const item = cart.find(item => item.id === id);
    if (item) {
        item.qty += delta;
        if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
        renderCart();
    }
}

function renderCart() {
    cartContainer.innerHTML = '';
    
    if (cart.length === 0) {
        cartContainer.innerHTML = '<div class="empty-cart">Añade productos para empezar</div>';
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
                <span class="cart-item-name" style="font-size: 18px;">${item.name}</span>
                <span class="cart-item-price" style="font-size: 16px;">€${item.price.toFixed(2)}</span>
            </div>
            <div class="cart-item-actions" style="transform: scale(1.2); margin-right: 10px;">
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

function processKioskCheckout() {
    if (cart.length === 0) {
        showToast("¡El carrito está vacío!");
        return;
    }
    
    const total = updateTotals();
    
    // Simulate payment process delay
    thanksScreen.style.display = 'flex';
    
    // Update local sales data so restaurant sees it
    let salesToday = JSON.parse(localStorage.getItem('pos_sales')) || { total: 0, count: 0 };
    salesToday.total += total;
    salesToday.count += 1;
    localStorage.setItem('pos_sales', JSON.stringify(salesToday));
    
    setTimeout(() => {
        thanksScreen.style.display = 'none';
        welcomeScreen.style.display = 'flex';
        cart = [];
        renderCart();
    }, 4000); // Wait 4 seconds then reset
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Initialize
init();
