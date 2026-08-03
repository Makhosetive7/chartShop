export function getHelpText() {
  return `SMART SHOP ASSISTANT - Business Management Tool

===============
 CORE COMMANDS
===============
• help - Show this guide
• register - Step-by-step setup
• register "Business Name" 1234 - Quick setup
• login - Login with PIN
• login 1234 - Quick login
• logout - End session
• account - View account info
• status - Check registration/login status
• profile - View full profile

==================
PROFILE MANAGEMENT
==================
View:
• profile - View complete profile

Edit:
• profile edit name "New Name" - Change business name
• profile edit description "New Desc" - Update description
• profile edit pin - Change PIN (secure 2-step)

==================
PRODUCT MANAGEMENT
==================
Add/Edit:
• add bread 2.50 stock 100 - Add product
• price bread 2.75 - Update price
• stock +bread 80 - Update stock
• stock +"sports shoes" 30
• stock -bread 20 - Reduce stock
• stock -"blue butterfly heels" 30
• edit bread price 2.60 - Edit details
• edit "brown bread" name "Whole Wheat Bread"
• edit "blue butterfly heels" trackstock false
• edit "blue butterfly heels" threshold 5
• edit "mince meat" price 1.50
• delete bread - Remove product

View:
• list - All products
• low stock - Low inventory

====================
SALES & TRANSACTIONS
====================
Record Sales:
• sell 2 bread 1 milk - Standard sale
• sell 2 "velvet cake" 1.50 1 "blue butterfly heels" 25.00
• sell 3 bread 2.25 - Custom price 

Reports:
• daily - Today's report
• weekly - 7-day analysis
• monthly - 30-day report
• best - Top products

Cancel Sales:
• cancel - Recent sales
• cancel last [reason] - Cancel latest
• cancel sale 2 [reason] - Cancel specific
• cancel refunds - Refunds report

===================
CUSTOMER MANAGEMENT
===================
Customers:
• customer add "John" 1234567890 - Add
• customers - All customers
• customers active - Active (30 days)
• customer John - Profile & history
• customer 1234567890 - Find by phone

Customer Sales:
• sell to John 2 bread 1 milk
• sell to "Jane Doe" 3 eggs
• sell to 0771234567 2 bread 2.50
• sell to "John Smith" 1 "Brown Bread" 2.50

=================
CREDIT & PAYMENTS
=================
• credit John 2 bread - Ledger credit (items)
• credit "Jane Doe" 1 milk 2 eggs - Quoted names OK
• credit sale to John 2 bread - Credit sale (stock + invoice)
• payment John 50.00 - Record payment
• credit history John - Credit history

=============
ORDERS SYSTEM
=============
Place Orders:
• order John 2 bread 1 milk - Pickup
• order John 2 bread 1 milk delivery
• order John 2 bread 1 milk reservation
• order John 2 "mince meat" 1 milk
• order "Jane Doe" 2 "mince meat" 1 "blue butterfly heels" delivery

Manage Orders:
• order - All orders
• order pending - Pending
• order ready - Ready
• order details A1B2 - Details
• confirm order A1B2 - Confirm
• ready order A1B2 - Mark ready
• complete order A1B2 - Complete
• cancel order A1B2 "reason" - Cancel

=================
EXPENSES & PROFIT
=================
Expenses:
• expense 50.00 "supplier" - Basic
• expense 25.50 transport cash
• expense 1000.00 rent bank "July rent"

View Expenses:
• expenses daily - Today
• expenses weekly - Week
• expenses monthly - Month
• expenses breakdown - Categories

Profit:
• profit daily - Today's profit
• profit weekly - Weekly
• profit monthly - Monthly

===========
PDF REPORTS
===========
• export daily - Daily PDF
• export weekly - Weekly PDF  
• export monthly - Monthly PDF
• export best - Weekly best sellers
• export best month - Monthly best
• pdf daily - Alternative syntax

===========
QUICK START
===========
1. add bread 2.50
2. sell 2 bread
3. daily - Check sales
4. profit daily - Calculate profit

For detailed help on any command, type the command alone.`;
}
