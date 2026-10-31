(() => {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
  }

  const productGrid = document.querySelector('.product-grid');
  const productCards = productGrid ? Array.from(productGrid.querySelectorAll('[data-category]')) : [];
  const originalOrder = new Map(productCards.map((card, index) => [card, index]));
  let selectedCategory = 'all';
  const searchInput = document.querySelector('#product-search');
  let savedProducts = [];
  try { savedProducts = JSON.parse(localStorage.getItem('vastra-wishlist-v1') || '[]'); } catch { savedProducts = []; }
  let favoritesOnly = false;
  const priceFilter = document.querySelector('#price-filter');
  const fabricFilter = document.querySelector('#fabric-filter');
  const colorFilter = document.querySelector('#color-filter');
  const sortProducts = document.querySelector('#sort-products');

  const applyProductFilters = () => {
    const priceRange = priceFilter?.value || 'all';
    const fabric = fabricFilter?.value || 'all';
    const color = colorFilter?.value || 'all';
    productCards.forEach((card) => {
      const price = Number(card.dataset.price || 0);
      const matchesPrice = priceRange === 'all'
        || (priceRange === 'under2500' && price < 2500)
        || (priceRange === '2500to4999' && price >= 2500 && price < 5000)
        || (priceRange === '5000plus' && price >= 5000);
      const matchesCategory = selectedCategory === 'all' || card.dataset.category === selectedCategory;
      const matchesFabric = fabric === 'all' || card.dataset.fabric === fabric;
      const matchesColor = color === 'all' || card.dataset.color === color;
      const query = (searchInput?.value || '').trim().toLocaleLowerCase();
      const matchesSearch = !query || card.textContent.toLocaleLowerCase().includes(query);
      const matchesFavorite = !favoritesOnly || savedProducts.includes(card.querySelector('[data-add-to-cart]')?.dataset.id);
      card.hidden = !(matchesPrice && matchesCategory && matchesFabric && matchesColor && matchesSearch && matchesFavorite);
    });
    const sortMode = sortProducts?.value || 'featured';
    const sorted = [...productCards].sort((a, b) => {
      if (sortMode === 'price-low') return Number(a.dataset.price) - Number(b.dataset.price);
      if (sortMode === 'price-high') return Number(b.dataset.price) - Number(a.dataset.price);
      if (sortMode === 'name') return a.querySelector('h3').textContent.localeCompare(b.querySelector('h3').textContent);
      return originalOrder.get(a) - originalOrder.get(b);
    });
    sorted.forEach((card) => productGrid.append(card));
  };
  document.querySelectorAll('[data-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedCategory = button.dataset.filter;
      document.querySelectorAll('[data-filter]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
      applyProductFilters();
    });
  });
  [priceFilter, fabricFilter, colorFilter, sortProducts].forEach((control) => control?.addEventListener('change', applyProductFilters));
  searchInput?.addEventListener('input', applyProductFilters);
  document.querySelector('[data-clear-search]')?.addEventListener('click', () => { if (searchInput) searchInput.value = ''; applyProductFilters(); searchInput?.focus(); });
  const wishlistButton = document.querySelector('[data-toggle-wishlist]');
  const renderWishlist = () => {
    wishlistButton?.classList.toggle('has-notification', savedProducts.length > 0);
    wishlistButton?.setAttribute('aria-label', savedProducts.length ? 'Show saved products, ' + savedProducts.length + ' saved' : 'Show saved products');
    document.querySelectorAll('[data-favorite]').forEach((button) => {
      const card = button.closest('.product-card');
      const product = card?.querySelector('[data-add-to-cart]');
      const saved = Boolean(product && savedProducts.includes(product.dataset.id));
      button.setAttribute('aria-pressed', String(saved));
      button.setAttribute('aria-label', saved ? 'Remove ' + product.dataset.name + ' from saved products' : 'Save ' + (product?.dataset.name || 'this product'));
      button.classList.toggle('is-saved', saved);
    });
    wishlistButton?.setAttribute('aria-pressed', String(favoritesOnly));
  };
  document.querySelectorAll('[data-favorite]').forEach((button) => button.addEventListener('click', () => {
    const product = button.closest('.product-card')?.querySelector('[data-add-to-cart]');
    if (!product) return;
    savedProducts = savedProducts.includes(product.dataset.id) ? savedProducts.filter((id) => id !== product.dataset.id) : [...savedProducts, product.dataset.id];
    try { localStorage.setItem('vastra-wishlist-v1', JSON.stringify(savedProducts)); } catch { /* Favorites still work for this page view. */ }
    renderWishlist();
    if (favoritesOnly) applyProductFilters();
  }));
  wishlistButton?.addEventListener('click', () => { favoritesOnly = !favoritesOnly; renderWishlist(); applyProductFilters(); });
  renderWishlist();

  const filterPanel = document.querySelector('#shop-filters');
  const filterToggles = Array.from(document.querySelectorAll('[data-toggle-filters]'));
  const setFilterPanelOpen = (open) => {
    if (!filterPanel) return;
    filterPanel.hidden = !open;
    filterToggles.forEach((button) => button.setAttribute('aria-expanded', String(open)));
    if (open) filterPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  filterToggles.forEach((button) => button.addEventListener('click', () => setFilterPanelOpen(filterPanel?.hidden)));
  document.querySelector('#reset-filters')?.addEventListener('click', () => {
    if (priceFilter) priceFilter.value = 'all';
    if (fabricFilter) fabricFilter.value = 'all';
    if (colorFilter) colorFilter.value = 'all';
    if (sortProducts) sortProducts.value = 'featured';
    selectedCategory = 'all';
    document.querySelectorAll('[data-filter]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.filter === 'all')));
    applyProductFilters();
  });

  const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  const storageKey = 'vastra-cart-v1';
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { cart = []; }
  const dialog = document.querySelector('#cart-dialog');
  const checkoutDialog = document.querySelector('#checkout-dialog');
  const signInDialog = document.querySelector('#signin-dialog');
  document.querySelector('[data-open-signin]')?.addEventListener('click', () => signInDialog?.showModal());
  document.querySelector('[data-close-signin]')?.addEventListener('click', () => signInDialog?.close());
  const cartButton = document.querySelector('[data-open-cart]');
  const items = document.querySelector('#cart-items');
  const subtotal = document.querySelector('#cart-subtotal');
  const note = document.querySelector('#cart-note');
  const orderForm = document.querySelector('#order-form');
  const checkoutStatus = document.querySelector('#checkout-status');
  const checkoutSuccess = document.querySelector('#checkout-success');
  const checkoutSuccessMessage = document.querySelector('#checkout-success-message');
  const placeOrderButton = document.querySelector('#place-order-button');

  const saveCart = () => {
    try { localStorage.setItem(storageKey, JSON.stringify(cart)); } catch { /* Cart still works for this page view. */ }
  };
  const renderCart = () => {
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    cartButton?.classList.toggle('has-notification', totalCount > 0);
    cartButton?.setAttribute('aria-label', totalCount ? 'Open shopping basket, ' + totalCount + ' items' : 'Open shopping basket');
    if (subtotal) subtotal.textContent = money.format(total);
    if (!items) return;
    items.replaceChildren();
    if (!cart.length) {
      const empty = document.createElement('p');
      empty.className = 'cart-empty';
      empty.textContent = 'Your cart is empty. Explore the collection to find a look you love.';
      items.append(empty);
      return;
    }
    cart.forEach((item) => {
      const row = document.createElement('article');
      row.className = 'cart-item';
      const details = document.createElement('div');
      const title = document.createElement('h3');
      title.textContent = item.name;
      const price = document.createElement('p');
      price.textContent = money.format(item.price) + ' each';
      details.append(title, price);
      const controls = document.createElement('div');
      controls.className = 'cart-item-actions';
      const minus = document.createElement('button');
      minus.type = 'button'; minus.textContent = '−'; minus.setAttribute('aria-label', 'Remove one ' + item.name);
      minus.addEventListener('click', () => changeQuantity(item.id, -1));
      const quantity = document.createElement('span'); quantity.textContent = String(item.quantity);
      const plus = document.createElement('button');
      plus.type = 'button'; plus.textContent = '+'; plus.setAttribute('aria-label', 'Add one ' + item.name);
      plus.addEventListener('click', () => changeQuantity(item.id, 1));
      const remove = document.createElement('button');
      remove.type = 'button'; remove.className = 'remove-item'; remove.textContent = 'Remove';
      remove.addEventListener('click', () => { cart = cart.filter((entry) => entry.id !== item.id); saveCart(); renderCart(); });
      controls.append(minus, quantity, plus, remove);
      row.append(details, controls);
      items.append(row);
    });
  };
  const changeQuantity = (id, difference) => {
    const item = cart.find((entry) => entry.id === id);
    if (!item) return;
    item.quantity += difference;
    if (item.quantity <= 0) cart = cart.filter((entry) => entry.id !== id);
    saveCart(); renderCart();
  };
  renderCart();

  document.querySelectorAll('[data-add-to-cart], [data-buy-now]').forEach((button) => {
    button.addEventListener('click', () => {
      const { id, name, price } = button.dataset;
      const existing = cart.find((item) => item.id === id);
      if (existing) existing.quantity += 1;
      else cart.push({ id, name, price: Number(price), quantity: 1 });
      saveCart(); renderCart();
      if (dialog && !dialog.open) dialog.showModal();
      if (note) note.textContent = button.hasAttribute('data-buy-now') ? name + ' added to your basket.' : name + ' added to your basket.';
    });
  });
  document.querySelectorAll('[data-open-cart]').forEach((button) => button.addEventListener('click', () => dialog?.showModal()));
  document.querySelectorAll('[data-close-cart]').forEach((button) => button.addEventListener('click', () => dialog?.close()));
  const checkout = document.querySelector('#checkout-button');
  const resetCheckoutDialog = () => {
    orderForm?.reset();
    if (orderForm) orderForm.hidden = false;
    if (checkoutSuccess) checkoutSuccess.hidden = true;
    if (checkoutStatus) checkoutStatus.textContent = '';
  };
  checkoutDialog?.addEventListener('close', resetCheckoutDialog);
  document.querySelectorAll('[data-close-checkout]').forEach((button) => button.addEventListener('click', () => checkoutDialog?.close()));
  document.querySelector('[data-back-to-cart]')?.addEventListener('click', () => {
    checkoutDialog?.close();
    dialog?.showModal();
  });
  if (checkout) checkout.addEventListener('click', () => {
    if (!cart.length) {
      if (note) note.textContent = 'Add an item to your basket before checkout.';
      return;
    }
    if (dialog?.open) dialog.close();
    checkoutDialog?.showModal();
  });

  orderForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!cart.length || !orderForm.reportValidity()) return;
    const supabase = window.vastraSupabase;
    if (!supabase) {
      if (checkoutStatus) checkoutStatus.textContent = 'Order setup is incomplete. Please contact the store.';
      return;
    }

    const values = Object.fromEntries(new FormData(orderForm).entries());
    const payload = {
      p_customer_name: values.customer_name,
      p_email: values.email,
      p_phone: values.phone,
      p_address: values.address,
      p_city: values.city,
      p_postal_code: values.postal_code,
      p_items: cart.map(({ id, quantity }) => ({ id, quantity }))
    };
    const originalButtonText = placeOrderButton?.textContent || 'Place order';
    if (placeOrderButton) { placeOrderButton.disabled = true; placeOrderButton.textContent = 'Placing order…'; }
    if (checkoutStatus) checkoutStatus.textContent = 'Submitting your order request…';

    try {
      const { data: orderId, error } = await supabase.rpc('place_store_order', payload);
      if (error) {
        if (error.code === 'PGRST202' || error.code === '42883') {
          throw new Error('Database setup is not complete yet. Run the supplied Supabase SQL setup first.');
        }
        throw new Error('We could not submit the order. Please check your details and try again.');
      }
      cart = [];
      saveCart();
      renderCart();
      if (orderForm) orderForm.hidden = true;
      if (checkoutSuccessMessage) checkoutSuccessMessage.textContent = orderId
        ? 'Your order reference is ' + orderId + '. We’ll contact you to confirm the order and payment.'
        : 'We’ll contact you to confirm the order and payment.';
      if (checkoutSuccess) checkoutSuccess.hidden = false;
      if (checkoutStatus) checkoutStatus.textContent = '';
    } catch (error) {
      if (checkoutStatus) checkoutStatus.textContent = error instanceof TypeError
        ? 'Could not reach the order service. Please try again when you are online.'
        : error.message;
    } finally {
      if (placeOrderButton) { placeOrderButton.disabled = false; placeOrderButton.textContent = originalButtonText; }
    }
  });

  document.querySelectorAll('form[data-demo-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const message = form.querySelector('.form-message');
      if (message) message.textContent = form.dataset.success || 'Thank you. This preview form is not connected to a service yet.';
    });
  });
})();











