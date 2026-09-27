import { relations } from 'drizzle-orm';
import { pgTable, text, serial, timestamp, integer, decimal, pgEnum } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  role: text('role').notNull().default('user'), // admin or user
  createdAt: timestamp('created_at').defaultNow(),
});

export const allowedEmails = pgTable('allowed_emails', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  addedBy: text('added_by'), // uid or email of the person who added it
  createdAt: timestamp('created_at').defaultNow(),
});

export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  companyName: text('company_name').notNull(),
  address: text('address'),
  phone: text('phone'),
  email: text('email'),
  afm: text('afm'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  companyName: text('company_name').notNull(),
  address: text('address'),
  phone: text('phone'),
  email: text('email'),
  afm: text('afm'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  productName: text('product_name').notNull(),
  sku: text('sku').unique(),
  category: text('category'),
  description: text('description'),
  unit: text('unit').notNull().default('pcs'),
  activeStatus: text('active_status').notNull().default('active'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const transactionTypeEnum = pgEnum('transaction_type', ['sale', 'purchase', 'payment_received', 'payment_made']);

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  transactionNumber: text('transaction_number').notNull().unique(),
  date: timestamp('date').notNull().defaultNow(),
  customerId: integer('customer_id').references(() => customers.id, { onDelete: 'cascade' }),
  supplierId: integer('supplier_id').references(() => suppliers.id, { onDelete: 'cascade' }),
  type: transactionTypeEnum('type').notNull(),
  notes: text('notes'),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  paidAmount: decimal('paid_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  documentData: text('document_data'),
  documentMimeType: text('document_mime_type'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const transactionItems = pgTable('transaction_items', {
  id: serial('id').primaryKey(),
  transactionId: integer('transaction_id').references(() => transactions.id, { onDelete: 'cascade' }).notNull(),
  productId: integer('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
  total: decimal('total', { precision: 12, scale: 2 }).notNull(),
});

export const customersRelations = relations(customers, ({ many }) => ({
  transactions: many(transactions),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  customer: one(customers, {
    fields: [transactions.customerId],
    references: [customers.id],
  }),
  supplier: one(suppliers, {
    fields: [transactions.supplierId],
    references: [suppliers.id],
  }),
  items: many(transactionItems),
}));

export const transactionItemsRelations = relations(transactionItems, ({ one }) => ({
  transaction: one(transactions, {
    fields: [transactionItems.transactionId],
    references: [transactions.id],
  }),
  product: one(products, {
    fields: [transactionItems.productId],
    references: [products.id],
  }),
}));
