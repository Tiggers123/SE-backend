import { Request, Response } from "express";
import pool from "../config/database";

export const createBill = async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const { customer_name, items } = req.body;

    let totalAmount = 0;

    // Create the bill first
    const insertBillQuery = `
      INSERT INTO bills (customer_name, total_amount)
      VALUES ($1, $2)
      RETURNING bill_id;
    `;
    const billResult = await client.query(insertBillQuery, [customer_name, 0]);
    const billId = billResult.rows[0].bill_id;

    // Add each item
    for (const item of items) {
      const { stock_id, quantity } = item;

      // Get stock details
      const stockQuery = "SELECT unit_price FROM stocks WHERE stock_id = $1";
      const stockResult = await client.query(stockQuery, [stock_id]);

      if (stockResult.rows.length === 0) {
        throw new Error(`Stock with id ${stock_id} not found`);
      }

      const unitPrice = stockResult.rows[0].unit_price;
      const subtotal = unitPrice * quantity;
      totalAmount += subtotal;

      // Insert bill item without unit_price
      await client.query(
        `INSERT INTO bill_items (bill_id, stock_id, quantity, subtotal)
         VALUES ($1, $2, $3, $4)`,
        [billId, stock_id, quantity, subtotal]
      );
    }

    // Update bill total
    await client.query(
      "UPDATE bills SET total_amount = $1 WHERE bill_id = $2",
      [totalAmount, billId]
    );

    await client.query("COMMIT");

    // Get complete bill
    const completeBill = await client.query(
      `SELECT 
        b.bill_id,
        b.customer_name,
        b.total_amount,
        b.created_at,
        bi.bill_item_id,
        bi.stock_id,
        bi.quantity,
        bi.subtotal,
        s.unit_price,
        d.name as drug_name
       FROM bills b 
       JOIN bill_items bi ON b.bill_id = bi.bill_id
       JOIN stocks s ON bi.stock_id = s.stock_id
       JOIN drugs d ON s.drug_id = d.drug_id
       WHERE b.bill_id = $1`,
      [billId]
    );

    res.status(201).json({
      message: "Bill created successfully",
      bill: completeBill.rows,
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    res.status(500).json({
      error: "Failed to create bill",
      details: error.message,
    });
  } finally {
    client.release();
  }
};

export const getBillById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { bill_id } = req.params;

    const billQuery = "SELECT * FROM bills WHERE bill_id = $1";
    const billResult = await pool.query(billQuery, [bill_id]);

    if (billResult.rows.length === 0) {
      res.status(404).json({ error: "Bill not found" });
      return;
    }

    res.status(200).json(billResult.rows[0]);
  } catch (error: any) {
    res
      .status(500)
      .json({ error: "Failed to fetch bill", details: error.message });
  }
};

export const removeBill = async (req: Request, res: Response) => {
  const client = await pool.connect();
  const { id } = req.params;

  try {
    await client.query("BEGIN");

    const deleteBillQuery = "DELETE FROM bills WHERE bill_id = $1 RETURNING *";
    const billResult = await client.query(deleteBillQuery, [id]);

    if (billResult.rows.length === 0) {
      res.status(404).json({ error: "Bill not found" });
      return;
    }

    await client.query("COMMIT");
    res.status(200).json({ message: "Bill deleted successfully" });
  } catch (error: any) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Failed to delete bill", details: error.message });
  } finally {
    client.release();
  }
};

export const updateBill = async (req: Request, res: Response) => {
  const client = await pool.connect();
  const { id } = req.params;
  const { customer_name, total_amount } = req.body;

  try {
    await client.query("BEGIN");

    const updateBillQuery = `
      UPDATE bills
      SET customer_name = $1, total_amount = $2
      WHERE bill_id = $3
      RETURNING *;
    `;
    const billResult = await client.query(updateBillQuery, [customer_name, total_amount, id]);

    if (billResult.rows.length === 0) {
      res.status(404).json({ error: "Bill not found" });
      return;
    }

    await client.query("COMMIT");
    res.status(200).json(billResult.rows[0]);
  } catch (error: any) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Failed to update bill", details: error.message });
  } finally {
    client.release();
  }
};

export const history = async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    const historyQuery = "SELECT * FROM bills ORDER BY created_at DESC";
    const historyResult = await client.query(historyQuery);

    res.status(200).json(historyResult.rows);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch bill history", details: error.message });
  } finally {
    client.release();
  }
};

export const dashboard = async (req: Request, res: Response) => {
  const client = await pool.connect();
  const { year } = req.params;

  try {
    const dashboardQuery = `
      SELECT
        EXTRACT(MONTH FROM created_at) AS month,
        SUM(total_amount) AS total_sales
      FROM bills
      WHERE EXTRACT(YEAR FROM created_at) = $1
      GROUP BY month
      ORDER BY month;
    `;
    const dashboardResult = await client.query(dashboardQuery, [year]);

    res.status(200).json(dashboardResult.rows);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch dashboard data", details: error.message });
  } finally {
    client.release();
  }
};
