import { NextFunction, Request, Response } from "express";
import pool from "../config/database";

export const getAllStock = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await pool.query("SELECT * FROM stocks");
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching stocks:", error);
    res.status(500).json({ error: "Failed to fetch stocks" });
  }
};

export const addStock = async (req: Request, res: Response): Promise<void> => {
  const { drug_id, amount, expired, unit_price } = req.body;

  // Validate required fields
  if (!drug_id || !amount || !expired || !unit_price) {
    res.status(400).json({
      error: "Missing required fields",
      required: { drug_id, amount, expired, unit_price },
    });
    return;
  }

  try {
    // First check if drug exists
    const drugCheck = await pool.query(
      "SELECT drug_id FROM drugs WHERE drug_id = $1",
      [drug_id]
    );

    if (drugCheck.rows.length === 0) {
      res.status(404).json({ error: "Drug not found" });
      return;
    }

    const result = await pool.query(
      "INSERT INTO stocks (drug_id, amount, expired, unit_price) VALUES ($1, $2, $3, $4) RETURNING *",
      [drug_id, amount, expired, unit_price]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error("Stock creation error:", error);
    res.status(500).json({
      error: "Failed to create stock",
      details: error.message,
    });
  }
};

export const updateStock = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params; // Stock ID from URL
  const { amount, expired, unit_price } = req.body; // Fields to update

  try {
    const result = await pool.query(
      "UPDATE stocks SET amount = $1, expired = $2, unit_price = $3 WHERE id = $4 RETURNING *",
      [amount, expired, unit_price, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Stock not found" });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error(error); // Debugging log
    res.status(500).json({ error: "Failed to update stock" });
  }
};

export const getStockByDrugId = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { drug_id } = req.params; // Drug ID from URL

  try {
    const result = await pool.query("SELECT * FROM stocks WHERE drug_id = $1", [
      drug_id,
    ]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: "No stocks found for this drug" });
    }

    res.json(result.rows);
  } catch (error) {
    console.error(error); // Debugging log
    res.status(500).json({ error: "Failed to fetch stocks by drug ID" });
  }
};
