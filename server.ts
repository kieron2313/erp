import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { requireAuth, requireAdmin, type AuthRequest } from './src/middleware/auth.ts';
import { db } from './src/db/index.ts';
import { users, customers, suppliers, products, transactions, transactionItems, allowedEmails } from './src/db/schema.ts';
import { eq, desc, sql } from 'drizzle-orm';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: { 'User-Agent': 'aistudio-build' }
  }
});

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.DEFAULT_APP_PORT || (process.env.NGINX_PORT ? '3000' : (process.env.PORT || '3000')));

  app.use(express.json({ limit: '50mb' }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Diagnostic version check
  app.get('/api/version', async (req, res) => {
    let hostExists = false;
    let cloudsqlExists = false;
    let availableSockets: string[] = [];
    try {
      const fs = await import('fs');
      if (process.env.SQL_HOST && fs.existsSync(process.env.SQL_HOST)) {
        hostExists = true;
      }
      if (fs.existsSync('/cloudsql')) {
        cloudsqlExists = true;
        availableSockets = fs.readdirSync('/cloudsql');
      } else if (fs.existsSync('/app/cloudsql')) {
        availableSockets = fs.readdirSync('/app/cloudsql');
      }
    } catch {}

    try {
      const s = await db.select({ count: sql<number>`count(*)` }).from(suppliers);
      res.json({ 
        version: '2026-09-26-v5',
        suppliersCount: Number(s[0]?.count || 0),
        status: 'ok',
        host: process.env.SQL_HOST,
        hostExists,
        cloudsqlExists,
        availableSockets
      });
    } catch (e: any) {
      res.json({ 
        version: '2026-09-26-v5', 
        error: e.message, 
        code: e.code,
        host: process.env.SQL_HOST,
        hostExists,
        cloudsqlExists,
        availableSockets,
        cause: e.cause ? {
          message: e.cause.message,
          code: e.cause.code,
          name: e.cause.name,
          routine: (e.cause as any).routine,
          detail: (e.cause as any).detail,
          hint: (e.cause as any).hint
        } : null,
        detail: e.detail || null
      });
    }
  });

  app.get('/api/auth/verify', requireAuth, (req: AuthRequest, res) => {
    res.json({ status: 'ok', user: req.dbUser });
  });
  
  // Dashboard Metrics
  app.get('/api/dashboard', requireAuth, async (req: AuthRequest, res) => {
    try {
      let customersCount = 0;
      let suppliersCount = 0;
      let productsCount = 0;
      let receivables = 0;
      let payables = 0;
      let recentTransactions: any[] = [];
      let overdueTransactions: any[] = [];

      try {
        const c = await db.select({ count: sql<number>`count(*)` }).from(customers);
        customersCount = Number(c[0]?.count || 0);
      } catch (err) {
        console.warn('Error counting customers:', err);
      }

      try {
        const s = await db.select({ count: sql<number>`count(*)` }).from(suppliers);
        suppliersCount = Number(s[0]?.count || 0);
      } catch (err) {
        console.warn('Error counting suppliers:', err);
      }

      try {
        const p = await db.select({ count: sql<number>`count(*)` }).from(products);
        productsCount = Number(p[0]?.count || 0);
      } catch (err) {
        console.warn('Error counting products:', err);
      }

      try {
        const sales = await db.select({ total: sql<number>`sum(total_amount)` }).from(transactions).where(eq(transactions.type, 'sale'));
        const purchases = await db.select({ total: sql<number>`sum(total_amount)` }).from(transactions).where(eq(transactions.type, 'purchase'));
        const customSalesPaid = await db.select({ total: sql<number>`sum(paid_amount)` }).from(transactions).where(eq(transactions.type, 'sale'));
        const customPurchasesPaid = await db.select({ total: sql<number>`sum(paid_amount)` }).from(transactions).where(eq(transactions.type, 'purchase'));
        
        const paymentsReceived = await db.select({ total: sql<number>`sum(total_amount)` }).from(transactions).where(eq(transactions.type, 'payment_received'));
        const paymentsMade = await db.select({ total: sql<number>`sum(total_amount)` }).from(transactions).where(eq(transactions.type, 'payment_made'));
        
        receivables = Number(sales[0]?.total || 0) - Number(paymentsReceived[0]?.total || 0) - Number(customSalesPaid[0]?.total || 0);
        payables = Number(purchases[0]?.total || 0) - Number(paymentsMade[0]?.total || 0) - Number(customPurchasesPaid[0]?.total || 0);
      } catch (err) {
        console.warn('Error calculating receivables/payables:', err);
      }

      try {
        recentTransactions = await db.select().from(transactions).orderBy(desc(transactions.date)).limit(5);
      } catch (err) {
        console.warn('Error fetching recent transactions:', err);
      }

      try {
        const allTransactions = await db.select({
          id: transactions.id,
          transactionNumber: transactions.transactionNumber,
          type: transactions.type,
          date: transactions.date,
          totalAmount: transactions.totalAmount,
          paidAmount: transactions.paidAmount,
          customerId: transactions.customerId,
          supplierId: transactions.supplierId,
        }).from(transactions);
        
        overdueTransactions = allTransactions.filter(t => {
          const remaining = Number(t.totalAmount) - Number(t.paidAmount);
          if (remaining <= 0) return false;
          const daysPassed = (new Date().getTime() - new Date(t.date).getTime()) / (1000 * 3600 * 24);
          return daysPassed > 45;
        });
      } catch (err) {
        console.warn('Error calculating overdue transactions:', err);
      }

      res.json({
        totalCustomers: customersCount,
        totalSuppliers: suppliersCount,
        totalProducts: productsCount,
        receivables,
        payables,
        recentTransactions,
        overdueTransactions,
      });
    } catch (error: any) {
      console.error('Fatal error in /api/dashboard:', error);
      res.status(500).json({ error: error?.message || 'Failed to load dashboard data' });
    }
  });

  app.get('/api/quota', requireAuth, async (req: AuthRequest, res) => {
    try {
      const totalQuotaBytes = 5 * 1024 * 1024 * 1024; // 5 GB
      let usedBytes = 15 * 1024 * 1024; // Default baseline ~15MB
      
      try {
        const result = await db.execute(sql`SELECT pg_database_size(current_database()) AS size_bytes`);
        const qBytes = Number((result as any)[0]?.size_bytes || (result as any)?.rows?.[0]?.size_bytes || 0);
        if (qBytes > 0) usedBytes = qBytes;
      } catch (qErr) {
        console.warn('Could not query exact pg_database_size, using standard baseline:', qErr);
      }

      const remainingBytes = Math.max(0, totalQuotaBytes - usedBytes);
      const percentUsed = Math.min(100, (usedBytes / totalQuotaBytes) * 100);
      const percentLeft = Math.max(0, 100 - percentUsed);

      res.json({
        usedBytes,
        totalQuotaBytes,
        remainingBytes,
        percentUsed: Number(percentUsed.toFixed(2)),
        percentLeft: Number(percentLeft.toFixed(2)),
        usedFormatted: (usedBytes / (1024 * 1024)).toFixed(2) + ' MB',
        remainingFormatted: (remainingBytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
        totalFormatted: '5.0 GB',
        status: 'healthy'
      });
    } catch (error) {
      console.error('Error fetching quota:', error);
      res.status(500).json({ error: 'Failed to fetch quota' });
    }
  });

  app.get('/api/customers', requireAuth, async (req: AuthRequest, res) => {
    try {
      const allCustomers = await db.select().from(customers).orderBy(desc(customers.createdAt));
      const allTransactions = await db.select().from(transactions).where(eq(transactions.type, 'sale'));
      const customersWithBalance = allCustomers.map(c => {
         const customerTxs = allTransactions.filter(t => t.customerId === c.id);
         const totalOwed = customerTxs.reduce((sum, tx) => sum + (Number(tx.totalAmount) - Number(tx.paidAmount)), 0);
         return { ...c, totalOwed };
      });
      res.json(customersWithBalance);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch customers' });
    }
  });

  app.post('/api/customers', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { companyName, address, phone, email, afm, notes } = req.body;
      const newCustomer = await db.insert(customers).values({
        companyName, address, phone, email, afm, notes
      }).returning();
      res.json(newCustomer[0]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create customer' });
    }
  });

  app.delete('/api/customers/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(customers).where(eq(customers.id, id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete customer' });
    }
  });

  app.get('/api/customers/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const customer = await db.select().from(customers).where(eq(customers.id, id));
      if (customer.length === 0) return res.status(404).json({ error: 'Customer not found' });
      res.json(customer[0]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch customer' });
    }
  });

  app.put('/api/customers/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { companyName, address, phone, email, afm, notes } = req.body;
      const updatedCustomer = await db.update(customers).set({
        companyName, address, phone, email, afm, notes
      }).where(eq(customers.id, id)).returning();
      if (updatedCustomer.length === 0) return res.status(404).json({ error: 'Customer not found' });
      res.json(updatedCustomer[0]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update customer' });
    }
  });

  app.get('/api/suppliers', requireAuth, async (req: AuthRequest, res) => {
    try {
      const allSuppliers = await db.select().from(suppliers).orderBy(desc(suppliers.createdAt));
      const allTransactions = await db.select().from(transactions).where(eq(transactions.type, 'purchase'));
      const suppliersWithBalance = allSuppliers.map(s => {
         const supplierTxs = allTransactions.filter(t => t.supplierId === s.id);
         const totalOwed = supplierTxs.reduce((sum, tx) => sum + (Number(tx.totalAmount) - Number(tx.paidAmount)), 0);
         return { ...s, totalOwed };
      });
      res.json(suppliersWithBalance);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch suppliers' });
    }
  });

  app.post('/api/suppliers', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { companyName, address, phone, email, afm, notes } = req.body;
      const newSupplier = await db.insert(suppliers).values({
        companyName, address, phone, email, afm, notes
      }).returning();
      res.json(newSupplier[0]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create supplier' });
    }
  });

  app.get('/api/suppliers/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const supplier = await db.select().from(suppliers).where(eq(suppliers.id, id));
      if (supplier.length === 0) return res.status(404).json({ error: 'Supplier not found' });
      res.json(supplier[0]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch supplier' });
    }
  });

  app.put('/api/suppliers/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { companyName, address, phone, email, afm, notes } = req.body;
      const updatedSupplier = await db.update(suppliers).set({
        companyName, address, phone, email, afm, notes
      }).where(eq(suppliers.id, id)).returning();
      if (updatedSupplier.length === 0) return res.status(404).json({ error: 'Supplier not found' });
      res.json(updatedSupplier[0]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update supplier' });
    }
  });

  app.delete('/api/suppliers/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(suppliers).where(eq(suppliers.id, id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete supplier' });
    }
  });

  app.get('/api/products', requireAuth, async (req: AuthRequest, res) => {
    try {
      const allProducts = await db.select().from(products).orderBy(desc(products.createdAt));
      res.json(allProducts);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  });

  app.post('/api/products', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { productName, sku, category, description, unit } = req.body;
      const newProduct = await db.insert(products).values({
        productName, sku, category, description, unit
      }).returning();
      res.json(newProduct[0]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create product' });
    }
  });

  app.put('/api/products/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { productName, sku, category, description, unit } = req.body;
      const updatedProduct = await db.update(products).set({
        productName, sku, category, description, unit
      }).where(eq(products.id, id)).returning();
      if (updatedProduct.length === 0) return res.status(404).json({ error: 'Product not found' });
      res.json(updatedProduct[0]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update product' });
    }
  });

  app.delete('/api/products/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(products).where(eq(products.id, id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete product' });
    }
  });

  app.get('/api/transactions', requireAuth, async (req: AuthRequest, res) => {
    try {
      const allTransactions = await db.select({
        id: transactions.id,
        transactionNumber: transactions.transactionNumber,
        date: transactions.date,
        type: transactions.type,
        notes: transactions.notes,
        totalAmount: transactions.totalAmount,
        paidAmount: transactions.paidAmount,
        customerId: transactions.customerId,
        supplierId: transactions.supplierId,
        customerName: customers.companyName,
        supplierName: suppliers.companyName,
        hasDocument: sql<boolean>`${transactions.documentData} IS NOT NULL`
      })
      .from(transactions)
      .leftJoin(customers, eq(transactions.customerId, customers.id))
      .leftJoin(suppliers, eq(transactions.supplierId, suppliers.id))
      .orderBy(desc(transactions.date));
      res.json(allTransactions);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  });

  app.post('/api/transactions', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { type, totalAmount, paidAmount, date, notes, customerId, supplierId } = req.body;
      const parsedDate = date ? new Date(date) : new Date();
      // Generate a unique transaction number
      const transactionNumber = `TRX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const newTransaction = await db.insert(transactions).values({
        transactionNumber, type, totalAmount, paidAmount, date: parsedDate, notes, customerId, supplierId
      }).returning();
      res.json(newTransaction[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create transaction' });
    }
  });

  app.put('/api/transactions/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { type, totalAmount, paidAmount, date, notes, customerId, supplierId } = req.body;
      const parsedDate = date ? new Date(date) : new Date();
      const updatedTransaction = await db.update(transactions).set({
        type, totalAmount, paidAmount, date: parsedDate, notes, customerId, supplierId
      }).where(eq(transactions.id, id)).returning();
      if (updatedTransaction.length === 0) return res.status(404).json({ error: 'Transaction not found' });
      res.json(updatedTransaction[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update transaction' });
    }
  });

  app.get('/api/transactions/:id/document', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const transaction = await db.select({
        documentData: transactions.documentData,
        documentMimeType: transactions.documentMimeType
      }).from(transactions).where(eq(transactions.id, id));
      
      if (transaction.length === 0 || !transaction[0].documentData) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      res.json(transaction[0]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch document' });
    }
  });

  app.get('/api/entities/transactions/:entityType/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { entityType } = req.params;
      
      const entityTransactions = await db.select({
        id: transactions.id,
        transactionNumber: transactions.transactionNumber,
        date: transactions.date,
        type: transactions.type,
        notes: transactions.notes,
        totalAmount: transactions.totalAmount,
        paidAmount: transactions.paidAmount,
        customerId: transactions.customerId,
        supplierId: transactions.supplierId,
        hasDocument: sql<boolean>`${transactions.documentData} IS NOT NULL`
      }).from(transactions)
        .where(entityType === 'customer' ? eq(transactions.customerId, id) : eq(transactions.supplierId, id))
        .orderBy(desc(transactions.date));
        
      res.json(entityTransactions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch entity transactions' });
    }
  });

  app.post('/api/scan-invoice', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { image, mimeType, entityId, entityType } = req.body;
      
      if (!image || !mimeType) return res.status(400).json({ error: 'Image missing' });
      
       const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
         contents: {
           parts: [
            {
              inlineData: { data: image, mimeType }
            },
            { text: "Extract the following details from this invoice: total amount, paid amount, date (YYYY-MM-DD), and a brief string describing the purchased/sold products. Maintain the original language of the invoice (e.g., use Greek characters if the invoice is in Greek)." }
           ]
         },
         config: {
           responseMimeType: "application/json",
           responseSchema: {
             type: Type.OBJECT,
             properties: {
               totalAmount: { type: Type.NUMBER, description: "Total cost on the invoice." },
               paidAmount: { type: Type.NUMBER, description: "Amount paid on the invoice. Usually 0 if not paid during issue." },
               notes: { type: Type.STRING, description: "A summary of items purchased/sold." },
               date: { type: Type.STRING, description: "The issue date on the invoice." }
             },
             required: ["totalAmount", "paidAmount"]
           }
         }
       });
       
       if (!response.text) {
         throw new Error('No content returned');
       }
       
       const extracted = JSON.parse(response.text);
       
       // Save transaction
       const parsedDate = extracted.date ? new Date(extracted.date) : new Date();
       const transactionNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
       
       const newTransaction = await db.insert(transactions).values({
         transactionNumber,
         type: entityType === 'customer' ? 'sale' : 'purchase',
         totalAmount: extracted.totalAmount || 0,
         paidAmount: extracted.paidAmount || 0,
         date: parsedDate,
         notes: extracted.notes || 'Scanned invoice',
         customerId: entityType === 'customer' ? entityId : null,
         supplierId: entityType === 'supplier' ? entityId : null,
         documentData: image,
         documentMimeType: mimeType
       }).returning();
       
       res.json(newTransaction[0]);
    } catch (error: any) {
      console.error('Scan Error:', error);
      let errorMessage = 'Failed to process invoice';
      if (error?.status === 503 || error?.message?.includes('503')) {
        errorMessage = 'This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      res.status(500).json({ error: errorMessage });
    }
  });

  app.get('/api/export/:entity', requireAuth, async (req: AuthRequest, res) => {
    try {
      const entity = req.params.entity;
      let data: any[] = [];

      if (entity === 'customers') {
        data = await db.select().from(customers).orderBy(desc(customers.createdAt));
      } else if (entity === 'suppliers') {
        data = await db.select().from(suppliers).orderBy(desc(suppliers.createdAt));
      } else if (entity === 'transactions') {
        data = await db.select().from(transactions).orderBy(desc(transactions.createdAt));
      } else {
        return res.status(400).json({ error: 'Invalid export entity' });
      }

      if (data.length === 0) {
        // Return emtpy CSV with columns if possible, but no data means we don't have keys. Let's just return a generic text.
        return res.status(404).json({ error: 'No data found' });
      }

      const headers = Object.keys(data[0]);
      const csvContent = '\uFEFF' + [
        headers.join(','),
        ...data.map(row => headers.map(header => {
          const val = row[header];
          if (val === null || val === undefined) return '""';
          if (val instanceof Date) return `"${val.toISOString()}"`;
          return `"${String(val).replace(/"/g, '""')}"`;
        }).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${entity}.csv"`);
      res.send(csvContent);
    } catch (error) {
       console.error('Export error:', error);
       res.status(500).json({ error: 'Failed to export data' });
    }
  });

  app.post('/api/import/:entity', requireAuth, async (req: AuthRequest, res) => {
    try {
      const entity = req.params.entity;
      const data = req.body.data;

      if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ error: 'No data provided' });
      }

      if (entity === 'customers') {
        const mappedData = data.map((row: any) => ({
          companyName: row['Company Name'] || row.companyName || 'Unknown',
          address: row['Address'] || row.address,
          phone: row['Phone'] || row.phone,
          email: row['Email'] || row.email,
          afm: row['AFM'] || row['Tax ID'] || row.afm,
          notes: row['Notes'] || row.notes,
        }));
        await db.insert(customers).values(mappedData);
      } else if (entity === 'suppliers') {
        const mappedData = data.map((row: any) => ({
          companyName: row['Company Name'] || row.companyName || 'Unknown',
          address: row['Address'] || row.address,
          phone: row['Phone'] || row.phone,
          email: row['Email'] || row.email,
          afm: row['AFM'] || row['Tax ID'] || row.afm,
          notes: row['Notes'] || row.notes,
        }));
        await db.insert(suppliers).values(mappedData);
      } else if (entity === 'products') {
        const mappedData = data.map((row: any) => ({
          productName: row['Product Name'] || row.productName || 'Unknown',
          sku: row['SKU'] || row.sku,
          category: row['Category'] || row.category,
          description: row['Description'] || row.description,
          unit: row['Unit'] || row.unit || 'pcs',
        }));
        await db.insert(products).values(mappedData);
      } else {
        return res.status(400).json({ error: 'Invalid import entity' });
      }

      res.json({ success: true, count: data.length });
    } catch (error) {
       console.error('Import error:', error);
       res.status(500).json({ error: 'Failed to import data' });
    }
  });

  // Basic API routes implementation can be added here

  // ...

  app.post('/api/bulk-delete/:entity', requireAuth, async (req: AuthRequest, res) => {
    try {
      const entity = req.params.entity;
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'No IDs provided' });
      }

      for (const id of ids) {
         if (entity === 'customers') {
           await db.delete(customers).where(eq(customers.id, id));
         } else if (entity === 'suppliers') {
           await db.delete(suppliers).where(eq(suppliers.id, id));
         } else if (entity === 'products') {
           await db.delete(products).where(eq(products.id, id));
         }
      }

      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Bulk delete failed' });
    }
  });

  // Allowed Emails API
  app.get('/api/allowed-emails', requireAuth, async (req: AuthRequest, res) => {
    try {
      // Ensure super admin is in allowed_emails
      const superAdmin = 'wdsolutionnet@gmail.com';
      const superAdminCheck = await db.select().from(allowedEmails).where(eq(allowedEmails.email, superAdmin));
      if (superAdminCheck.length === 0) {
        await db.insert(allowedEmails).values({
          email: superAdmin,
          addedBy: 'owner'
        }).onConflictDoNothing();
      }

      // Fetch all allowed emails joined with registered user details
      const emails = await db.select({
        id: allowedEmails.id,
        email: allowedEmails.email,
        addedBy: allowedEmails.addedBy,
        createdAt: allowedEmails.createdAt,
        userUid: users.uid,
        userRole: users.role,
        lastLogin: users.createdAt,
      })
      .from(allowedEmails)
      .leftJoin(users, sql`LOWER(${allowedEmails.email}) = LOWER(${users.email})`)
      .orderBy(desc(allowedEmails.createdAt));

      res.json(emails);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch allowed emails' });
    }
  });

  app.post('/api/allowed-emails', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Email is required' });
      }
      
      const cleanEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({ error: 'Please enter a valid email address' });
      }

      const existing = await db.select().from(allowedEmails).where(eq(allowedEmails.email, cleanEmail));
      if (existing.length > 0) {
        return res.status(400).json({ error: 'This email is already on the authorized list' });
      }

      const newEmail = await db.insert(allowedEmails).values({
        email: cleanEmail,
        addedBy: req.user?.email || 'admin'
      }).returning();
      res.json(newEmail[0]);
    } catch (error: any) {
      if (error.code === '23505') { // unique violation
        return res.status(400).json({ error: 'Email already allowed' });
      }
      res.status(500).json({ error: 'Failed to add email' });
    }
  });

  app.delete('/api/allowed-emails/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const allEmails = await db.select().from(allowedEmails);
      const emailToDelete = allEmails.find(e => e.id === id);
      
      if (!emailToDelete) {
        return res.status(404).json({ error: 'Email record not found' });
      }
      
      const targetEmail = emailToDelete.email.toLowerCase();
      if (targetEmail === 'wdsolutionnet@gmail.com') {
        return res.status(400).json({ error: 'Cannot remove the primary administrator account (wdsolutionnet@gmail.com)' });
      }
      
      if (targetEmail === req.user?.email?.toLowerCase()) {
        return res.status(400).json({ error: 'You cannot revoke access for your own currently active account' });
      }
      
      await db.delete(allowedEmails).where(eq(allowedEmails.id, id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete email' });
    }
  });

  // Vite middleware for development
  const isDev = process.env.NODE_ENV !== 'production' && !process.env.K_SERVICE && process.env.VITE_DEV !== 'false';
  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
