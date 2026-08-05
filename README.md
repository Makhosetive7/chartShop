# ChatShop / ChartShop

> Business management for SMEs — Telegram & WhatsApp chat POS, plus a web dashboard.

**One shop account. Same login everywhere.** Register once with a **username** and **4-digit PIN**, then use those credentials on web, Telegram, and WhatsApp. All three surfaces share the same products, sales, customers, and reports.

## Monorepo layout

```
chartShop/
  backend/    # Express API + Telegram/WhatsApp bots (Node.js)
  frontend/   # Vite + React + TypeScript web app
```

### Backend

```bash
cd backend
cp .env.example .env   # if needed
npm install
npm run dev            # or npm start
npm test
```

API base: `http://localhost:3000/api/v1`  
Docs: `backend/scripts/WEB_API_V1.md`

Railway / Nixpacks: set the service root directory to `backend`.

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev            # http://localhost:5173
```

From the repo root you can also run:

```bash
npm run dev:backend
npm run dev:frontend
npm run test:backend
npm run test:frontend
```

---

## Authentication (web · Telegram · WhatsApp)

| | |
|---|---|
| **Identity** | `username` (3–32 chars: `a-z`, `0-9`, `_`) |
| **Secret** | 4-digit PIN |
| **Account** | One `Shop` document in MongoDB |
| **Channels** | Telegram chat id and WhatsApp phone are *linked metadata*, not separate logins |

### How to sign in

| Platform | Register | Login |
|----------|----------|-------|
| **Web** | `/register` — username, shop name, PIN | `/login` — username + PIN |
| **Telegram / WhatsApp** | `register tinasales "My Shop" 4829` or `register` (step-by-step) | `login tinasales 4829` |
| **Linked chat only** | — | `login 4829` (after that chat is already linked) |

First successful `login <username> <pin>` on Telegram or WhatsApp **binds that chat** to the shop. After that, the same books appear on every platform. You can stay logged in on web + Telegram + WhatsApp at the same time; logout ends only that channel’s session.

API auth uses `username` + `pin` and returns a Bearer token:

```bash
curl -s http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"tinasales","pin":"4829"}'
```

Migrating an older DB that still used `telegramId` as the account key:

```bash
cd backend && node scripts/migrateUsernameAuth.js
```

---

## Overview (chat bot)

**ChatShop Business Bot** is a Telegram- and WhatsApp-based business management system for SMEs, with a matching web dashboard. Built with Node.js and MongoDB, it provides practical shop-ops features through chat and the browser — same account on every channel.

### Why ChatShop?

- **Zero Learning Curve** - Natural language commands
- **Mobile-First** - Works on any smartphone
- **Same account everywhere** - Web, Telegram, and WhatsApp share one shop
- **Real-Time** - Instant updates and notifications
- **Professional** - PDF reports for accountants and company owners
- **Cost-Effective** - Free and open source

---

## Key Features

### Core Business Management

| Feature                              | Description                                               |
| ------------------------------------ | --------------------------------------------------------- |
| **Real-time Sales Tracking**         | Record transactions instantly with automatic calculations |
| **Inventory Management**             | Track stock levels with automatic low-stock alerts        |
| **Customer Relationship Management** | Build customer loyalty and track purchase history         |
| **Order System**                     | Accept pre-orders, reservations, and delivery orders      |
| **Expense Tracking**                 | Monitor all business expenses by category                 |
| **Profit Calculation**               | Real profit analysis (Revenue - Expenses)                 |

### Advanced Analytics

- Daily/Weekly/Monthly Reports
- PDF Export with professional charts
- Best Sellers Analysis
- Customer Purchase Patterns
- Expense Breakdown by Category
- Profit & Loss Statements

### Operational Tools

- Flexible pricing for negotiations
- Sales cancellation and refunds
- Credit management for customers
- Username + PIN login shared across web, Telegram, and WhatsApp
- Low stock alerts and notifications

---

## Getting Started

### Prerequisites

- Telegram and/or WhatsApp, or a browser for the web app
- Internet connection
- Basic business data (products, prices)

### Quick Start

#### Option A — Web

1. Open `http://localhost:5173/register` (with backend + frontend running)
2. Choose a **username**, shop name, and **4-digit PIN**
3. Sign in later at `/login` with the same credentials

#### Option B — Telegram

Visit: [@CHART_SHOP_bot](https://t.me/CHART_SHOP_Bot) or click [here](https://t.me/CHART_SHOP_Bot)

```
register tinasales "My Shop Name" 4829
```

Or type `register` and follow the steps (username → shop name → description → PIN).

#### Add products & sell

```
add bread 2.50 stock 100
add milk 3.20 stock 50 threshold 10
sell 2 bread 1 milk
```

#### Use another platform

On WhatsApp or web, sign in with the **same** `tinasales` + `4829` — you get the same shop data.

---

## Complete Command Reference

### Product Management

| Command                             | Description               | Example                    |
| ----------------------------------- | ------------------------- | -------------------------- |
| `add [product] [price] stock [qty]` | Add new product           | `add bread 2.50 stock 100` |
| `price [product] [new-price]`       | Update product price      | `price bread 2.75`         |
| `stock [product] [qty]`             | Update stock level        | `stock bread 80`           |
| `stock +[product] [qty]`            | Add to existing stock     | `stock +milk 20`           |
| `stock -[product] [qty]`            | Remove from stock         | `stock -bread 5`           |
| `edit [product] [field] [value]`    | Edit product details      | `edit bread price 2.60`    |
| `delete [product]`                  | Remove product            | `delete bread`             |
| `list`                              | View all products         | `list`                     |
| `low stock`                         | Check low inventory items | `low stock`                |
| `threshold [product] [qty]`         | Set low stock alert level | `threshold milk 10`        |

### Sales & Transactions

| Command                        | Description                    | Example                           |
| ------------------------------ | ------------------------------ | --------------------------------- |
| `sell [qty] [product]`         | Record standard sale           | `sell 2 bread`                    |
| `sell [qty] [product] [price]` | Sale with custom pricing       | `sell 3 bread 2.25`               |
| `sell 2 bread 1 milk`          | Multiple items in one sale     | `sell 2 bread 1 milk 3 eggs`      |
| `cancel`                       | Show recent sales              | `cancel`                          |
| `cancel last [reason]`         | Cancel most recent sale        | `cancel last "wrong price"`       |
| `cancel sale 2 [reason]`       | Cancel specific sale by number | `cancel sale 2 "customer refund"` |
| `cancel refunds`               | View all refunds report        | `cancel refunds`                  |

### Customer Management

| Command                       | Description                          | Example                              |
| ----------------------------- | ------------------------------------ | ------------------------------------ |
| `customer add "Name" [phone]` | Add new customer                     | `customer add "John Doe" 1234567890` |
| `customers`                   | List all customers                   | `customers`                          |
| `customers active`            | Show active customers (last 30 days) | `customers active`                   |
| `customer [name/phone]`       | View customer profile & history      | `customer John`                      |
| `sell to [customer] [items]`  | Sell to specific customer            | `sell to John 2 bread 1 milk`        |
| `credit [customer] [amount]`  | Add credit (customer owes you)       | `credit John 50.00`                  |
| `payment [customer] [amount]` | Record payment received              | `payment John 25.00`                 |
| `credit history [customer]`   | View customer's credit transactions  | `credit history John`                |

### Order Management

| Command                                | Description                  | Example                        |
| -------------------------------------- | ---------------------------- | ------------------------------ |
| `order [customer] [items]`             | Place pickup order           | `order John 2 bread 1 milk`    |
| `order [customer] [items] delivery`    | Place delivery order         | `order John 2 bread delivery`  |
| `order [customer] [items] reservation` | Place reservation            | `order John cake reservation`  |
| `orders`                               | View all orders              | `orders`                       |
| `orders pending`                       | Show pending orders only     | `orders pending`               |
| `orders ready`                         | Show orders ready for pickup | `orders ready`                 |
| `order details [id]`                   | View order details           | `order details A1B2`           |
| `confirm order [id]`                   | Confirm order                | `confirm order A1B2`           |
| `ready order [id]`                     | Mark order as ready          | `ready order A1B2`             |
| `complete order [id]`                  | Complete order               | `complete order A1B2`          |
| `cancel order [id] [reason]`           | Cancel order with reason     | `cancel order A1B2 "no stock"` |

### Expense Tracking

| Command                                      | Description             | Example                                 |
| -------------------------------------------- | ----------------------- | --------------------------------------- |
| `expense [amount] [description]`             | Record basic expense    | `expense 50.00 "supplier payment"`      |
| `expense [amt] [desc] [category]`            | Expense with category   | `expense 25.50 transport cash`          |
| `expense [amt] [desc] [cat] [payment]`       | Full expense details    | `expense 1000.00 rent bank "July rent"` |
| `expense [amt] [desc] [cat] [pmt] [receipt]` | With receipt number     | `expense 150.00 supplies cash INV123`   |
| `expenses daily`                             | Today's expenses        | `expenses daily`                        |
| `expenses weekly`                            | This week's expenses    | `expenses weekly`                       |
| `expenses monthly`                           | This month's expenses   | `expenses monthly`                      |
| `expenses breakdown`                         | Category-wise breakdown | `expenses breakdown`                    |

### Reports & Analytics

| Command          | Description                         | Example          |
| ---------------- | ----------------------------------- | ---------------- |
| `daily`          | Today's sales report                | `daily`          |
| `weekly`         | 7-day sales analysis                | `weekly`         |
| `monthly`        | 30-day sales overview               | `monthly`        |
| `best`           | Top selling products (weekly)       | `best`           |
| `best month`     | Top selling products (monthly)      | `best month`     |
| `profit daily`   | Today's profit (Revenue - Expenses) | `profit daily`   |
| `profit weekly`  | Weekly profit analysis              | `profit weekly`  |
| `profit monthly` | Monthly profit & loss statement     | `profit monthly` |

### PDF Export Reports

| Command             | Description                         | Example             |
| ------------------- | ----------------------------------- | ------------------- |
| `export daily`      | Generate daily PDF report           | `export daily`      |
| `export weekly`     | Generate weekly PDF report          | `export weekly`     |
| `export monthly`    | Generate monthly PDF report         | `export monthly`    |
| `export best`       | Generate best sellers PDF (weekly)  | `export best`       |
| `export best month` | Generate best sellers PDF (monthly) | `export best month` |
| `pdf daily`         | Alternative syntax for daily PDF    | `pdf daily`         |
| `pdf weekly`        | Alternative syntax for weekly PDF   | `pdf weekly`        |

### Account Management

| Command | Description | Example |
| ------- | ----------- | ------- |
| `register [username] "Shop" [pin]` | Create shop and link this chat | `register tinasales "My Shop" 4829` |
| `register` | Step-by-step setup (username → shop → PIN) | `register` |
| `login [username] [pin]` | Sign in and link this chat if needed | `login tinasales 4829` |
| `login [pin]` | PIN-only (chat must already be linked) | `login 4829` |
| `logout` | End this channel’s session | `logout` |
| `account` / `profile` | View account (includes linked channels) | `account` |
| `status` | Registration / login status | `status` |
| `help` | Show command guide | `help` |

---

## Real-World Business Scenarios

### Scenario 1: Daily Shop Operations

#### Morning Routine

```
daily              # Check yesterday's sales
low stock          # What needs restocking
orders pending     # Orders to prepare today
```

#### During Business Hours

```
sell 2 bread 1 milk           # Customer purchase
sell 3 bread 2.25             # Bulk discount
sell to John 5 eggs           # Known customer sale
```

#### End of Day

```
daily                         # Today's total sales
expenses daily                # Record today's expenses
profit daily                  # Calculate actual profit
export daily                  # Save PDF for records
```

### Scenario 2: Customer Service Excellence

#### New Customer

```
customer add "Sarah Williams" 9876543210
sell to Sarah 2 bread 1 milk
credit Sarah 100.00           # Trusted customer credit
```

#### Regular Customer Service

```
customer John                 # View purchase history
order John birthday_cake      # Special order
confirm order ABC123          # Update order status
```

#### Credit Management

```
credit history John           # Check outstanding balance
payment John 50.00            # Record payment received
```

### Scenario 3: Inventory Management

#### Weekly Stock Check

```
list                          # View all products
low stock                     # Items below threshold
stock bread 100               # Restock bread
stock +milk 50                # Add more milk
```

#### Product Updates

```
price milk 3.50               # Update price
edit bread name "Artisan Bread"  # Rename product
delete expired_product        # Remove old items
```

### Scenario 4: Financial Management

#### Daily Financial Tracking

```
profit daily                  # Today's net profit
expense 45.00 transport cash  # Record expense
expenses breakdown            # Where money is going
```

#### Monthly Accounting

```
export monthly                # PDF for accountant
profit monthly                # Overall performance
expenses monthly              # Total monthly spending
```

---

## PDF Reports & Analytics

### Report Features

- **Professional Charts and Tables**: Visual data representation
- **Automatic Timestamps**: Every report is dated
- **Export Options**: Save for accounting/sharing
- **Comprehensive Data**: All metrics in one place

### Sample Report Structure

```
DAILY SALES REPORT - December 03, 2025
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Revenue Summary:
• Total Sales: $1,250.00
• Transactions: 45
• Average Sale: $27.78

Top Products:
1. Bread - 25 units - $62.50
2. Milk - 18 units - $57.60
3. Eggs - 30 units - $54.00

Expenses:
• Transport: $25.00
• Supplies: $150.00
• Total: $175.00

NET PROFIT: $1,075.00
```

---

## Security & Data Protection

### Access Control

- **Username + PIN**: One credential pair for web, Telegram, and WhatsApp
- **Channel linking**: First `login username pin` on a chat binds that transport to the shop
- **Per-channel sessions**: Concurrent web + chat logins; logout is channel-local
- **Session TTL**: Automatic expiry after inactivity
- **Rate limiting**: Failed PIN attempts lock the account briefly

### Privacy Features

- Customer data protection
- Business information privacy
- GDPR compliance ready
- No third-party data sharing

---

## Pro Tips for Maximum Benefit

### 1. Pricing Strategy

```bash
# Standard pricing
sell 2 bread              # At regular price $2.50

# Negotiated pricing for bulk
sell 10 bread 2.25        # Bulk discount

# Loyalty pricing for regulars
sell to John 5 bread 2.25 # Regular customer discount
```

### 2. Inventory Optimization

```bash
# Set smart thresholds
threshold milk 10         # Alert when below 10 units
threshold bread 20        # Higher threshold for fast-moving items

# Regular checks
low stock                 # Daily inventory check

# Smart restocking
stock +bread 50           # Restock based on sales data
```

### 3. Customer Relationships

```bash
# Track everything
customer John             # View complete history

# Offer credit to trusted customers
credit John 100.00        # Build loyalty

# Personalized service
order John special_cake   # Remember preferences
```

### 4. Financial Control

```bash
# Daily discipline
profit daily              # Check profitability
expenses daily            # Record all costs

# Monthly review
export monthly            # Share with accountant
profit monthly            # Strategic planning
```

---

## Success Metrics to Track

### Business Health Indicators

| Metric          | Target                      | How to Check         |
| --------------- | --------------------------- | -------------------- |
| Daily Sales     | Consistent/Growing          | `daily`              |
| Stock Turnover  | Products moving regularly   | `best`               |
| Customer Growth | Increasing active customers | `customers active`   |
| Profit Margin   | Revenue > Expenses          | `profit daily`       |
| Expense Ratio   | Costs < 40% of revenue      | `expenses breakdown` |

### Operational Efficiency

- **Time Saved**: Compare with manual methods
- **Error Reduction**: Fewer calculation mistakes
- **Reporting Speed**: Instant vs hours/days
- **Customer Satisfaction**: Faster service

---

## Contributing

We welcome contributions! Here's how you can help:

### Ways to Contribute

1. **Report Bugs**: Open an issue with detailed description
2. **Suggest Features**: Share your ideas for improvements
3. **Submit Pull Requests**: Fix bugs or add features
4. **Improve Documentation**: Help make docs clearer
5. **Share Success Stories**: Inspire other users

### Development Setup

```bash
# Fork the repository
git clone https://github.com/yourusername/chatshop-bot.git

# Create feature branch
git checkout -b feature/amazing-feature

# Make your changes
git commit -m "Add amazing feature"

# Push to branch
git push origin feature/amazing-feature

# Open Pull Request
```

## System Requirements

### For Business Owners

- Telegram, WhatsApp, and/or a web browser
- Smartphone or computer
- Internet connection
- Basic business data (products, prices)

### Technical Requirements

- Node.js 18+ (handled by Railway)
- MongoDB database (free tier available)
- Railway account (free tier available)
- Telegram Bot Token (free from @BotFather)

---

## Pricing & Plans

### Free Tier (Current)

- Unlimited products and sales
- Full reporting and PDF exports
- Unlimited customers
- Order management
- Expense tracking
- Community support

### Pro Features (Coming Soon)

- Advanced analytics dashboard
- Multi-shop management
- Priority support
- Custom branding
- API access for integrations

---

## Why Choose ChatShop?

### For Small Businesses

| Benefit            | Description                      |
| ------------------ | -------------------------------- |
| **Cost-Effective** | Completely free, no hidden costs |
| **Easy to Use**    | No technical skills required     |
| **Mobile-First**   | Works on any smartphone          |
| **Time-Saving**    | Automates manual bookkeeping     |
| **Professional**   | Business-grade PDF reports       |

### For Growing Enterprises

| Benefit        | Description               |
| -------------- | ------------------------- |
| **Scalable**   | Grows with your business  |
| **Reliable**   | 99.9% uptime guarantee    |
| **Secure**     | Enterprise-grade security |
| **Flexible**   | Customizable workflows    |
| **Integrated** | Works with existing tools |

---

## Ready to Transform Your Business?

### Get Started in 3 Steps

1. **Register** on web or Telegram with a username + PIN  
   (`register tinasales "Your Business" 4829`)
2. **Add stock**: `add bread 2.50 stock 100`
3. **Sell anywhere**: same account on web, Telegram, or WhatsApp

---

## Acknowledgments

Built for small businesses worldwide

**Technologies Used:**

- [Node.js](https://nodejs.org/) - Runtime environment
- [Telegram Bot API](https://core.telegram.org/bots/api) - Messaging (via axios)
- [MongoDB](https://www.mongodb.com/) - Database
- [PDFKit](https://pdfkit.org/) - PDF generation
- [Railway](https://railway.app/) - Hosting platform
- [Vite](https://vitejs.dev/) / [React](https://react.dev/) - Web dashboard
