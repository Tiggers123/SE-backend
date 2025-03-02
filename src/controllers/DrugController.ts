import { Request, Response } from "express";
import pool from "../config/database";

// Get all drugs
export const getAllDrugs = async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM drugs");
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching drugs:", error);
    res.status(500).json({ error: "Failed to fetch drugs" });
  }
};

// Add a new drug
export const addDrug = async (req: Request, res: Response) => {
  const {
    name,
    code,
    detail,
    usage,
    slang_food,
    side_effect,
    drug_type,
    unit_type,
    price,
  } = req.body;

  try {
    const result = await pool.query(
      "INSERT INTO drugs (name, code, detail, usage, slang_food, side_effect, drug_type, unit_type, price) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *",
      [
        name,
        code,
        detail,
        usage,
        slang_food,
        side_effect,
        drug_type,
        unit_type,
        price,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add drug" });
  }
};

// Update a drug by ID
export const updateDrug = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { drug_id } = req.params;
  const {
    name,
    code,
    detail,
    usage,
    slang_food,
    side_effect,
    drug_type,
    unit_type,
    price,
  } = req.body;

  try {
    const result = await pool.query(
      "UPDATE drugs SET name = $1, code = $2, detail = $3, usage = $4, slang_food = $5, side_effect = $6, drug_type = $7, unit_type = $8, price = $9 WHERE drug_id = $10 RETURNING *",
      [
        name,
        code,
        detail,
        usage,
        slang_food,
        side_effect,
        drug_type,
        unit_type,
        price,
        drug_id,
      ]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Drug not found" });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update drug" });
  }
};

// Get a drug by ID
export const getDrugById = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { drug_id } = req.params;

  try {
    const result = await pool.query("SELECT * FROM drugs WHERE drug_id = $1", [
      drug_id,
    ]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Drug not found" });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch drug" });
  }
};

// Delete a drug by ID
export const deleteDrug = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { drug_id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM drugs WHERE drug_id = $1 RETURNING *",
      [drug_id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Drug not found" });
      return;
    }

    res.json({ message: "Drug deleted successfully", drug: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete drug" });
  }
};

// Get top 5 most selling drugs
export const getTopDrugs = async (req: Request, res: Response) => {
  console.log("Fetching top drugs");
  try {
    const result = await pool.query(
      "SELECT * FROM drugs ORDER BY sold_count DESC LIMIT 5"
    );
    
    // Log the result rows to check what data is returned
    console.log(result.rows);
    
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching top drugs:", error);
    res.status(500).json({ error: "Failed to fetch top drugs" });
  }
};
