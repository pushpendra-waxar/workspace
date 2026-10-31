(() => {
  const supabase = window.vastraSupabase;
  const loginPanel = document.querySelector('#admin-login-panel');
  const ordersPanel = document.querySelector('#admin-orders-panel');
  const loginForm = document.querySelector('#admin-login-form');
  const loginMessage = document.querySelector('#admin-login-message');
  const ordersMessage = document.querySelector('#orders-message');
  const ordersList = document.querySelector('#orders-list');
  const loginButton = document.querySelector('#admin-login-button');
  const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

  const showLogin = (message = '') => {
    if (loginPanel) loginPanel.hidden = false;
    if (ordersPanel) ordersPanel.hidden = true;
    if (loginMessage) loginMessage.textContent = message;
  };
  const showOrders = () => {
    if (loginPanel) loginPanel.hidden = true;
    if (ordersPanel) ordersPanel.hidden = false;
  };
  const makeText = (tag, className, value) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = value == null ? '' : String(value);
    return element;
  };

  async function verifyAdmin(user) {
    const { data, error } = await supabase
      .from('store_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error || !data) {
      await supabase.auth.signOut({ scope: 'local' });
      showLogin(error ? 'Could not verify administrator access. Check the database setup.' : 'This account is not approved as an administrator.');
      return;
    }
    showOrders();
    await loadOrders();
  }

  function renderOrders(orders, items) {
    ordersList.replaceChildren();
    if (!orders.length) {
      ordersList.append(makeText('p', 'orders-empty', 'No orders have been placed yet.'));
      return;
    }
    const groupedItems = new Map();
    items.forEach((item) => {
      if (!groupedItems.has(item.order_id)) groupedItems.set(item.order_id, []);
      groupedItems.get(item.order_id).push(item);
    });
    orders.forEach((order) => {
      const card = document.createElement('article');
      card.className = 'order-card';
      const heading = document.createElement('div');
      heading.className = 'order-card-heading';
      const orderTitle = makeText('h2', '', 'Order ' + order.id.slice(0, 8).toUpperCase());
      const status = makeText('span', 'order-status', order.status);
      heading.append(orderTitle, status);

      const date = new Date(order.created_at);
      const details = document.createElement('div');
      details.className = 'order-customer-details';
      details.append(
        makeText('p', '', new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date)),
        makeText('p', '', order.customer_name),
        makeText('p', '', order.email),
        makeText('p', '', order.phone),
        makeText('p', '', [order.address, order.city, order.postal_code].filter(Boolean).join(', '))
      );

      const itemList = document.createElement('ul');
      itemList.className = 'order-items-list';
      (groupedItems.get(order.id) || []).forEach((item) => {
        const line = document.createElement('li');
        line.append(
          makeText('span', '', item.product_name + ' × ' + item.quantity),
          makeText('strong', '', money.format(item.line_total))
        );
        itemList.append(line);
      });

      const total = document.createElement('div');
      total.className = 'order-total';
      total.append(makeText('span', '', 'Order total'), makeText('strong', '', money.format(order.subtotal)));
      card.append(heading, details, itemList, total);
      ordersList.append(card);
    });
  }

  async function loadOrders() {
    if (!supabase || !ordersList) return;
    if (ordersMessage) ordersMessage.textContent = 'Loading orders…';
    ordersList.replaceChildren();
    const { data: orders, error: ordersError } = await supabase
      .from('store_orders')
      .select('id,created_at,customer_name,email,phone,address,city,postal_code,status,subtotal')
      .order('created_at', { ascending: false })
      .limit(100);
    if (ordersError) {
      if (ordersMessage) ordersMessage.textContent = 'Could not load orders. Check that the admin SQL setup has been run.';
      return;
    }
    if (!orders?.length) {
      renderOrders([], []);
      if (ordersMessage) ordersMessage.textContent = '';
      return;
    }
    const { data: items, error: itemsError } = await supabase
      .from('store_order_items')
      .select('order_id,product_name,quantity,line_total')
      .in('order_id', orders.map((order) => order.id));
    if (itemsError) {
      if (ordersMessage) ordersMessage.textContent = 'Orders loaded, but their item details could not be retrieved.';
      renderOrders(orders, []);
      return;
    }
    renderOrders(orders, items || []);
    if (ordersMessage) ordersMessage.textContent = orders.length === 100 ? 'Showing the latest 100 orders.' : '';
  }

  document.querySelector('#admin-login-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!supabase) {
      showLogin('The Supabase client did not load. Check your internet connection and reload this page.');
      return;
    }
    const values = Object.fromEntries(new FormData(loginForm).entries());
    if (loginButton) { loginButton.disabled = true; loginButton.textContent = 'Signing in…'; }
    if (loginMessage) loginMessage.textContent = '';
    const { data, error } = await supabase.auth.signInWithPassword({ email: values.email, password: values.password });
    if (error || !data.user) {
      showLogin('Sign in failed. Check your email and password.');
    } else {
      await verifyAdmin(data.user);
    }
    if (loginButton) { loginButton.disabled = false; loginButton.textContent = 'Sign in'; }
  });

  document.querySelector('#refresh-orders')?.addEventListener('click', loadOrders);
  document.querySelector('#admin-signout')?.addEventListener('click', async () => {
    if (supabase) await supabase.auth.signOut({ scope: 'local' });
    showLogin('You have signed out.');
  });

  if (!supabase) {
    showLogin('The Supabase client did not load. Check your internet connection and reload this page.');
    return;
  }
  supabase.auth.getSession().then(({ data, error }) => {
    if (error || !data.session?.user) {
      showLogin();
      return;
    }
    verifyAdmin(data.session.user);
  });
})();
