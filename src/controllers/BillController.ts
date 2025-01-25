import { promises } from "dns";
import { Request, Response } from "express";
import { Pool } from "pg"; // PostgreSQL client
const pool = new Pool();

export const createBill = async (req: Request, res: Response) => {
    const client = await pool.connect();
  
    try {
      const { customer_name, items } = req.body;
  
      let totalAmount = 0;
      const detailedItems: any[] = [];
  
      for (const item of items) {
        const { stock_id, quantity } = item;
  
        const drugQuery = "SELECT * FROM drugs WHERE drug_id = $1";
        const drugResult = await client.query(drugQuery, [stock_id]);
  
        if (drugResult.rows.length === 0) {
          throw new Error(`Drug with stock_id ${stock_id} not found`);
        }
  
        const drug = drugResult.rows[0];
        totalAmount += drug.price * quantity;
  
        detailedItems.push({
          stock_id,
          drug_name: drug.name,
          quantity,
          price_per_item: drug.price,
        });
      }
  
      const insertBillQuery = `
        INSERT INTO bills (customer_name, items, total_amount)
        VALUES ($1, $2, $3)
        RETURNING *;
      `;
      const billResult = await client.query(insertBillQuery, [
        customer_name,
        JSON.stringify(detailedItems),
        totalAmount,
      ]);
  
      res.status(201).json({
        message: "Bill created successfully",
        bill: billResult.rows[0],
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create bill", details: error.message });
    } finally {
      client.release();
    }
  };
  
  // Get a bill by ID
  export const getBillById = async (req: Request, res: Response): Promise<void> => {
    const client = await pool.connect();
  
    try {
      const { id } = req.params;
  
      const billQuery = "SELECT * FROM bills WHERE id = $1";
      const billResult = await client.query(billQuery, [id]);
  
      if (billResult.rows.length === 0) {
        res.status(404).json({ error: "Bill not found" });
      }
  
      res.status(200).json(billResult.rows[0]);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch bill", details: error.message });
    } finally {
      client.release();
    }
  };
  
