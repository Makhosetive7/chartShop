# 🛍️ ChatShop Business Bot

> **Complete Business Management System for Telegram**  
> Manage your entire business - from sales and inventory to customer relationships and financial reporting - directly from Telegram and whatsapp.

---

## Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Getting Started](#-getting-started)
- [Complete Command Reference](#-complete-command-reference)
- [Real-World Business Scenarios](#-real-world-business-scenarios)
- [PDF Reports & Analytics](#-pdf-reports--analytics)
- [Security & Data Protection](#-security--data-protection)
- [Deployment](#-deployment)
- [Support & Resources](#-support--resources)
- [Contributing](#-contributing)

---

## Overview

**ChatShop Business Bot** is a comprehensive Telegram and whatsapp-based business management system designed specifically for Small and Medium Enterprises (SMEs). Built with Node.js and MongoDB, it provides enterprise-grade features through a simple chat interface.

### Why ChatShop?

- **Zero Learning Curve** - Natural language commands
- **Mobile-First** - Works on any smartphone
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
- Multi-user support with different access levels
- Low stock alerts and notifications

---

## Getting Started

### Prerequisites

- Telegram account
- Internet connection
- Basic business data (products, prices)

### Quick Start (3 Steps)

#### Access the Bot

Visit: [@CHART_SHOP_bot](https://t.me/CHART_SHOP_Bot) or click [here](https://t.me/CHART_SHOP_Bot)

#### Register Your Business

```
register "My Shop Name" 1234
```

#### Add Products & Start Selling

```
add bread 2.50 stock 100
add milk 3.20 stock 50 threshold 10
sell 2 bread 1 milk
```

**That's it!** You're now running your business through Telegram.

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

| Command       | Description                 | Example      |
| ------------- | --------------------------- | ------------ |
| `login [pin]` | Access your account         | `login 1234` |
| `logout`      | Secure logout               | `logout`     |
| `help`        | Show complete command guide | `help`       |

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

- **PIN-based Authentication**: Secure business access with 4-digit PIN
- **Session Management**: Automatic logout after inactivity
- **Data Encryption**: All data transmitted securely
- **Backup Systems**: Regular automated backups

### Privacy Features

- Customer data protection
- Business information privacy
- GDPR compliance ready
- No third-party data sharing

---

## Deployment

### Deploy on Railway (Recommended)

#### Step 1: Prerequisites

- [Railway account](https://railway.app) (free tier available)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account (free tier available)
- Telegram Bot Token from [@BotFather](https://t.me/BotFather)

#### Step 2: Setup MongoDB

```bash
1. Create MongoDB Atlas cluster
2. Get connection string (MONGODB_URI)
3. Whitelist all IPs (0.0.0.0/0) for Railway
```

#### Step 3: Create Telegram Bot

```bash
1. Message @BotFather on Telegram
2. Send: /newbot
3. Follow prompts to create bot
4. Save the bot token
```

#### Step 4: Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

```bash
# Set environment variables in Railway:
BOT_TOKEN=your_telegram_bot_token
MONGODB_URI=your_mongodb_connection_string
PORT=3000
```

#### Step 5: Set Webhook

```bash
# Railway will provide a URL like: https://your-app.railway.app
# Bot automatically sets webhook on startup
```

#### Step 6: Verify Deployment

```bash
# Check health endpoint
curl https://your-app.railway.app/health

# Expected response:
{"status":"ok","timestamp":"2025-12-03T..."}
```

### Local Development

```bash
# Clone repository
git clone https://github.com/yourusername/chatshop-bot.git
cd chatshop-bot

# Install dependencies
npm install

# Create .env file
BOT_TOKEN=your_bot_token
MONGODB_URI=your_mongodb_uri
PORT=3000

# Run bot
npm start

# For development with auto-reload
npm run dev
```

### Environment Variables

| Variable      | Description                          | Required    |
| ------------- | ------------------------------------ | ----------- |
| `BOT_TOKEN`   | Telegram bot token from @BotFather   | ✅ Yes      |
| `MONGODB_URI` | MongoDB connection string            | ✅ Yes      |
| `PORT`        | Server port (default: 3000)          | ❌ Optional |
| `NODE_ENV`    | Environment (production/development) | ❌ Optional |

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

## Troubleshooting

### Common Issues & Solutions

| Issue                      | Solution                                  |
| -------------------------- | ----------------------------------------- |
| Bot not responding         | Check `/health` endpoint                  |
| Webhook errors             | Review Railway logs: `railway logs`       |
| Database connection failed | Verify `MONGODB_URI` in Railway variables |
| PDF generation failed      | Check `reports/` directory permissions    |
| Command not recognized     | Type `help` for correct syntax            |

### Debug Commands

```bash
# Check bot health
curl https://your-app.railway.app/health

# View Railway logs
railway logs

# Test database connection
# (Add to your bot code)
mongoose.connection.on('connected', () => {
  console.log('MongoDB connected successfully');
});
```

---

## Implementation Roadmap

### Phase 1: Core Setup (Week 1)

- [ ] Register business and set PIN
- [ ] Add all products with stock levels
- [ ] Train staff on basic commands
- [ ] Record first week of sales
- [ ] Generate first daily reports

### Phase 2: Advanced Features (Week 2-3)

- [ ] Implement customer tracking
- [ ] Set up expense tracking system
- [ ] Create PDF report workflow
- [ ] Establish order management process

### Phase 3: Optimization (Month 2+)

- [ ] Analyze sales patterns
- [ ] Optimize inventory levels
- [ ] Build customer loyalty programs
- [ ] Integrate with accounting software

---

## Support & Resources

### Get Help

- **Telegram Bot**: [@CHART_SHOP_bot](https://t.me/CHART_SHOP_bot)
- **Command Guide**: Type `help` in bot
- **Health Check**: `https://your-app.railway.app/health`

### Documentation

- [Complete Command Reference](#-complete-command-reference)
- [Business Scenarios](#-real-world-business-scenarios)
- [Deployment Guide](#-deployment)
- [Troubleshooting](#-troubleshooting)

### Training Materials

- Staff Quick Guide (one-page reference)
- Video Tutorials (step-by-step setup)
- Business Case Studies
- Troubleshooting Guide

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

- Telegram account (free)
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

1. **Access**: Visit [@CHART_SHOP_bot](https://t.me/CHART_SHOP_bot)
2. **Register**: `register "Your Business" 1234`
3. **Start Selling**: `sell 2 bread 1 milk`

### Quick Links

- [Telegram Bot](https://t.me/CHART_SHOP_bot)
- [Documentation](#-complete-command-reference)
- [Deploy on Railway](https://railway.app/new)
- [Get Support](#-support--resources)

---

## Changelog

### Version 1.0.0 (Current)

- ✅ Core sales tracking
- ✅ Inventory management
- ✅ Customer management
- ✅ Order system
- ✅ Expense tracking
- ✅ PDF reports
- ✅ Profit calculation

### Upcoming Features

- 🔜 Multi-language support
- 🔜 Mobile app
- 🔜 Barcode scanning
- 🔜 Payment processing
- 🔜 Advanced analytics

---

## Acknowledgments

Built for small businesses worldwide

**Technologies Used:**

- [Node.js](https://nodejs.org/) - Runtime environment
- [Telegraf](https://telegraf.js.org/) - Telegram bot framework
- [MongoDB](https://www.mongodb.com/) - Database
- [PDFKit](https://pdfkit.org/) - PDF generation
- [Railway](https://railway.app/) - Hosting platform
